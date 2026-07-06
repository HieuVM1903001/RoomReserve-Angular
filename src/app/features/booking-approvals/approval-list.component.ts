import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingApprovalService } from '../../core/services/booking-approval.service';
import { MeetingRoomService } from '../../core/services/meeting-room.service';
import { RoomBooking, BookingStatus } from '../../core/models/booking.model';
import { MeetingRoom } from '../../core/models/meeting-room.model';

@Component({
  selector: 'app-approval-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './approval-list.component.html',
})
export class ApprovalListComponent implements OnInit {
  bookings = signal<RoomBooking[]>([]);
  rooms = signal<MeetingRoom[]>([]);
  loading = signal(true);

  statusFilter: BookingStatus | '' = 'PENDING';
  roomFilter: number | '' = '';
  keyword = '';

  detailBooking = signal<RoomBooking | null>(null);
  showRejectModal = signal(false);
  rejectTarget: RoomBooking | null = null;
  rejectReason = '';
  rejectNote = '';
  processing = signal(false);

  constructor(private approvalService: BookingApprovalService, private roomService: MeetingRoomService) {}

  // Stats bar (counts reflect the currently loaded/filtered result set)
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
    this.approvalService
      .getAll({
        status: this.statusFilter || undefined,
        roomId: this.roomFilter ? Number(this.roomFilter) : undefined,
        keyword: this.keyword || undefined,
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

  statusLabel(status: BookingStatus): string {
    return {
      PENDING: 'Chờ phê duyệt',
      APPROVED: 'Đã phê duyệt',
      REJECTED: 'Đã từ chối',
      CANCELLED: 'Đã hủy',
      COMPLETED: 'Đã hoàn thành',
    }[status];
  }

  viewDetail(b: RoomBooking): void {
    this.detailBooking.set(b);
  }

  closeDetail(): void {
    this.detailBooking.set(null);
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
}
