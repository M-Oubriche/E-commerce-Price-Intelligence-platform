import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastComponent } from '../../shared/components/toast/toast.component';
import { NotificationCenterComponent } from '../../shared/components/notification-center/notification-center.component';
import { PriceTickerComponent } from '../../shared/components/price-ticker/price-ticker.component';

@Component({
  selector: 'app-buyer-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastComponent, NotificationCenterComponent, PriceTickerComponent],
  template: `
    <div class="app-wrapper">
      <!-- Fixed Top Navigation -->
      <header class="top-nav border-bottom">
        <div class="nav-container container-fluid">
          <div class="nav-left">
            <div class="brand">
              <span class="type-label logo-text">PulsePrice</span>
              <span class="role-badge">BUYER MODE</span>
            </div>
          </div>

          <nav class="nav-center">
            <a routerLink="dashboard" routerLinkActive="active" class="nav-item">
              <span class="type-label">DASHBOARD</span>
              <div class="indicator"></div>
            </a>
            <a routerLink="search" routerLinkActive="active" class="nav-item">
              <span class="type-label">SEARCH</span>
              <div class="indicator"></div>
            </a>
            <a routerLink="watchlist" routerLinkActive="active" class="nav-item">
              <span class="type-label">WATCHLIST</span>
              <div class="indicator"></div>
            </a>
            <a routerLink="analytics" routerLinkActive="active" class="nav-item">
              <span class="type-label">ANALYTICS</span>
              <div class="indicator"></div>
            </a>
            <a routerLink="alerts" routerLinkActive="active" class="nav-item">
              <span class="type-label">ALERTS</span>
              <div class="indicator"></div>
            </a>
          </nav>

          <div class="nav-right">
            <div class="global-actions">
              <button class="icon-btn" title="Refresh Data">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                  <path d="M16 16h5v5"></path>
                </svg>
              </button>
              <button class="icon-btn" (click)="isNotificationsOpen = true" title="Notifications">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              </button>
              <button class="icon-btn" title="Settings">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>
            </div>
            
            <!-- User Tile: Alex Rivera -->
            <div class="user-tile border-outline" (click)="logout()">
              <div class="avatar-placeholder">AR</div>
              <div class="user-meta">
                <span class="user-name">Alex Rivera</span>
                <span class="user-role type-label">Buyer</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Dynamic Page Header -->
      <div class="page-context-bar container-fluid">
        <div class="title-area">
          <h2 class="page-title">{{ currentPageTitle }}</h2>
          <div class="live-indicator">
            <span class="pulse-dot"></span>
            <span class="type-label">LIVE</span>
          </div>
        </div>
      </div>

      <!-- Real-time Price Ticker -->
      <app-price-ticker></app-price-ticker>

      <main class="main-content">
        <div class="container-fluid">
          <router-outlet></router-outlet>
        </div>
      </main>

      <app-toast></app-toast>
      <app-notification-center 
        [isOpen]="isNotificationsOpen" 
        (close)="isNotificationsOpen = false"
      ></app-notification-center>
    </div>
  `,
  styles: [`
    $c-charcoal: #0F172A; $c-gray-900: #111827; $c-gray-800: #1f2937; $c-gray-100: #F8FAFC; $c-gray-200: #E2E8F0; $c-white: #ffffff;
    $c-slate: #475569; $c-blue: #2563EB; $c-blue-light: rgba(37, 99, 235, 0.08); $c-green: #059669;

    .app-wrapper {
      min-height: 100vh;
      background: $c-gray-100;
      font-family: 'Inter', sans-serif;
    }

    .top-nav {
      height: 72px;
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 100;
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(12px);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      display: flex;
      align-items: center;
      border-bottom: 1px solid $c-gray-200;
    }

    .nav-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding: 0 2rem;
      max-width: 1440px;
      margin: 0 auto;
    }

    .nav-left {
      flex: 1;
      .brand {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        .logo-text { font-size: 1.25rem; font-weight: 800; color: $c-charcoal; letter-spacing: -0.02em; }
        .role-badge {
          font-size: 0.75rem;
          background: $c-blue-light;
          color: $c-blue;
          padding: 4px 10px;
          border-radius: 9999px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      }
    }

    .nav-center {
      display: flex;
      gap: 2.5rem;
      .nav-item {
        text-decoration: none;
        color: $c-slate;
        padding: 1.5rem 0;
        position: relative;
        transition: color 0.2s;
        font-size: 0.875rem;
        font-weight: 500;
        
        &:hover { color: $c-blue; }
        &.active {
          color: $c-blue;
          font-weight: 600;
          .indicator { width: 100%; opacity: 1; }
        }

        .type-label { text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.75rem;}

        .indicator {
          position: absolute;
          bottom: 0px;
          left: 0;
          width: 0;
          opacity: 0;
          height: 3px;
          background: $c-blue;
          border-top-left-radius: 3px;
          border-top-right-radius: 3px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      }
    }

    .nav-right {
      flex: 1;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 2rem;

      .global-actions {
        display: flex;
        gap: 0.5rem;
      }

      .icon-btn {
        background: transparent;
        border: 1px solid transparent;
        cursor: pointer;
        color: $c-slate;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s;
        
        &:hover { 
          color: $c-blue; 
          background: $c-blue-light;
        }
      }

      .user-tile {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 6px 16px 6px 6px;
        cursor: pointer;
        background: $c-white;
        border: 1px solid $c-gray-200;
        border-radius: 50px;
        transition: all 0.2s;
        
        &:hover { border-color: $c-blue; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }

        .avatar-placeholder {
          width: 32px;
          height: 32px;
          background: $c-blue;
          color: $c-white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .user-meta {
          display: flex;
          flex-direction: column;
          .user-name { font-size: 0.875rem; font-weight: 600; color: $c-charcoal; }
          .user-role { font-size: 0.65rem; color: $c-slate; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;}
        }
      }
    }

    .page-context-bar {
      padding-top: 110px; // 72px header + offset
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2rem;
      max-width: 1440px;
      margin-left: auto;
      margin-right: auto;
      padding-left: 2rem;
      padding-right: 2rem;

      .title-area {
        display: flex;
        align-items: center;
        gap: 1.5rem;
      }

      .page-title {
        font-size: 2rem;
        font-weight: 800;
        color: $c-charcoal;
        margin: 0;
        letter-spacing: -0.04em;
      }

      .live-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 6px 12px;
        background: rgba(5, 150, 105, 0.08);
        color: $c-green;
        border-radius: 50px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: $c-green;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(5, 150, 105, 0.4);
          animation: pulse 2s infinite;
        }
      }
    }

    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
      100% { opacity: 1; transform: scale(1); }
    }

    .main-content {
      padding-top: 1rem;
      padding-bottom: 6rem;
      max-width: 1440px;
      margin: 0 auto;
      padding-left: 2rem;
      padding-right: 2rem;
      overflow-x: hidden;
    }
  `]
})
export class BuyerLayoutComponent implements OnInit {
  user = this.authService.currentUser;
  isNotificationsOpen = false;
  currentPageTitle = 'Dashboard';

  constructor(
    private authService: AuthService, 
    private themeService: ThemeService,
    private router: Router
  ) {}

  ngOnInit() {
    this.themeService.setRoleTheme('BUYER');
    
    // Track current route for page title
    this.updateTitle(this.router.url);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateTitle(event.url);
    });
  }

  private updateTitle(url: string) {
    const segment = url.split('/').pop() || 'dashboard';
    this.currentPageTitle = segment.charAt(0).toUpperCase() + segment.slice(1);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
