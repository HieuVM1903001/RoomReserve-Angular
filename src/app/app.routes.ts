import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./features/bookings/booking-list/booking-list.component').then((m) => m.BookingListComponent),
      },
      {
        path: 'bookings/new',
        loadComponent: () =>
          import('./features/bookings/booking-form/booking-form.component').then((m) => m.BookingFormComponent),
      },
      {
        path: 'bookings/:id/edit',
        loadComponent: () =>
          import('./features/bookings/booking-form/booking-form.component').then((m) => m.BookingFormComponent),
      },
      {
        path: 'booking-approvals',
        loadComponent: () =>
          import('./features/booking-approvals/approval-list.component').then((m) => m.ApprovalListComponent),
        canActivate: [roleGuard(['ADMIN', 'APPROVER'])],
      },
      {
        path: 'meeting-rooms',
        loadComponent: () =>
          import('./features/meeting-rooms/room-list.component').then((m) => m.RoomListComponent),
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/user-list.component').then((m) => m.UserListComponent),
        canActivate: [roleGuard(['ADMIN'])],
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
