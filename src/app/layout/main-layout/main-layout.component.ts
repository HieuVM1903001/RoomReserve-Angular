import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  roles?: string[];
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {
  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
    { label: 'Đặt lịch của tôi', icon: 'event_note', path: '/bookings' },
    { label: 'Quản lý đặt lịch', icon: 'fact_check', path: '/booking-approvals', roles: ['ADMIN', 'APPROVER'] },
    { label: 'Phòng họp', icon: 'meeting_room', path: '/meeting-rooms' },
    { label: 'Người dùng', icon: 'group', path: '/users', roles: ['ADMIN'] },
  ];

  sidebarOpen = false;

  constructor(public auth: AuthService, private router: Router) {}

  get visibleNavItems(): NavItem[] {
    return this.navItems.filter((item) => !item.roles || this.auth.hasAnyRole(item.roles));
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
