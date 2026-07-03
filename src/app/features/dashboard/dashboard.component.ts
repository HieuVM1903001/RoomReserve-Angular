import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { BookingApprovalService } from '../../core/services/booking-approval.service';
import { MeetingRoomService } from '../../core/services/meeting-room.service';
import { RoomBooking } from '../../core/models/booking.model';
import { MeetingRoom } from '../../core/models/meeting-room.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  myBookings = signal<RoomBooking[]>([]);
  pendingApprovals = signal<RoomBooking[]>([]);
  rooms = signal<MeetingRoom[]>([]);
  loading = signal(true);

  constructor(
    public auth: AuthService,
    private bookingService: BookingService,
    private approvalService: BookingApprovalService,
    private roomService: MeetingRoomService
  ) {}

  get canApprove(): boolean {
    return this.auth.hasAnyRole(['ADMIN', 'APPROVER']);
  }

  get pendingCount(): number {
    return this.myBookings().filter((b) => b.status === 'PENDING').length;
  }

  get approvedCount(): number {
    return this.myBookings().filter((b) => b.status === 'APPROVED').length;
  }

  get activeRoomsCount(): number {
    return this.rooms().filter((r) => r.status === 'ACTIVE').length;
  }

  ngOnInit(): void {
    const calls: any = {
      myBookings: this.bookingService.getMy({ page: 1, pageSize: 5 }),
      rooms: this.roomService.getAll(),
    };
    if (this.canApprove) {
      calls.approvals = this.approvalService.getAll({ status: 'PENDING', page: 1, pageSize: 5 });
    }

    forkJoin(calls).subscribe({
      next: (res: any) => {
        this.myBookings.set(res.myBookings?.items ?? []);
        this.rooms.set(res.rooms ?? []);
        if (res.approvals) this.pendingApprovals.set(res.approvals.items ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
