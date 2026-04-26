import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

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

  // Shopper trying to access /business
  if (route.url[0]?.path === 'business' && user.type === 'shopper') {
    return router.createUrlTree(['/dashboard']);
  }

  // Business trying to access /dashboard
  if (route.url[0]?.path === 'dashboard' && user.type === 'business') {
    return router.createUrlTree(['/business']);
  }

  return true;
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    const user = authService.currentUser;
    const target = user?.type === 'business' ? '/business' : '/dashboard';
    return router.createUrlTree([target]);
  }

  return true;
};
