import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingService } from '../../../core/services/booking.service';
import { RoomBooking, BookingStatus } from '../../../core/models/booking.model';

@Component({
  selector: 'app-booking-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-list.component.html',
})
export class BookingListComponent implements OnInit {
  bookings = signal<RoomBooking[]>([]);
  loading = signal(true);
  statusFilter: BookingStatus | '' = '';
  detailBooking = signal<RoomBooking | null>(null);

  showCancelModal = signal(false);
  cancelTarget: RoomBooking | null = null;
  cancelReason = '';

  constructor(private bookingService: BookingService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.bookingService.getMy({ status: this.statusFilter || undefined, page: 1, pageSize: 100 }).subscribe({
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

  canEdit(b: RoomBooking): boolean {
    return b.status === 'PENDING';
  }

  canCancel(b: RoomBooking): boolean {
    return b.status !== 'CANCELLED' && b.status !== 'COMPLETED';
  }

  goToNew(): void {
    this.router.navigate(['/bookings/new']);
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
}
