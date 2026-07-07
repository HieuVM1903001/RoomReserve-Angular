import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MeetingRoomService } from '../../core/services/meeting-room.service';
import { BookingService } from '../../core/services/booking.service';
import { BookingApprovalService } from '../../core/services/booking-approval.service';
import { MeetingRoom } from '../../core/models/meeting-room.model';
import { RoomBooking } from '../../core/models/booking.model';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  roles?: string[];
}

interface SearchResult {
  type: 'room' | 'booking';
  id: number;
  title: string;
  subtitle: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent implements OnInit {
  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
    { label: 'Quản lý đặt phòng', icon: 'event_note', path: '/bookings' },
    { label: 'Quản lý người dùng', icon: 'group', path: '/users', roles: ['ADMIN'] },
    { label: 'Quản lý phòng họp', icon: 'meeting_room', path: '/meeting-rooms' },
    
  ];

  sidebarOpen = false;

  // Global "Tìm kiếm phòng, sự kiện..." search
  searchQuery = signal('');
  searchFocused = signal(false);
  private searchRooms = signal<MeetingRoom[]>([]);
  private searchBookings = signal<RoomBooking[]>([]);

  constructor(
    public auth: AuthService,
    private router: Router,
    private roomService: MeetingRoomService,
    private bookingService: BookingService,
    private approvalService: BookingApprovalService
  ) {}

  get visibleNavItems(): NavItem[] {
    return this.navItems.filter((item) => !item.roles || this.auth.hasAnyRole(item.roles));
  }

  ngOnInit(): void {
    // Load a light dataset once, used only to power the header quick-search.
    this.roomService.getAll().subscribe((rooms) => this.searchRooms.set(rooms));
    const bookings$ = this.auth.hasAnyRole(['ADMIN', 'APPROVER'])
      ? this.approvalService.getAll({ page: 1, pageSize: 99 })
      : this.bookingService.getMy({ page: 1, pageSize: 99 });
    bookings$.subscribe((res) => this.searchBookings.set(res.items));
  }

  searchResults = computed<SearchResult[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return [];

    const roomResults: SearchResult[] = this.searchRooms()
      .filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.location.toLowerCase().includes(q))
      .slice(0, 5)
      .map((r) => ({ type: 'room', id: r.id, title: r.name, subtitle: `${r.code} · ${r.location}` }));

    const bookingResults: SearchResult[] = this.searchBookings()
      .filter((b) => b.title.toLowerCase().includes(q) || (b.roomName ?? '').toLowerCase().includes(q))
      .slice(0, 5)
      .map((b) => ({
        type: 'booking',
        id: b.id,
        title: b.title,
        subtitle: `${b.roomName ?? ''} · ${new Date(b.startTime).toLocaleString('vi-VN')}`,
      }));

    return [...roomResults, ...bookingResults];
  });

  selectResult(result: SearchResult): void {
    this.searchQuery.set('');
    this.searchFocused.set(false);
    if (result.type === 'room') {
      this.router.navigate(['/meeting-rooms'], { queryParams: { highlight: result.id } });
    } else {
      this.router.navigate(['/bookings'], { queryParams: { focus: result.id } });
    }
  }

  onSearchBlur(): void {
    // Delay so a click on a result registers before the dropdown disappears.
    setTimeout(() => this.searchFocused.set(false), 150);
  }

  goToNewBooking(): void {
    this.router.navigate(['/bookings/new']);
  }

  logout(): void {
    this.auth.logout();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }
}
