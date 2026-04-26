import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'pulseprice_theme';
  private themeSubject = new BehaviorSubject<Theme>('dark');

  theme$ = this.themeSubject.asObservable();
  isDark$ = this.theme$.pipe(map(t => t === 'dark'));

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem(this.STORAGE_KEY) as Theme;
      this.applyTheme(saved === 'light' ? 'light' : 'dark');
    }
  }

  get isDark(): boolean {
    return this.themeSubject.value === 'dark';
  }

  setRoleTheme(role: 'BUYER' | 'SELLER' | 'PUBLIC') {
    if (isPlatformBrowser(this.platformId)) {
      const html = document.documentElement;
      html.classList.remove('buyer-theme', 'seller-theme', 'public-theme');
      html.classList.add(`${role.toLowerCase()}-theme`);
    }
  }

  toggle() {
    if (isPlatformBrowser(this.platformId)) {
      const html = document.documentElement;
      
      const toggleTheme = () => {
        this.applyTheme(this.isDark ? 'light' : 'dark');
      };

      // Try to use the modern View Transition API for the smoothest experience
      if ((document as any).startViewTransition) {
        (document as any).startViewTransition(() => {
          toggleTheme();
        });
      } else {
        // Fallback to standard CSS transitions
        html.classList.add('theme-transitioning');
        toggleTheme();
        setTimeout(() => {
          html.classList.remove('theme-transitioning');
        }, 400);
      }
    } else {
      this.applyTheme(this.isDark ? 'light' : 'dark');
    }
  }

  private applyTheme(theme: Theme) {
    this.themeSubject.next(theme);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.STORAGE_KEY, theme);
      const html = document.documentElement;
      if (theme === 'light') {
        html.setAttribute('data-theme', 'light');
        html.classList.add('light-mode');
        html.classList.remove('dark-mode');
      } else {
        html.setAttribute('data-theme', 'dark');
        html.classList.add('dark-mode');
        html.classList.remove('light-mode');
      }
    }
  }
}
