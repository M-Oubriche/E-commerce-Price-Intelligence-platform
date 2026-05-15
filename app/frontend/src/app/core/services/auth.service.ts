import { Injectable, Inject, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpBackend } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, map, catchError, switchMap } from 'rxjs/operators';
import { UserRole } from '../models/user.model';
import { ApiResponse } from '../models/api-response.model';
import { environment } from '../../../environments/environment';
import { SocialAuthService } from '@abacritt/angularx-social-login';

export enum AlertCondition {
  BELOW_TARGET = 'below_target',
  ANY_CHANGE = 'any_change',
  DROP_10PCT = 'drop_10pct',
  DROP_20PCT = 'drop_20pct'
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  organization?: string;
  avatarColor?: string;
  initials?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export interface GoogleAuthResponse {
  is_new_user: boolean;
  access_token?: string;
  refresh_token?: string;
  user?: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.userSubject.asObservable();
  
  private readySubject = new BehaviorSubject<boolean>(false);
  isReady$ = this.readySubject.asObservable();

  private accessTokenSubject = new BehaviorSubject<string | null>(null);
  accessToken$ = this.accessTokenSubject.asObservable();
  
  private accessToken: string | null = null;
  private isRefreshing = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly KEYS = {
    USER: 'pulseprice_user',
    REFRESH_TOKEN: 'pulseprice_refresh_token'
  };

  private isBrowser: boolean;
  private httpBackend: HttpClient;
  private socialAuthService = inject(SocialAuthService);

  constructor(
    private http: HttpClient,
    handler: HttpBackend,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.httpBackend = new HttpClient(handler);
    this.rehydrate();
  }

  get currentUser(): User | null { return this.userSubject.value; }

  private setAccessToken(token: string | null): void {
    this.accessToken = token;
    this.accessTokenSubject.next(token);
  }

  private rehydrate() {
    if (!this.isBrowser) {
      this.readySubject.next(true);
      return;
    }
    try {
      const u = localStorage.getItem(this.KEYS.USER);
      const rt = localStorage.getItem(this.KEYS.REFRESH_TOKEN);
      
      if (u && rt) {
        this.userSubject.next(JSON.parse(u));
        // Restore access token via refresh endpoint on startup
        this.refresh().subscribe({
          next: () => this.readySubject.next(true),
          error: () => {
            this.clearAuthState();
            this.readySubject.next(true);
          }
        });
      } else {
        this.clearAuthState();
        this.readySubject.next(true);
      }
    } catch (e) {
      this.clearAuthState();
      this.readySubject.next(true);
    }
  }

  // --- Core Auth ---

  getUserProfile(): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${environment.apiUrl}/users/me`).pipe(
      map(res => res.data),
      tap(user => this.setUser(user))
    );
  }

  register(name: string, email: string, password: string, role: UserRole): Observable<User> {
    return this.httpBackend.post<ApiResponse<User>>(`${this.API_URL}/register`, {
      full_name: name, email, password, role
    }).pipe(
      map(res => res.data)
    );
  }

  login(email: string, password: string): Observable<User> {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    return this.httpBackend.post<ApiResponse<TokenResponse>>(`${this.API_URL}/login`, formData).pipe(
      switchMap(res => {
        this.setAccessToken(res.data.access_token);
        if (res.data.refresh_token && this.isBrowser) {
          localStorage.setItem(this.KEYS.REFRESH_TOKEN, res.data.refresh_token);
        }
        return this.getUserProfile().pipe(
          tap(() => this.readySubject.next(true))
        );
      })
    );
  }

  loginWithGoogle(role: UserRole): Observable<User> {
    return throwError(() => new Error('Google OAuth handled via SocialAuthService'));
  }

  googleAuth(idToken: string): Observable<GoogleAuthResponse> {
    return this.httpBackend.post<GoogleAuthResponse>(
      `${this.API_URL}/google`,
      { token: idToken }
    ).pipe(
      tap(res => {
        if (!res.is_new_user && res.access_token && res.user) {
          this.setAccessToken(res.access_token);
          if (res.refresh_token && this.isBrowser) {
            localStorage.setItem(this.KEYS.REFRESH_TOKEN, res.refresh_token);
          }
          this.setUser(res.user);
          this.readySubject.next(true);
        }
      })
    );
  }

  confirmGoogleSignup(idToken: string, role: UserRole): Observable<User> {
    return this.httpBackend.post<GoogleAuthResponse>(
      `${this.API_URL}/google/confirm`,
      { token: idToken, role }
    ).pipe(
      tap(res => {
        if (res.access_token && res.user) {
          this.setAccessToken(res.access_token);
          if (res.refresh_token && this.isBrowser) {
            localStorage.setItem(this.KEYS.REFRESH_TOKEN, res.refresh_token);
          }
          this.setUser(res.user);
          this.readySubject.next(true);
        }
      }),
      map(res => res.user!)
    );
  }

  updateUser(updates: Partial<User>): Observable<User> {
    return this.http.patch<ApiResponse<User>>(`${environment.apiUrl}/users/me`, updates).pipe(
      map(res => res.data),
      tap(user => this.setUser(user)),
      switchMap(user => {
        // If role changed, we MUST refresh the token to update the JWT payload
        if (updates.role) {
          return this.refresh().pipe(
            map(() => user),
            catchError(() => of(user)) // Fallback if refresh fails
          );
        }
        return of(user);
      })
    );
  }

  logout(): Observable<void> {
    const refreshToken = this.isBrowser ? localStorage.getItem(this.KEYS.REFRESH_TOKEN) : null;
    
    // 1. Mark as not ready to block guards
    this.readySubject.next(false);
    
    // 2. Clear local state immediately
    this.clearAuthState();

    // 3. Sign out from Google if applicable
    if (this.isBrowser) {
      this.socialAuthService.signOut().catch(() => {
        // Ignore error if not signed in with Google
      });
    }
    
    // 4. Mark as ready again (now with no user)
    this.readySubject.next(true);

    if (!refreshToken) return of(undefined);

    return this.httpBackend.post<void>(`${this.API_URL}/logout`, { refresh_token: refreshToken }, { withCredentials: true }).pipe(
      map(() => undefined),
      catchError(() => of(undefined))
    );
  }

  refresh(): Observable<string> {
    const refreshToken = this.isBrowser ? localStorage.getItem(this.KEYS.REFRESH_TOKEN) : null;
    if (!refreshToken) return throwError(() => new Error('No refresh token'));

    return this.httpBackend.post<ApiResponse<TokenResponse>>(
      `${this.API_URL}/refresh`, 
      { refresh_token: refreshToken }, 
      { withCredentials: true }
    ).pipe(
      map(res => {
        this.setAccessToken(res.data.access_token);
        if (res.data.refresh_token && this.isBrowser) {
          localStorage.setItem(this.KEYS.REFRESH_TOKEN, res.data.refresh_token);
        }
        return res.data.access_token;
      }),
      catchError(err => {
        this.clearAuthState();
        return throwError(() => err);
      })
    );
  }

  forgotPassword(email: string): Observable<{message: string}> {
    return this.httpBackend.post<{message: string}>(`${this.API_URL}/forgot-password?email=${email}`, {});
  }

  resetPassword(token: string, newPassword: string): Observable<{message: string}> {
    return this.httpBackend.post<{message: string}>(`${this.API_URL}/reset-password?token=${token}&new_password=${newPassword}`, {});
  }

  verifyEmail(token: string): Observable<{message: string}> {
    return this.httpBackend.get<{message: string}>(`${this.API_URL}/verify?token=${token}`);
  }

  deleteAccount(): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/users/me`).pipe(
      switchMap(() => this.logout())
    );
  }

  // --- Helpers ---

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isLoggedIn(): boolean {
    return !!this.userSubject.value && !!this.accessToken;
  }

  hasRole(role: UserRole): boolean {
    return this.userSubject.value?.role === role;
  }

  private setUser(user: User) {
    this.userSubject.next(user);
    if (this.isBrowser) localStorage.setItem(this.KEYS.USER, JSON.stringify(user));
  }

  private clearAuthState() {
    this.setAccessToken(null);
    this.userSubject.next(null);
    if (this.isBrowser) {
      localStorage.removeItem(this.KEYS.USER);
      localStorage.removeItem(this.KEYS.REFRESH_TOKEN);
    }
  }

  // Handle 401 and refresh
  handleHttpError(error: HttpErrorResponse, originalRequest: Observable<any>): Observable<any> {
    if (error.status === 401 && !error.url?.includes('/refresh') && !error.url?.includes('/login')) {
      return this.refreshTokenAndRetry(originalRequest);
    }
    return throwError(() => error);
  }

  private refreshTokenAndRetry(originalRequest: Observable<any>): Observable<any> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshSubject.next(null);

      return this.refresh().pipe(
        switchMap((token) => {
          this.isRefreshing = false;
          this.refreshSubject.next(token);
          return originalRequest;
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.logout();
          return throwError(() => err);
        })
      );
    } else {
      return this.refreshSubject.pipe(
        switchMap((token) => {
          if (token) return originalRequest;
          return throwError(() => new Error('Refresh failed'));
        })
      );
    }
  }
}
