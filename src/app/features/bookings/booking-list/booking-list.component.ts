import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingService } from '../../../core/services/booking.service';
import { MeetingRoomService } from '../../../core/services/meeting-room.service';
import { RoomBooking, BookingStatus } from '../../../core/models/booking.model';
import { MeetingRoom } from '../../../core/models/meeting-room.model';

@Component({
  selector: 'app-booking-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-list.component.html',
})
export class BookingListComponent implements OnInit {
  bookings = signal<RoomBooking[]>([]);
  rooms = signal<MeetingRoom[]>([]);
  loading = signal(true);
  detailBooking = signal<RoomBooking | null>(null);

  statusFilter: BookingStatus | '' = '';
  roomFilter: number | '' = '';
  dateFilter = ''; // yyyy-MM-dd, from <input type="date">

  showCancelModal = signal(false);
  cancelTarget: RoomBooking | null = null;
  cancelReason = '';

  constructor(private bookingService: BookingService, private roomService: MeetingRoomService, private router: Router) {}

  // Stats bar
  pendingCount = computed(() => this.bookings().filter((b) => b.status === 'PENDING').length);
  approvedCount = computed(() => this.bookings().filter((b) => b.status === 'APPROVED').length);
  rejectedCount = computed(() => this.bookings().filter((b) => b.status === 'REJECTED').length);
  totalParticipants = computed(() => this.bookings().reduce((sum, b) => sum + (b.numberOfParticipants || 0), 0));

  ngOnInit(): void {
    this.roomService.getAll().subscribe((rooms) => this.rooms.set(rooms));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    let fromDate: string | undefined;
    let toDate: string | undefined;
    if (this.dateFilter) {
      const day = new Date(this.dateFilter);
      const start = new Date(day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(day);
      end.setHours(23, 59, 59, 999);
      fromDate = start.toISOString();
      toDate = end.toISOString();
    }

    this.bookingService
      .getMy({
        status: this.statusFilter || undefined,
        roomId: this.roomFilter ? Number(this.roomFilter) : undefined,
        fromDate,
        toDate,
        page: 1,
        pageSize: 99,
      })
      .subscribe({
        next: (res) => {
          this.bookings.set(res.items);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  resetFilters(): void {
    this.statusFilter = '';
    this.roomFilter = '';
    this.dateFilter = '';
    this.load();
  }

  statusLabel(status: BookingStatus): string {
    return {
      PENDING: 'Chờ phê duyệt',
      APPROVED: 'Đã phê duyệt',
      REJECTED: 'Đã từ chối',
      CANCELLED: 'Đã hủy',
      COMPLETED: 'Đã hoàn thành',
    }[status];
  }

  canEdit(b: RoomBooking): boolean {
    return b.status === 'PENDING';
  }

  canCancel(b: RoomBooking): boolean {
    return b.status !== 'CANCELLED' && b.status !== 'COMPLETED';
  }

  goToEdit(b: RoomBooking): void {
    this.router.navigate(['/bookings', b.id, 'edit']);
  }

  viewDetail(b: RoomBooking): void {
    this.bookingService.getById(b.id).subscribe((full) => this.detailBooking.set(full));
  }

  closeDetail(): void {
    this.detailBooking.set(null);
  }

  openCancel(b: RoomBooking): void {
    this.cancelTarget = b;
    this.cancelReason = '';
    this.showCancelModal.set(true);
  }

  closeCancel(): void {
    this.showCancelModal.set(false);
  }

  confirmCancel(): void {
    if (!this.cancelTarget || !this.cancelReason.trim()) return;
    this.bookingService.cancel(this.cancelTarget.id, { cancelReason: this.cancelReason }).subscribe(() => {
      this.showCancelModal.set(false);
      this.load();
    });
  }

  /** Exports the currently filtered bookings as a CSV file the browser downloads directly. */
  exportReport(): void {
    const headers = ['Người đặt', 'Phòng họp', 'Tiêu đề', 'Bắt đầu', 'Kết thúc', 'Số người', 'Trạng thái'];
    const rows = this.bookings().map((b) => [
      b.createdByUserName ?? '',
      b.roomName ?? '',
      b.title,
      new Date(b.startTime).toLocaleString('vi-VN'),
      new Date(b.endTime).toLocaleString('vi-VN'),
      String(b.numberOfParticipants),
      this.statusLabel(b.status),
    ]);

    const escapeCsv = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `lich-dat-phong-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
