import { Component, OnInit, signal , inject } from '@angular/core';
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
  keyword = '';

  showFormModal = signal(false);
  showRoleModal = signal(false);
  editingUser = signal<AppUser | null>(null);
  roleTargetUser = signal<AppUser | null>(null);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

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
    this.userService.getRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.roles.set([
        { id: 1, code: 'ADMIN', name: 'Admin' },
        { id: 2, code: 'APPROVER', name: 'Approver' },
        { id: 3, code: 'USER', name: 'User' },
      ]),
    });
  }

  loadUsers(): void {
    this.loading.set(true);
    this.userService.getAll({ keyword: this.keyword, page: 1, pageSize: 50 }).subscribe({
      next: (res) => {
        this.users.set(res.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
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

  openRoleModal(user: AppUser): void {
    this.roleTargetUser.set(user);
    this.showRoleModal.set(true);
  }

  closeRoleModal(): void {
    this.showRoleModal.set(false);
  }

  hasRole(user: AppUser, roleCode: string): boolean {
    return user.roles?.some((r) => r.code === roleCode) ?? false;
  }

  toggleRole(role: Role): void {
    const user = this.roleTargetUser();
    if (!user) return;
    const has = this.hasRole(user, role.code);
    const action = has ? this.userService.revokeRole(user.id, role.id) : this.userService.assignRole(user.id, role.id);
    action.subscribe(() => {
      this.loadUsers();
      const refreshed = this.users().find((u) => u.id === user.id);
      if (refreshed) this.roleTargetUser.set(refreshed);
    });
  }
}
