import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BookingService } from '../../../core/services/booking.service';
import { BookingApprovalService } from '../../../core/services/booking-approval.service';
import { MeetingRoomService } from '../../../core/services/meeting-room.service';
import { RoomBooking, BookingStatus } from '../../../core/models/booking.model';
import { MeetingRoom } from '../../../core/models/meeting-room.model';

/**
 * Unified booking screen.
 * - Admin/Approver see every booking in the company and can approve/reject pending ones.
 * - Regular users see only their own bookings and can edit/cancel them.
 * Both share the same table, filters, stats bar and CSV export — styled after the
 * "Quản lý đặt phòng" screen in the design mockup.
 */
@Component({
  selector: 'app-booking-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-workspace.component.html',
})
export class BookingWorkspaceComponent implements OnInit {
  masterBookings = signal<RoomBooking[]>([]);
  rooms = signal<MeetingRoom[]>([]);
  loading = signal(true);

  statusFilter = signal<BookingStatus | ''>('');
  roomFilter = signal<number | ''>('');
  dateFilter = signal(''); // yyyy-MM-dd
  keyword = signal(''); // matches title OR người đặt

  detailBooking = signal<RoomBooking | null>(null);

  showCancelModal = signal(false);
  cancelTarget: RoomBooking | null = null;
  cancelReason = '';

  showRejectModal = signal(false);
  rejectTarget: RoomBooking | null = null;
  rejectReason = '';
  rejectNote = '';
  processing = signal(false);

  constructor(
    public auth: AuthService,
    private bookingService: BookingService,
    private approvalService: BookingApprovalService,
    private roomService: MeetingRoomService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  get isManager(): boolean {
    return this.auth.hasAnyRole(['ADMIN', 'APPROVER']);
  }

  private get currentUserId(): number | undefined {
    return this.auth.currentUser()?.id;
  }

  filteredBookings = computed<RoomBooking[]>(() => {
    const status = this.statusFilter();
    const roomId = this.roomFilter();
    const date = this.dateFilter();
    const q = this.keyword().trim().toLowerCase();

    return this.masterBookings().filter((b) => {
      if (status && b.status !== status) return false;
      if (roomId && b.roomId !== Number(roomId)) return false;
      if (date && new Date(b.startTime).toDateString() !== new Date(date).toDateString()) return false;
      if (q) {
        const haystack = `${b.title} ${b.createdByUserName ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  });

  pendingCount = computed(() => this.filteredBookings().filter((b) => b.status === 'PENDING').length);
  approvedCount = computed(() => this.filteredBookings().filter((b) => b.status === 'APPROVED').length);
  rejectedCount = computed(() => this.filteredBookings().filter((b) => b.status === 'REJECTED').length);
  totalParticipants = computed(() => this.filteredBookings().reduce((sum, b) => sum + (b.numberOfParticipants || 0), 0));

  ngOnInit(): void {
    this.roomService.getAll().subscribe((rooms) => this.rooms.set(rooms));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const source$ = this.isManager
      ? this.approvalService.getAll({ page: 1, pageSize: 10 })
      : this.bookingService.getMy({ page: 1, pageSize: 10 });

    source$.subscribe({
      next: (res) => {
        this.masterBookings.set(res.items);
        this.loading.set(false);
        this.openFocusedBookingFromQueryParam();
      },
      error: () => this.loading.set(false),
    });
  }

  /** Opens the detail modal for a booking id passed via ?focus=123 (used by the header search) */
  private openFocusedBookingFromQueryParam(): void {
    const focusId = Number(this.route.snapshot.queryParamMap.get('focus'));
    if (!focusId) return;
    const match = this.masterBookings().find((b) => b.id === focusId);
    if (match) {
      this.viewDetail(match);
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
  }

  resetFilters(): void {
    this.statusFilter.set('');
    this.roomFilter.set('');
    this.dateFilter.set('');
    this.keyword.set('');
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
    return b.status === 'PENDING' && b.createdByUserId === this.currentUserId;
  }

  canCancel(b: RoomBooking): boolean {
    return b.createdByUserId === this.currentUserId && b.status !== 'CANCELLED' && b.status !== 'COMPLETED';
  }

  canApproveOrReject(b: RoomBooking): boolean {
    return this.isManager && b.status === 'PENDING';
  }

  goToEdit(b: RoomBooking): void {
    this.router.navigate(['/bookings', b.id, 'edit']);
  }

  viewDetail(b: RoomBooking): void {
    this.bookingService.getById(b.id).subscribe({
      next: (full) => this.detailBooking.set(full),
      error: () => this.detailBooking.set(b),
    });
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
      this.detailBooking.set(null);
      this.load();
    });
  }

  approve(b: RoomBooking): void {
    if (!confirm(`Phê duyệt yêu cầu "${b.title}"?`)) return;
    this.processing.set(true);
    this.approvalService.approve(b.id).subscribe({
      next: () => {
        this.processing.set(false);
        this.detailBooking.set(null);
        this.load();
      },
      error: () => this.processing.set(false),
    });
  }

  openReject(b: RoomBooking): void {
    this.rejectTarget = b;
    this.rejectReason = '';
    this.rejectNote = '';
    this.showRejectModal.set(true);
  }

  closeReject(): void {
    this.showRejectModal.set(false);
  }

  confirmReject(): void {
    if (!this.rejectTarget || !this.rejectReason.trim()) return;
    this.processing.set(true);
    this.approvalService.reject(this.rejectTarget.id, { rejectReason: this.rejectReason, note: this.rejectNote || undefined }).subscribe({
      next: () => {
        this.processing.set(false);
        this.showRejectModal.set(false);
        this.detailBooking.set(null);
        this.load();
      },
      error: () => this.processing.set(false),
    });
  }

  /** Exports the currently filtered bookings as a CSV file the browser downloads directly. */
  exportReport(): void {
    const headers = ['Người đặt', 'Phòng họp', 'Tiêu đề', 'Bắt đầu', 'Kết thúc', 'Số người', 'Trạng thái'];
    const rows = this.filteredBookings().map((b) => [
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
    link.download = `dat-lich-phong-hop-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
