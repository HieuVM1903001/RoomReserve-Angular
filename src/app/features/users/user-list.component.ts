import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { AppUser } from '../../core/models/user.model';
import { Role } from '../../core/models/role.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './user-list.component.html',
})
export class UserListComponent implements OnInit {
  users = signal<AppUser[]>([]);
  roles = signal<Role[]>([]);
  loading = signal(true);

  // Filters — all signals, so `filteredUsers` reliably recomputes on every change.
  keyword = signal('');
  roleFilter = signal('');
  departmentFilter = signal('');

  showFormModal = signal(false);
  showRoleModal = signal(false);
  editingUser = signal<AppUser | null>(null);
  roleTargetUser = signal<AppUser | null>(null);
  saving = signal(false);
  savingRoles = signal(false);
  errorMessage = signal<string | null>(null);
  roleErrorMessage = signal<string | null>(null);

  // Roles checked in the modal, held locally until "Lưu" is pressed —
  // nothing is sent to the API on individual checkbox clicks.
  pendingRoleCodes = signal<string[]>([]);

  activeCount = computed(() => this.users().filter((u) => u.isActive).length);
  lockedCount = computed(() => this.users().filter((u) => !u.isActive).length);
  adminCount = computed(() => this.users().filter((u) => this.hasRole(u, 'ADMIN')).length);

  departments = computed<string[]>(() => {
    const set = new Set<string>();
    this.users().forEach((u) => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set).sort();
  });

  filteredUsers = signal<AppUser[]>([])

  private fb = inject(FormBuilder);

  form = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: [''],
    department: [''],
    position: [''],
    username: ['', Validators.required],
    password: [''],
  });

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadAllUsers();
    this.userService.getRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.roles.set([
        { id: 1, code: 'ADMIN', name: 'Admin' },
        { id: 2, code: 'APPROVER', name: 'Approver' },
        { id: 3, code: 'USER', name: 'User' },
      ]),
    });
  }
  loadAllUsers(): void {
    this.loading.set(true);
    this.userService.getAll({ keyword: this.keyword(), department: this.departmentFilter(), role: this.roleFilter(), page: 1, pageSize: 99 }).subscribe({
      next: (res) => {
        this.users.set(res.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadUsers(): void {
    this.loading.set(true);
    this.userService.getAll({ keyword: this.keyword(), department: this.departmentFilter(), role: this.roleFilter(), page: 1, pageSize: 99 }).subscribe({
      next: (res) => {
        this.filteredUsers.set(res.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onKeywordChange(event: Event): void {
    this.keyword.set((event.target as HTMLInputElement).value);
    // this.loadUsers();
  }

  onRoleFilterChange(event: Event): void {
    this.roleFilter.set((event.target as HTMLSelectElement).value);
    this.loadUsers();
  }

  onDepartmentFilterChange(event: Event): void {
    this.departmentFilter.set((event.target as HTMLSelectElement).value);
    this.loadUsers();
  }

  resetFilters(): void {
    this.keyword.set('');
    this.roleFilter.set('');
    this.departmentFilter.set('');
    this.loadUsers();
  }

  openCreate(): void {
    this.editingUser.set(null);
    this.errorMessage.set(null);
    this.form.reset();
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
    this.showFormModal.set(true);
  }

  openEdit(user: AppUser): void {
    this.editingUser.set(user);
    this.errorMessage.set(null);
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();
    this.form.patchValue({
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      department: user.department,
      position: user.position,
      username: user.username,
      password: '',
    });
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
  }

  submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    const value = this.form.getRawValue();
    const editing = this.editingUser();

    const onError = (err: any) => {
      this.saving.set(false);
      this.errorMessage.set(err?.error?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    };
    const onSuccess = () => {
      this.saving.set(false);
      this.showFormModal.set(false);
      this.loadUsers();
    };

    if (editing) {
      this.userService
        .update(editing.id, {
          fullName: value.fullName!,
          email: value.email!,
          phoneNumber: value.phoneNumber || undefined,
          department: value.department || undefined,
          position: value.position || undefined,
        })
        .subscribe({ next: onSuccess, error: onError });
    } else {
      this.userService
        .create({
          fullName: value.fullName!,
          email: value.email!,
          phoneNumber: value.phoneNumber || undefined,
          department: value.department || undefined,
          position: value.position || undefined,
          username: value.username!,
          password: value.password!,
        })
        .subscribe({ next: onSuccess, error: onError });
    }
  }

  toggleLock(user: AppUser): void {
    const action = user.isActive ? this.userService.lock(user.id) : this.userService.unlock(user.id);
    action.subscribe(() => this.loadUsers());
  }

  hasRole(user: AppUser, roleCode: string): boolean {
    return user.roles?.some((r) => r === roleCode) ?? false;
  }

  /** Looks up a role's display name from the loaded role list; falls back to the raw code. */
  roleName(code: string): string {
    return this.roles().find((r) => r.code === code)?.name ?? code;
  }

  // --- Role assignment modal ---------------------------------------------
  // Checkbox toggles only update local state; the API call fires once, when
  // "Lưu" is clicked, sending the full RoleCodes list the backend expects.

  openRoleModal(user: AppUser): void {
    this.roleTargetUser.set(user);
    this.pendingRoleCodes.set(user.roles ?? []);
    this.roleErrorMessage.set(null);
    this.showRoleModal.set(true);
  }

  closeRoleModal(): void {
    this.showRoleModal.set(false);
  }

  isPendingRole(roleCode: string): boolean {
    return this.pendingRoleCodes().includes(roleCode);
  }

  toggleRolePending(roleCode: string): void {
    const current = this.pendingRoleCodes();
    this.pendingRoleCodes.set(
      current.includes(roleCode) ? current.filter((c) => c !== roleCode) : [...current, roleCode]
    );
  }

  submitRoles(): void {
    const user = this.roleTargetUser();
    if (!user) return;
    if (this.pendingRoleCodes().length === 0) {
      this.roleErrorMessage.set('Vui lòng chọn ít nhất 1 quyền.');
      return;
    }
    this.roleErrorMessage.set(null);
    this.savingRoles.set(true);
    this.userService.assignRoles(user.id, this.pendingRoleCodes()).subscribe({
      next: () => {
        this.savingRoles.set(false);
        this.showRoleModal.set(false);
        this.loadUsers();
      },
      error: (err) => {
        this.savingRoles.set(false);
        this.roleErrorMessage.set(err?.error?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
      },
    });
  }
  // -----------------------------------------------------------------------

  exportReport(): void {
    const headers = ['Họ tên', 'Email', 'Số điện thoại', 'Phòng ban', 'Chức vụ', 'Tên đăng nhập', 'Vai trò', 'Trạng thái'];
    const rows = this.filteredUsers().map((u) => [
      u.fullName,
      u.email,
      u.phoneNumber ?? '',
      u.department ?? '',
      u.position ?? '',
      u.username,
      (u.roles ?? []).join('/'),
      u.isActive ? 'Hoạt động' : 'Đã khóa',
    ]);

    const escapeCsv = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `nguoi-dung-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
