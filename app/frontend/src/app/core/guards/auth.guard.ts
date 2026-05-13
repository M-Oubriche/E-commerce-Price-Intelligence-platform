import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';
import { filter, map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isReady$.pipe(
    filter(ready => ready === true),
    take(1),
    map(() => {
      if (!authService.isLoggedIn()) {
        return router.createUrlTree(['/auth'], { 
          queryParams: { mode: 'login', returnUrl: state.url } 
        });
      }

      const user = authService.currentUser;
      const path = route.parent?.url[0]?.path || route.url[0]?.path;

      // Role-based redirection
      if (route.url[0]?.path === 'reseller' && user?.role === UserRole.CLIENT) {
        return router.createUrlTree(['/dashboard']);
      }

      if (route.url[0]?.path === 'dashboard' && user?.role === UserRole.RESELLER) {
        return router.createUrlTree(['/reseller']);
      }

      return true;
    })
  );
};

export const guestGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isReady$.pipe(
    filter(ready => ready === true),
    take(1),
    map(() => {
      if (authService.isLoggedIn()) {
        const user = authService.currentUser;
        const target = user?.role === UserRole.RESELLER ? '/reseller' : '/dashboard';
        return router.createUrlTree([target]);
      }
      return true;
    })
  );
};
