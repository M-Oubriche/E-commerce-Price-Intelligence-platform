import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { PLATFORM_PRODUCT_LIBRARY } from '../../core/constants/product-library';

@Component({
  selector: 'app-shopper-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ThemeToggleComponent, FormsModule],
  template: `
    <!-- SIDEBAR -->
    <aside class="sidebar">
      <div class="logo" routerLink="/">
        <span class="logo-pulse">PulsePrice</span><span class="logo-price">.</span>
      </div>

      <div class="user-card" *ngIf="authService.currentUser$ | async as user">
        <div class="avatar" [style.background]="user.avatarColor || 'linear-gradient(135deg, #4F8EF7, #8B5CF6)'">
          {{ (user.name || '').charAt(0).toUpperCase() }}
        </div>
        <div class="user-details">
          <div class="user-name">{{ user.name }}</div>
          <div class="user-badge">Shopper</div>
        </div>
      </div>

      <nav class="nav-list">
        <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
          <span class="nav-label">Home</span>
        </a>

        <div class="nav-section-label">MY PRODUCTS</div>
        <a routerLink="/dashboard/tracked" routerLinkActive="active" class="nav-item">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
          <span class="nav-label">Tracked Products</span>
          <span class="nav-badge blue">6</span>
        </a>
        <a routerLink="/dashboard/alerts" routerLinkActive="active" class="nav-item">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
          <span class="nav-label">My Alerts</span>
          <span class="nav-badge amber">4</span>
        </a>

        <div class="nav-section-label">DISCOVER</div>
        <a routerLink="/deals" class="nav-item">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
          <span class="nav-label">Deal Feed</span>
        </a>

        <div class="savings-widget">
          <div class="savings-label">TOTAL SAVED</div>
          <div class="savings-amount">$340.00</div>
          <div class="savings-sub">since you joined</div>
        </div>

        <hr class="nav-divider">
        
        <a routerLink="/dashboard/settings" routerLinkActive="active" class="nav-item">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.754 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          <span class="nav-label">Settings</span>
        </a>
        <a routerLink="/search" class="nav-item back">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          <span class="nav-label">Back to browsing</span>
        </a>
        <button (click)="logout()" class="nav-item logout">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          <span class="nav-label">Log out</span>
        </button>
      </nav>
    </aside>

    <!-- TOPBAR -->
    <header class="topbar">
      <div class="topbar-title">
        {{ currentPageTitle }}
      </div>
      
      <div class="topbar-search">
        <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        <input type="text" [(ngModel)]="searchQuery" (input)="showSuggestions = true" placeholder="Search for products..." (keydown.enter)="onSearch($event)" autocomplete="off">
        
        <!-- Suggestions Dropdown -->
        <div class="suggestions-dropdown" *ngIf="showSuggestions && filteredSuggestions.length > 0">
          <div class="suggestion-item" *ngFor="let prod of filteredSuggestions" (click)="selectSuggestion(prod)">
            <img [src]="prod.image" class="s-img">
            <div class="s-info">
              <span class="s-name">{{ prod.name }}</span>
              <span class="s-cat">{{ prod.category }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="topbar-right" *ngIf="authService.currentUser$ | async as user">
        <app-theme-toggle></app-theme-toggle>
        
        <div class="notif-wrapper">
          <button class="topbar-icon-btn" (click)="toggleNotifications()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span class="notif-dot" *ngIf="unreadCount > 0"></span>
          </button>

          <div class="notif-dropdown" *ngIf="showNotifications">
            <div class="notif-header">
              <span class="notif-title">Notifications</span>
              <span class="notif-count" *ngIf="unreadCount > 0">{{ unreadCount }} new</span>
              <button class="mark-all-btn" (click)="markAllRead()">Mark all read</button>
            </div>

            <div class="notif-list">
              <div
                class="notif-item"
                *ngFor="let notif of notifications"
                [class.unread]="!notif.read"
                (click)="markRead(notif.id); router.navigate(['/product', notif.productId])"
              >
                <div class="notif-icon-wrap" [class]="'notif-icon-' + notif.type">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" *ngIf="notif.type === 'price_drop'">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                    <polyline points="17 6 23 6 23 12"/>
                  </svg>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" *ngIf="notif.type === 'alert_close'">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" *ngIf="notif.type === 'alert_triggered'">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div class="notif-body">
                  <p class="notif-message">{{ notif.message }}</p>
                  <span class="notif-time">{{ notif.time }}</span>
                </div>
                <div class="unread-dot" *ngIf="!notif.read"></div>
              </div>
            </div>

            <div class="notif-footer" (click)="router.navigate(['/dashboard/alerts'])">
              View all alerts →
            </div>
          </div>
        </div>
        <div class="topbar-avatar" 
             [style.background]="user.avatarColor || 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))'"
             (click)="router.navigate(['/dashboard/settings'])">
          {{ (user.name || '').charAt(0).toUpperCase() }}
        </div>
      </div>
    </header>

    <!-- MAIN CONTENT -->
    <main class="main-content">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    :host {
      display: grid;
      grid-template-columns: 240px 1fr;
      grid-template-rows: 64px 1fr;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background: var(--bg-primary);
      color: var(--text-primary);
    }

    .sidebar {
      grid-column: 1;
      grid-row: 1 / 3;
      background: var(--bg-primary);
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column;
      padding: 24px 16px;
      overflow-y: auto;
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
    }

    .logo {
      padding: 0 12px;
      margin-bottom: 32px;
      font-size: 20px;
      font-weight: 900;
      cursor: pointer;
      letter-spacing: -0.02em;
      color: var(--text-primary);
      .logo-pulse { color: var(--accent-blue); }
      .logo-price { color: #FFFFFF; }
    }

    :host-context(html.light-mode) .logo .logo-price {
      color: var(--text-primary);
    }

    .user-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 32px;

      .avatar {
        width: 38px; height: 38px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; font-weight: 700; color: white; flex-shrink: 0;
        background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
      }

      .user-details { overflow: hidden; }

      .user-name {
        font-size: 13px; font-weight: 600; color: var(--text-primary);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }

      .user-badge {
        font-size: 10px; background: var(--accent-blue-light);
        color: var(--accent-blue); padding: 2px 8px;
        border-radius: 20px; display: inline-block; margin-top: 4px;
        font-weight: 700; text-transform: uppercase;
      }
    }

    .nav-list { display: flex; flex-direction: column; flex: 1; }

    .nav-section-label {
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.12em;
      color: var(--text-muted);
      padding: 16px 12px 8px;
    }

    .nav-item {
      display: flex; align-items: center; gap: 12px;
      height: 42px; padding: 0 12px;
      border-radius: 10px; cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none; margin-bottom: 4px;
      background: transparent;
      border: none;
      width: 100%; text-align: left;
      color: var(--text-secondary);

      svg { width: 18px; height: 18px; color: currentColor; opacity: 0.25; flex-shrink: 0; transition: opacity 0.2s; }
      .nav-label { font-size: 14px; font-weight: 500; }

      .nav-badge {
        margin-left: auto; font-size: 10px; font-weight: 700;
        padding: 1px 7px; border-radius: 20px;
        &.blue { background: var(--accent-blue-light); color: var(--accent-blue); }
        &.amber { background: var(--accent-amber-light); color: var(--accent-amber); }
      }

      &:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
        svg { opacity: 1; }
      }

      &.active {
        background: var(--accent-blue-light);
        color: var(--accent-blue);
        border-left: 2px solid var(--accent-blue);
        border-radius: 0 10px 10px 0;
        svg { opacity: 1; }
        .nav-label { font-weight: 600; }
      }

      &.logout {
        margin-top: 8px;
        &:hover {
          background: var(--accent-red-light);
          color: var(--accent-red);
          svg { opacity: 1; }
        }
      }

      &.back {
        margin-top: auto;
        opacity: 0.6;
        &:hover { opacity: 1; }
      }
    }

    .nav-divider {
      border: none; border-top: 1px solid var(--border);
      margin: 16px 0; width: 100%;
    }

    .savings-widget {
      margin: 16px 0;
      background: linear-gradient(135deg, var(--accent-green-light), rgba(16, 185, 129, 0.04));
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px;

      .savings-label {
        font-size: 10px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.1em;
        color: var(--accent-green); margin-bottom: 6px;
      }

      .savings-amount {
        font-size: 22px; font-weight: 800;
        color: var(--accent-green); font-variant-numeric: tabular-nums;
      }

      .savings-sub {
        font-size: 11px; color: var(--text-muted); margin-top: 4px;
      }
    }

    .topbar {
      grid-column: 2;
      grid-row: 1;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center;
      gap: 24px; padding: 0 32px;
      z-index: 10;

      .topbar-title {
        font-size: 16px; font-weight: 600;
        color: var(--text-primary); white-space: nowrap;
        letter-spacing: -0.01em;
      }

      .topbar-search {
        flex: 1; max-width: 440px;
        margin: 0 auto; position: relative;

        input {
          width: 100%; height: 40px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 10px; padding: 0 16px 0 42px;
          font-size: 14px; color: var(--text-primary);
          outline: none; transition: all 0.2s;

          &::placeholder { color: var(--text-muted); }
          &:focus {
            border-color: var(--accent-blue);
            box-shadow: 0 0 0 3px var(--accent-blue-light);
          }
        }

        .search-icon {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%);
          width: 16px; height: 16px; color: var(--text-muted);
        }

        /* Suggestions Dropdown */
        .suggestions-dropdown {
          position: absolute; top: calc(100% + 10px); left: 0; right: 0;
          background: var(--bg-secondary); border: 1px solid var(--border);
          border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          z-index: 1000; overflow: hidden; backdrop-filter: blur(16px);
        }
        .suggestion-item {
          padding: 10px 16px; display: flex; gap: 12px; align-items: center; cursor: pointer; transition: all 0.2s;
          &:hover { background: var(--bg-hover); }
          .s-img { width: 34px; height: 34px; border-radius: 8px; object-fit: cover; }
          .s-info { display: flex; flex-direction: column; }
          .s-name { font-size: 13px; font-weight: 600; color: var(--text-primary); line-height: 1.2; }
          .s-cat { font-size: 10px; color: var(--text-muted); text-transform: uppercase; }
        }
      }

      .topbar-right {
        display: flex; align-items: center;
        gap: 14px; margin-left: auto;
      }

      .topbar-icon-btn {
        width: 38px; height: 38px; border-radius: 10px;
        background: var(--bg-elevated); border: 1px solid var(--border);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; transition: all 0.2s; position: relative;

        svg { width: 18px; height: 18px; color: var(--text-secondary); }
        &:hover { background: var(--bg-hover); border-color: var(--border-mid); }

        .notif-dot {
          position: absolute; top: 8px; right: 8px;
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--accent-red); border: 2px solid var(--bg-primary);
        }
      }

      .topbar-avatar {
        width: 38px; height: 38px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; font-weight: 700; color: white;
        cursor: pointer; border: 2px solid transparent;
        transition: all 0.2s;
        background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
        &:hover { transform: scale(1.05); border-color: var(--border-mid); }
      }
    }

    .main-content {
      grid-column: 2;
      grid-row: 2;
      background: var(--bg-primary);
      overflow-y: auto;
      padding: 32px;
    }

    .notif-wrapper {
      position: relative;
    }

    .notif-dropdown {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 340px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 14px;
      box-shadow: var(--shadow-hover);
      z-index: 500;
      overflow: hidden;

      .notif-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 16px 16px 12px;
        border-bottom: 1px solid var(--border);

        .notif-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          flex: 1;
        }

        .notif-count {
          font-size: 11px;
          font-weight: 600;
          background: var(--accent-blue-light);
          color: var(--accent-blue);
          padding: 2px 8px;
          border-radius: 20px;
        }

        .mark-all-btn {
          font-size: 12px;
          color: var(--accent-blue);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          &:hover { text-decoration: underline; }
        }
      }

      .notif-list {
        max-height: 320px;
        overflow-y: auto;
        scrollbar-width: none;
        &::-webkit-scrollbar { display: none; }
      }

      .notif-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px 16px;
        cursor: pointer;
        transition: background 0.15s;
        border-bottom: 1px solid var(--border);
        position: relative;

        &:last-child { border-bottom: none; }
        &:hover { background: var(--bg-hover); }

        &.unread {
          background: var(--accent-blue-light);
          &:hover { background: var(--accent-blue-light); opacity: 0.8; }
        }
      }

      .notif-icon-wrap {
        width: 34px;
        height: 34px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        svg { width: 15px; height: 15px; }

        &.notif-icon-price_drop {
          background: var(--accent-green-light);
          svg { color: var(--accent-green); }
        }
        &.notif-icon-alert_close {
          background: var(--accent-amber-light);
          svg { color: var(--accent-amber); }
        }
        &.notif-icon-alert_triggered {
          background: var(--accent-blue-light);
          svg { color: var(--accent-blue); }
        }
      }

      .notif-body {
        flex: 1;
        min-width: 0;

        .notif-message {
          font-size: 13px;
          color: var(--text-primary);
          line-height: 1.4;
          margin: 0 0 4px;
        }

        .notif-time {
          font-size: 11px;
          color: var(--text-muted);
        }
      }

      .unread-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--accent-blue);
        flex-shrink: 0;
        margin-top: 4px;
      }

      .notif-footer {
        padding: 12px 16px;
        text-align: center;
        font-size: 13px;
        font-weight: 500;
        color: var(--accent-blue);
        cursor: pointer;
        border-top: 1px solid var(--border);
        transition: background 0.15s;
        &:hover { background: var(--bg-hover); }
      }
    }
  `]
})
export class ShopperDashboardComponent {
  currentPageTitle = 'Dashboard';
  searchQuery = '';
  showSuggestions = false;
  showNotifications = false;

