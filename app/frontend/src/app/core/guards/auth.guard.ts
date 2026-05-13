import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser;

  if (!user) {
    // Save return URL for later
    return router.createUrlTree(['/auth'], { 
      queryParams: { mode: 'login', returnUrl: state.url } 
    });
  }

  const path = route.parent?.url[0]?.path || route.url[0]?.path;

  // Client trying to access /reseller
  if (route.url[0]?.path === 'reseller' && user.role === UserRole.CLIENT) {
    return router.createUrlTree(['/dashboard']);
  }

  // Reseller trying to access /dashboard
  if (route.url[0]?.path === 'dashboard' && user.role === UserRole.RESELLER) {
    return router.createUrlTree(['/reseller']);
  }

  return true;
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    const user = authService.currentUser;
    const target = user?.role === UserRole.RESELLER ? '/reseller' : '/dashboard';
    return router.createUrlTree([target]);
  }

  return true;
};
