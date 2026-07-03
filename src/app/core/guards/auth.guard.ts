import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn() && !auth.isTokenExpired()) {
    return true;
  }
  auth.logout();
  router.navigate(['/login']);
  return false;
};