  notifications = [
    {
      id: 1,
      type: 'price_drop',
      message: 'iPhone 15 Pro dropped $45 on Amazon — now $854',
      time: '2 hours ago',
      read: false,
      productId: '1'
    },
    {
      id: 2,
      type: 'alert_close',
      message: 'MacBook Pro 14" is 85% close to your $1,800 target',
      time: '3 hours ago',
      read: false,
      productId: '2'
    },
    {
      id: 3,
      type: 'price_drop',
      message: 'Sony WH-1000XM5 dropped $30 on BestBuy — now $279',
      time: '5 hours ago',
      read: true,
      productId: '3'
    },
    {
      id: 4,
      type: 'alert_triggered',
      message: 'PS5 Console alert triggered — price hit $449 on Amazon',
      time: '1 day ago',
      read: true,
      productId: '4'
    },
    {
      id: 5,
      type: 'price_drop',
      message: 'RTX 4080 GPU dropped $200 on Newegg — now $899',
      time: '1 day ago',
      read: true,
      productId: '6'
    }
  ];

  public authService = inject(AuthService);
  public router = inject(Router);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateTitle(event.url);
    });
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  markAllRead() {
    this.notifications.forEach(n => n.read = true);
  }

  markRead(id: number) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) notif.read = true;
  }

  closeNotifications() {
    this.showNotifications = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.notif-wrapper') && !target.closest('.topbar-search')) {
      this.showNotifications = false;
      this.showSuggestions = false;
    }
  }

  updateTitle(url: string) {
    if (url.includes('/tracked')) this.currentPageTitle = 'Tracked Products';
    else if (url.includes('/alerts')) this.currentPageTitle = 'My Price Alerts';
    else if (url.includes('/settings')) this.currentPageTitle = 'Settings';
    else this.currentPageTitle = 'Dashboard';
  }

  onSearch(event: any) {
    if (this.searchQuery) {
      this.showSuggestions = false;
      this.router.navigate(['/search'], { queryParams: { q: this.searchQuery } });
    }
  }

  get filteredSuggestions() {
    if (!this.searchQuery || this.searchQuery.length < 1) return [];
    const q = this.searchQuery.toLowerCase();
    return PLATFORM_PRODUCT_LIBRARY.filter(p => p.name.toLowerCase().includes(q)).slice(0, 5);
  }

  selectSuggestion(prod: any) {
    this.searchQuery = prod.name;
    this.showSuggestions = false;
    this.router.navigate(['/product', prod.id]);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
