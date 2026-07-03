import { Component, signal , inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    usernameOrEmail: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  constructor(private auth: AuthService, private router: Router) {}

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMessage.set(null);
    this.loading.set(true);

    const { usernameOrEmail, password } = this.form.getRawValue();
    this.auth.login({ usernameOrEmail: usernameOrEmail!, password: password! }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err?.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu.'
        );
      },
    });
  }
}
