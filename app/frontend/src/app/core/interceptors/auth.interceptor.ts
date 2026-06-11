import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { switchMap, take, filter, mapTo } from 'rxjs/operators';
import { race, timer } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Skip auth endpoints
  if (!req.url.includes('/api/v1/') ||
      req.url.includes('/auth/login') ||
      req.url.includes('/auth/register') ||
      req.url.includes('/auth/refresh') ||
      req.url.includes('/auth/forgot') ||
      req.url.includes('/auth/reset') ||
      req.url.includes('/auth/verify')) {
    return next(req);
  }

  const currentToken = authService.getAccessToken();

  if (currentToken) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${currentToken}`
      }
    });
    return next(authReq);
  }

  // Token not ready yet — wait for it via isReady$, with 10s timeout
  return race([
    authService.isReady$.pipe(
      filter(ready => ready === true),
      take(1)
    ),
    timer(10000).pipe(mapTo(true))
  ]).pipe(
    switchMap(() => {
      const freshToken = authService.getAccessToken();
      if (freshToken) {
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${freshToken}`
          }
        });
        return next(authReq);
      }
      // If still no token after ready, just send original request (might 401)
      return next(req);
    })
  );
};
