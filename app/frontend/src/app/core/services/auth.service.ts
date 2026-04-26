import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

export interface User {
  name: string;
  email: string;
  type: 'shopper' | 'business';
  organization?: string;
  avatarColor?: string;
}

export interface TrackedProduct {
  id: string;
}

export interface Alert {
  id: string;
  productId: string;
  conditionType: string;
  targetValue: number;
  stores: string[];
  notifyEmail: boolean;
  notifyApp: boolean;
  status: 'active' | 'paused' | 'triggered';
  createdAt: string;
}

export interface Settings {
  emailAlerts: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
  dealFeedUpdates: boolean;
  frequency: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.userSubject.asObservable();
  
  private trackedSubject = new BehaviorSubject<string[]>([]);
  tracked$ = this.trackedSubject.asObservable();

  private alertsSubject = new BehaviorSubject<Alert[]>([]);
  alerts$ = this.alertsSubject.asObservable();

  private settingsSubject = new BehaviorSubject<Settings>({
    emailAlerts: true,
    pushNotifications: false,
    weeklyDigest: true,
    dealFeedUpdates: false,
    frequency: 'Instant'
  });
  settings$ = this.settingsSubject.asObservable();

  private readonly KEYS = {
    USER: 'pulseprice_user',
    TRACKED: 'pulseprice_tracked',
    ALERTS: 'pulseprice_alerts',
    SETTINGS: 'pulseprice_settings'
  };

  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.rehydrate();
  }

  get currentUser(): User | null { return this.userSubject.value; }
  get tracked(): string[] { return this.trackedSubject.value; }
  get alerts(): Alert[] { return this.alertsSubject.value; }
  get settings(): Settings { return this.settingsSubject.value; }

  private rehydrate() {
    if (!this.isBrowser) return;

    try {
      const u = localStorage.getItem(this.KEYS.USER);
      if (u) this.userSubject.next(JSON.parse(u));

      const t = localStorage.getItem(this.KEYS.TRACKED);
      if (t) this.trackedSubject.next(JSON.parse(t));

      const a = localStorage.getItem(this.KEYS.ALERTS);
      if (a) this.alertsSubject.next(JSON.parse(a));

      const s = localStorage.getItem(this.KEYS.SETTINGS);
      if (s) this.settingsSubject.next(JSON.parse(s));
    } catch (e) {
      console.error('Failed to rehydrate auth state', e);
    }
  }

  login(email: string, password: string): Observable<User> {
    if (email && password) {
      const user: User = { 
        name: 'Demo User', 
        email, 
        type: 'shopper',
        organization: 'Personal Account',
        avatarColor: '#3B82F6'
      };
      return of(user).pipe(
        delay(1500),
        tap(u => this.setUser(u))
      );
    } else {
      return throwError(() => new Error('Invalid credentials')).pipe(delay(1500));
    }
  }

  signup(name: string, email: string, password: string, type: 'shopper' | 'business'): Observable<User> {
    const user: User = { 
      name, 
      email, 
      type,
      organization: type === 'business' ? 'PulsePrice Business' : 'Personal Account',
      avatarColor: '#3B82F6'
    };
    return of(user).pipe(
      delay(1500),
      tap(u => this.setUser(u))
    );
  }

  loginWithGoogle(type: 'shopper' | 'business' = 'shopper'): Observable<User> {
    const user: User = { 
      name: 'Google User', 
      email: 'user@gmail.com', 
      type,
      organization: type === 'business' ? 'PulsePrice Business' : 'Personal Account',
      avatarColor: '#3B82F6'
    };
    return of(user).pipe(
      delay(1500),
      tap(u => this.setUser(u))
    );
  }

  logout(): void {
    this.userSubject.next(null);
    this.trackedSubject.next([]);
    this.alertsSubject.next([]);
    if (this.isBrowser) {
      localStorage.removeItem(this.KEYS.USER);
      localStorage.removeItem(this.KEYS.TRACKED);
      localStorage.removeItem(this.KEYS.ALERTS);
      localStorage.removeItem(this.KEYS.SETTINGS);
    }
  }

  isLoggedIn(): boolean {
    return this.userSubject.value !== null;
  }

  hasRole(type: string): boolean {
    return this.userSubject.value?.type === type;
  }

  // --- Profile ---
  updateUser(updates: Partial<User>) {
    const current = this.userSubject.value;
    if (current) {
      const updated = { ...current, ...updates };
      this.setUser(updated);
    }
  }

  private setUser(user: User) {
    this.userSubject.next(user);
    if (this.isBrowser) localStorage.setItem(this.KEYS.USER, JSON.stringify(user));
  }

  // --- Tracked Products ---
  toggleTracked(productId: string): boolean {
    const current = [...this.trackedSubject.value];
    const idx = current.indexOf(productId);
    let isTracked = false;
    
    if (idx > -1) {
      current.splice(idx, 1);
      isTracked = false;
      
      // Automatically remove all alerts for this product if tracking is removed
      const currentAlerts = this.alertsSubject.value.filter(a => a.productId !== productId);
      if (currentAlerts.length !== this.alertsSubject.value.length) {
        this.alertsSubject.next(currentAlerts);
        if (this.isBrowser) localStorage.setItem(this.KEYS.ALERTS, JSON.stringify(currentAlerts));
      }
    } else {
      current.push(productId);
      isTracked = true;
    }
    
    this.trackedSubject.next(current);
    if (this.isBrowser) localStorage.setItem(this.KEYS.TRACKED, JSON.stringify(current));
    return isTracked;
  }

  isTracked(productId: string): boolean {
    return this.trackedSubject.value.includes(productId);
  }

  // --- Alerts ---
  addAlert(alert: Alert) {
    // Automatically track the product if not already tracked
    if (alert.productId && !this.isTracked(alert.productId)) {
      this.toggleTracked(alert.productId);
    }

    const current = [...this.alertsSubject.value, alert];
    this.alertsSubject.next(current);
    if (this.isBrowser) localStorage.setItem(this.KEYS.ALERTS, JSON.stringify(current));
  }

  updateAlert(id: string, updates: Partial<Alert>) {
    const current = this.alertsSubject.value.map(a => a.id === id ? { ...a, ...updates } : a);
    this.alertsSubject.next(current);
    if (this.isBrowser) localStorage.setItem(this.KEYS.ALERTS, JSON.stringify(current));
  }

  deleteAlert(id: string) {
    const current = this.alertsSubject.value.filter(a => a.id !== id);
    this.alertsSubject.next(current);
    if (this.isBrowser) localStorage.setItem(this.KEYS.ALERTS, JSON.stringify(current));
  }

  // --- Settings ---
  updateSettings(updates: Partial<Settings>) {
    const current = { ...this.settingsSubject.value, ...updates };
    this.settingsSubject.next(current);
    if (this.isBrowser) localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(current));
  }
}
