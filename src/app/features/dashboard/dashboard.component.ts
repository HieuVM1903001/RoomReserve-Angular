import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { BookingApprovalService } from '../../core/services/booking-approval.service';
import { MeetingRoomService } from '../../core/services/meeting-room.service';
import { RoomBooking, BookingStatus } from '../../core/models/booking.model';
import { MeetingRoom } from '../../core/models/meeting-room.model';

interface CalendarEvent {
  booking: RoomBooking;
  topPx: number;
  heightPx: number;
}

const START_HOUR = 8;
const END_HOUR = 18; // calendar window: 08:00 -> 18:00
const ROW_HEIGHT = 60; // px per hour

const EQUIPMENT_ICONS: Record<string, string> = {
  'Máy chiếu': 'videocam',
  'Màn hình TV': 'tv',
  'Bảng viết': 'draw',
  Micro: 'mic',
  'Camera họp trực tuyến': 'video_camera_front',
  Loa: 'volume_up',
  'Điều hòa': 'ac_unit',
};

const WEEKDAY_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const MONTH_NAMES = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  rooms = signal<MeetingRoom[]>([]);
  myBookings = signal<RoomBooking[]>([]);
  pendingApprovalsTotal = signal(0);
  dayBookings = signal<RoomBooking[]>([]);
  loading = signal(true);
  loadingCalendar = signal(false);
  selectedDate = signal<Date>(this.stripTime(new Date()));

  readonly hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  readonly rowHeight = ROW_HEIGHT;
  readonly calendarHeightPx = (END_HOUR - START_HOUR) * ROW_HEIGHT;

  constructor(
    public auth: AuthService,
    private bookingService: BookingService,
    private approvalService: BookingApprovalService,
    private roomService: MeetingRoomService
  ) {}

  get canApprove(): boolean {
    return this.auth.hasAnyRole(['ADMIN', 'APPROVER']);
  }

  get activeRoomsCount(): number {
    return this.rooms().filter((r) => r.status === 'ACTIVE').length;
  }

  get roomUtilizationPercent(): number {
    const total = this.rooms().length;
    return total === 0 ? 0 : Math.round((this.activeRoomsCount / total) * 100);
  }

  get myPendingCount(): number {
    return this.myBookings().filter((b) => b.status === 'PENDING').length;
  }

  /** "Đang chờ duyệt" card shows org-wide pending count for approvers, own pending count for regular users */
  get pendingCardCount(): number {
    return this.canApprove ? this.pendingApprovalsTotal() : this.myPendingCount;
  }

  get isToday(): boolean {
    return this.sameDay(this.selectedDate(), new Date());
  }

  get formattedSelectedDate(): string {
    const d = this.selectedDate();
    return `${WEEKDAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
  }

  visibleRooms = computed<MeetingRoom[]>(() => this.rooms().filter((r) => r.status === 'ACTIVE'));

  todayBookingsCount = computed(() => this.dayBookings().length);

  /** Rooms that are ACTIVE and not currently occupied by an approved booking */
  availableRoomsNow = computed<MeetingRoom[]>(() => {
    const now = new Date();
    return this.rooms().filter((r) => {
      if (r.status !== 'ACTIVE') return false;
      if (!this.isToday) return true;
      const busy = this.dayBookings().some(
        (b) => b.roomId === r.id && b.status === 'APPROVED' && new Date(b.startTime) <= now && new Date(b.endTime) > now
      );
      return !busy;
    });
  });

  /** Next bookings today (or on the selected date) that haven't ended yet */
  upcomingActivities = computed<RoomBooking[]>(() => {
    const now = new Date();
    return this.dayBookings()
      .filter((b) => (b.status === 'APPROVED' || b.status === 'PENDING') && (!this.isToday || new Date(b.endTime).getTime() >= now.getTime()))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);
  });

  ngOnInit(): void {
    this.loadSummary();
    this.loadCalendar();
  }

  private loadSummary(): void {
    const calls: any = {
      rooms: this.roomService.getAll(),
      myBookings: this.bookingService.getMy({ page: 1, pageSize: 100 }),
    };
    if (this.canApprove) {
      calls.approvals = this.approvalService.getAll({ status: 'PENDING', page: 1, pageSize: 1 });
    }
    forkJoin(calls).subscribe({
      next: (res: any) => {
        this.rooms.set(res.rooms ?? []);
        this.myBookings.set(res.myBookings?.items ?? []);
        if (res.approvals) this.pendingApprovalsTotal.set(res.approvals.totalCount ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadCalendar(): void {
    this.loadingCalendar.set(true);
    const from = this.startOfDay(this.selectedDate()).toISOString();
    const to = this.endOfDay(this.selectedDate()).toISOString();
    this.bookingService.getCalendar(from, to).subscribe({
      next: (bookings) => {
        this.dayBookings.set(bookings ?? []);
        this.loadingCalendar.set(false);
      },
      error: () => this.loadingCalendar.set(false),
    });
  }

  prevDay(): void {
    this.shiftDay(-1);
  }

  nextDay(): void {
    this.shiftDay(1);
  }

  goToday(): void {
    this.selectedDate.set(this.stripTime(new Date()));
    this.loadCalendar();
  }

  private shiftDay(delta: number): void {
    const d = new Date(this.selectedDate());
    d.setDate(d.getDate() + delta);
    this.selectedDate.set(d);
    this.loadCalendar();
  }

  eventsForRoom(roomId: number): CalendarEvent[] {
    return this.dayBookings()
      .filter((b) => b.roomId === roomId && (b.status === 'APPROVED' || b.status === 'PENDING'))
      .map((b) => this.toEvent(b));
  }

  eventClasses(status: BookingStatus): string {
    return (
      {
        APPROVED: 'bg-status-approved/10 border-status-approved',
        PENDING: 'bg-status-pending/10 border-status-pending',
        REJECTED: 'bg-status-rejected/10 border-status-rejected',
        CANCELLED: 'bg-surface-variant/30 border-surface-variant',
        COMPLETED: 'bg-status-completed/10 border-status-completed',
      }[status] || 'bg-surface-variant/30 border-surface-variant'
    );
  }

  eventLabelClasses(status: BookingStatus): string {
    return (
      {
        APPROVED: 'text-status-approved',
        PENDING: 'text-status-pending',
        REJECTED: 'text-status-rejected',
        CANCELLED: 'text-on-surface-variant',
        COMPLETED: 'text-status-completed',
      }[status] || 'text-on-surface-variant'
    );
  }

  statusDotClass(status: BookingStatus): string {
    return (
      {
        PENDING: 'bg-status-pending',
        APPROVED: 'bg-primary',
        REJECTED: 'bg-status-rejected',
        CANCELLED: 'bg-surface-variant',
        COMPLETED: 'bg-status-completed',
      }[status] || 'bg-surface-variant'
    );
  }

  statusLabel(status: BookingStatus): string {
    return (
      {
        PENDING: 'Pending',
        APPROVED: 'Approved',
        REJECTED: 'Rejected',
        CANCELLED: 'Cancelled',
        COMPLETED: 'Completed',
      }[status] || status
    );
  }

  equipmentIcon(name: string): string {
    return EQUIPMENT_ICONS[name] || 'check_circle';
  }

  /** Current-time indicator position within the calendar grid, or null if out of range / not today */
  currentTimeTopPx(): number | null {
    if (!this.isToday) return null;
    const now = new Date();
    const hourFloat = now.getHours() + now.getMinutes() / 60;
    if (hourFloat < START_HOUR || hourFloat > END_HOUR) return null;
    return (hourFloat - START_HOUR) * ROW_HEIGHT;
  }

  private toEvent(b: RoomBooking): CalendarEvent {
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    const startHourFloat = start.getHours() + start.getMinutes() / 60;
    const endHourFloat = end.getHours() + end.getMinutes() / 60;
    const clampedStart = Math.max(START_HOUR, startHourFloat);
    const clampedEnd = Math.min(END_HOUR, Math.max(endHourFloat, clampedStart + 0.001));
    const top = (clampedStart - START_HOUR) * ROW_HEIGHT;
    const height = Math.max(28, (clampedEnd - clampedStart) * ROW_HEIGHT);
    return { booking: b, topPx: top, heightPx: height };
  }

  private stripTime(d: Date): Date {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  }
  private startOfDay(d: Date): Date {
    return this.stripTime(d);
  }
  private endOfDay(d: Date): Date {
    const c = this.stripTime(d);
    c.setHours(23, 59, 59, 999);
    return c;
  }
  private sameDay(a: Date, b: Date): boolean {
    return a.toDateString() === b.toDateString();
  }
}
