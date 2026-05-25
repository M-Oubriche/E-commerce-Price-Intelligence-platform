import { Component, OnInit, HostListener, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, ActivatedRoute, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { map, filter, startWith, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { Subject, of, forkJoin } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { AnalyticsApiService } from '../../core/services/analytics-api.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { ResellerService } from '../../core/services/reseller.service';

@Component({
  selector: 'app-reseller-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule, ThemeToggleComponent],
  template: `
    <div class="shell" [class.sidebar-collapsed]="sidebarCollapsed">
      <!-- ═══ SIDEBAR ═══ -->
      <aside class="sidebar">
        <!-- Logo -->
        <div class="sidebar-logo" routerLink="/">
          <span class="pulse">Pulse</span><span class="price">Price</span>
          <span class="logo-tag">Reseller</span>
        </div>

        <!-- User Card -->
        <div class="user-card" *ngIf="authService.currentUser$ | async as user">
          <div class="uc-avatar">{{ (user.full_name || '').charAt(0).toUpperCase() }}</div>
          <div class="uc-info">
            <span class="uc-name">{{ user.full_name }}</span>
            <span class="uc-badge reseller">Reseller Pro</span>
          </div>
        </div>

        <!-- Nav -->
        <nav class="sidebar-nav">
          <div class="nav-section">
            <span class="section-label">Overview</span>
            <a routerLink="/reseller" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" class="nav-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span>Overview</span>
            </a>
          </div>

          <div class="nav-section">
            <span class="section-label">Tools</span>
            <a routerLink="/reseller/catalog" routerLinkActive="active" class="nav-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
              <span>Catalog Tracker</span>
              <span class="nav-badge">{{ catalogCount }}</span>
            </a>
            <a routerLink="/reseller/competitors" routerLinkActive="active" class="nav-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>Competitor Scanner</span>
            </a>
            <a routerLink="/reseller/alerts" routerLinkActive="active" class="nav-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span>Pricing Alerts</span>
              <span class="nav-badge risk">{{ alertCount }}</span>
            </a>
          </div>

          <div class="nav-section">
            <span class="section-label">Insights</span>
            <a routerLink="/reseller/analytics" routerLinkActive="active" class="nav-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              <span>Analytics</span>
            </a>
          </div>

          <div class="nav-section">
            <span class="section-label">Account</span>
            <a routerLink="/reseller/settings" routerLinkActive="active" class="nav-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Settings</span>
            </a>
          </div>
        </nav>

        <!-- Footer -->
        <div class="sidebar-footer">
          <a routerLink="/search" class="footer-link back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span>Back to browsing</span>
          </a>
          <button (click)="logout()" class="footer-link logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <!-- ═══ MAIN ═══ -->
      <div class="main">
        <!-- Topbar -->
        <header class="topbar">
          <div class="topbar-left">
            <button class="sidebar-toggle" (click)="sidebarCollapsed = !sidebarCollapsed">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <div class="page-info">
              <h1 class="page-title">{{ pageTitle$ | async }}</h1>
              <span class="page-crumb">Reseller Dashboard</span>
            </div>
          </div>

          <div class="topbar-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" [(ngModel)]="topbarSearch" (input)="onSearchInput()" (keyup.enter)="onSearch()" placeholder="Search products, competitors..." autocomplete="off">
            
            <!-- Suggestions Dropdown -->
            <div class="suggestions-dropdown" *ngIf="showSuggestions && suggestions.length > 0">
              <div class="suggestion-item" *ngFor="let prod of suggestions" (click)="selectSuggestion(prod)">
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
                    (click)="markRead(notif.id); router.navigate([ '/reseller/alerts'])"
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
                    </div>
                    <div class="notif-body">
                      <p class="notif-message">{{ notif.message }}</p>
                      <span class="notif-time">{{ notif.time }}</span>
                    </div>
                    <div class="unread-dot" *ngIf="!notif.read"></div>
                  </div>
                </div>

                <div class="notif-footer" (click)="router.navigate([ '/reseller/alerts'])">
                  View all alerts →
                </div>
              </div>
            </div>

            <div class="topbar-avatar" 
                 [style.background]="user.avatarColor || 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))'"
                 (click)="router.navigate([ '/reseller/settings'])">
              {{ (user.full_name || '').charAt(0).toUpperCase() }}
            </div>
          </div>
        </header>

        <!-- Content -->
        <main class="content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; height: 100vh; width: 100vw; overflow: hidden; }
    .shell { display: flex; width: 100%; background: var(--main-bg); color: var(--text-primary); }

    /* ── Sidebar ── */
    .sidebar {
      width: 240px; height: 100vh; flex-shrink: 0;
      background: var(--sidebar-bg); border-right: 1px solid var(--border);
      display: flex; flex-direction: column; overflow: hidden;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .shell.sidebar-collapsed .sidebar { width: 0; }

    .sidebar-logo {
      padding: 1.5rem 1.25rem 1rem;
      font-size: 1.2rem; font-weight: 900; cursor: pointer;
      letter-spacing: -0.03em; text-decoration: none; display: flex; align-items: center; gap: 0.4rem;
      .pulse { color: var(--accent-blue); }
      .price { color: var(--text-primary); }
      .logo-tag {
        font-size: 0.55rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;
        background: var(--accent-blue-light); color: var(--accent-blue); border: 1px solid rgba(59,130,246,0.2);
        padding: 2px 5px; border-radius: 4px; margin-left: 0.2rem;
      }
    }

    .user-card {
      margin: 0 0.875rem 1.25rem; padding: 0.875rem;
      background: rgba(255,255,255,0.03); border: 1px solid var(--border);
      border-radius: 12px; display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0;
    }
    .uc-avatar {
      width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
      color: #fff; font-weight: 700; font-size: 0.9rem;
      display: flex; align-items: center; justify-content: center;
    }
    .uc-info { display: flex; flex-direction: column; overflow: hidden; }
    .uc-name { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .uc-badge {
      font-size: 0.65rem; font-weight: 700; letter-spacing: 0.06em;
      text-transform: uppercase; padding: 1px 6px; border-radius: 100px;
      width: fit-content; margin-top: 2px;
      &.reseller { background: var(--accent-blue-light); color: var(--accent-blue); }
    }

    .sidebar-nav { flex: 1; overflow-y: auto; padding: 0 0.75rem 1rem; }
    .sidebar-nav::-webkit-scrollbar { width: 0; }

    .nav-section { margin-bottom: 1.25rem; }
    .section-label {
      display: block; padding: 0 0.75rem; margin-bottom: 0.4rem;
      font-size: 0.62rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--text-muted);
    }

    .nav-link {
      display: flex; align-items: center; gap: 0.65rem; padding: 0.6rem 0.75rem;
      border-radius: 9px; color: var(--text-secondary); text-decoration: none;
      font-size: 0.855rem; font-weight: 500; transition: all 0.15s;
      border-left: 2px solid transparent; margin-bottom: 1px;
      svg { width: 17px; height: 17px; flex-shrink: 0; opacity: 0.5; }
      &:hover { background: rgba(255,255,255,0.04); color: var(--text-primary); svg { opacity: 1; } }
      &.active { background: var(--accent-blue-light); color: var(--accent-blue); border-left-color: var(--accent-blue); svg { stroke: var(--accent-blue); opacity: 1; } }
    }
    .nav-badge {
      margin-left: auto; min-width: 20px; height: 18px; padding: 0 5px;
      background: rgba(255,255,255,0.1); color: var(--text-muted);
      border-radius: 100px; font-size: 0.68rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      &.risk { background: rgba(239,68,68,0.2); color: #F87171; }
    }

    .sidebar-footer {
      padding: 0.75rem; border-top: 1px solid var(--border-light);
      display: flex; flex-direction: column; gap: 0.25rem; flex-shrink: 0;
    }
    .footer-link {
      display: flex; align-items: center; gap: 0.65rem; padding: 0.6rem 0.75rem;
      border-radius: 9px; font-size: 0.8rem; font-weight: 500;
      text-decoration: none; cursor: pointer; border: none; background: none;
      width: 100%; text-align: left; transition: all 0.15s;
      svg { width: 16px; height: 16px; flex-shrink: 0; }
      &.back { color: var(--text-muted); &:hover { color: var(--text-secondary); background: rgba(255,255,255,0.03); } }
      &.logout { color: rgba(248,113,113,0.7); &:hover { color: #F87171; background: rgba(239,68,68,0.08); } }
    }

    /* ── Main ── */
    .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

    .topbar {
      height: 60px; flex-shrink: 0; padding: 0 1.5rem;
      background: var(--sidebar-bg); border-bottom: 1px solid var(--border);
      display: flex; align-items: center; gap: 1rem;
    }
    .topbar-left { display: flex; align-items: center; gap: 0.875rem; }
    .sidebar-toggle {
      background: none; border: none; color: var(--text-muted); cursor: pointer;
      padding: 0.4rem; border-radius: 6px; transition: all 0.15s;
      svg { width: 18px; height: 18px; display: block; }
      &:hover { background: rgba(255,255,255,0.06); color: var(--text-primary); }
    }
    .page-info { display: flex; flex-direction: column; }
    .page-title { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); line-height: 1.2; }
    .page-crumb { font-size: 0.72rem; color: var(--accent-blue); opacity: 0.8; }

    .topbar-search {
      flex: 1; max-width: 400px; margin: 0 auto; position: relative;
      svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 15px; color: var(--text-muted); }
      input {
        width: 100%; height: 36px; padding: 0 1rem 0 2.25rem;
        background: var(--main-bg); border: 1px solid var(--border);
        border-radius: 8px; color: var(--text-primary); font-size: 0.85rem;
        &::placeholder { color: var(--text-muted); }
        &:focus { outline: none; border-color: var(--accent-blue); background: rgba(255,255,255,0.02); }
      }
    }

    /* Suggestions Dropdown */
    .suggestions-dropdown {
      position: absolute; top: calc(100% + 8px); left: 0; right: 0;
      background: var(--bg-card, #111827); border: 1px solid var(--border);
      border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      z-index: 1000; overflow: hidden; backdrop-filter: blur(12px);
    }
    .suggestion-item {
      padding: 10px 14px; display: flex; gap: 12px; align-items: center; cursor: pointer; transition: all 0.2s;
      &:hover { background: rgba(59, 130, 246, 0.1); }
      .s-img { width: 32px; height: 32px; border-radius: 6px; object-fit: cover; }
      .s-info { display: flex; flex-direction: column; }
      .s-name { font-size: 13px; font-weight: 600; color: var(--text-primary); line-height: 1.2; }
      .s-cat { font-size: 10px; color: var(--text-muted); text-transform: uppercase; }
    }

    .topbar-right { margin-left: auto; display: flex; align-items: center; gap: 0.75rem; }
    .icon-btn {
      position: relative; background: none; border: none; color: var(--text-muted);
      padding: 0.4rem; border-radius: 8px; cursor: pointer; transition: all 0.15s;
      svg { width: 18px; height: 18px; display: block; }
      &:hover { background: rgba(255,255,255,0.06); color: var(--text-primary); }
    }
    .notif-dot {
      position: absolute; top: 6px; right: 6px; width: 7px; height: 7px;
      border-radius: 50%; border: 2px solid var(--sidebar-bg);
      background: var(--accent-blue);
      &.risk { background: #EF4444; }
    }

    .user-profile-dropdown { position: relative; }
    .topbar-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
      color: #fff; font-weight: 700; font-size: 0.8rem; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .topbar-dropdown {
      position: absolute; top: calc(100% + 8px); right: 0; min-width: 160px;
      background: var(--sidebar-bg); border: 1px solid var(--border);
      border-radius: 10px; padding: 0.4rem; z-index: 1000;
      opacity: 0; visibility: hidden; transform: translateY(6px);
      transition: all 0.18s cubic-bezier(0.16,1,0.3,1);
      &.show { opacity: 1; visibility: visible; transform: translateY(0); }
    }
    .td-item {
      display: block; padding: 0.6rem 0.75rem; font-size: 0.85rem; font-weight: 500;
      color: var(--text-secondary); text-decoration: none; border-radius: 6px;
      cursor: pointer; transition: all 0.12s;
      &:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }
      &.danger { color: #F87171; &:hover { background: rgba(239,68,68,0.1); } }
    }
    .td-div { height: 1px; background: var(--border-light); margin: 0.25rem 0; }

    .content { flex: 1; overflow-y: auto; padding: 2rem; background: var(--main-bg); }
    .content::-webkit-scrollbar { width: 6px; }
    .content::-webkit-scrollbar-track { background: transparent; }
    .content::-webkit-scrollbar-thumb { background: var(--accent-blue-light); border-radius: 3px; }

    .notif-wrapper { position: relative; }
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
        background: var(--accent-red); border: 2px solid var(--sidebar-bg);
      }
    }

    .notif-dropdown {
      position: absolute; top: calc(100% + 10px); right: 0; width: 340px;
      background: var(--bg-secondary); border: 1px solid var(--border);
      border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      z-index: 500; overflow: hidden;
      .notif-header {
        display: flex; align-items: center; gap: 8px; padding: 16px 16px 12px;
        border-bottom: 1px solid var(--border);
        .notif-title { font-size: 14px; font-weight: 700; color: var(--text-primary); flex: 1; }
        .notif-count { font-size: 11px; font-weight: 600; background: var(--accent-blue-light); color: var(--accent-blue); padding: 2px 8px; border-radius: 20px; }
        .mark-all-btn { font-size: 12px; color: var(--accent-blue); background: none; border: none; cursor: pointer; padding: 0; &:hover { text-decoration: underline; } }
      }
      .notif-list { max-height: 320px; overflow-y: auto; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
      .notif-item {
        display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px;
        cursor: pointer; transition: background 0.15s; border-bottom: 1px solid var(--border);
        position: relative;
        &:last-child { border-bottom: none; }
        &:hover { background: var(--bg-hover); }
        &.unread { background: rgba(59,130,246,0.05); }
      }
      .notif-icon-wrap {
        width: 34px; height: 34px; border-radius: 8px;
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        svg { width: 15px; height: 15px; }
        &.notif-icon-price_drop { background: rgba(16,185,129,0.1); svg { color: #10B981; } }
        &.notif-icon-alert_close { background: rgba(245,158,11,0.1); svg { color: #F59E0B; } }
      }
      .notif-body { flex: 1; min-width: 0; .notif-message { font-size: 13px; color: var(--text-primary); line-height: 1.4; margin: 0 0 4px; } .notif-time { font-size: 11px; color: var(--text-muted); } }
      .unread-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-blue); flex-shrink: 0; margin-top: 4px; }
      .notif-footer { padding: 12px 16px; text-align: center; font-size: 13px; font-weight: 500; color: var(--accent-blue); cursor: pointer; border-top: 1px solid var(--border); transition: background 0.15s; &:hover { background: var(--bg-hover); } }
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
  `]
})
export class ResellerDashboardComponent implements OnInit {
  authService = inject(AuthService);
  public router = inject(Router);
  private route = inject(ActivatedRoute);
  private analyticsApi = inject(AnalyticsApiService);
  private notifService = inject(NotificationsService);
  private resellerService = inject(ResellerService);
  private destroyRef = inject(DestroyRef);
  isUserMenuOpen = false;
  sidebarCollapsed = false;
  topbarSearch = '';
  showSuggestions = false;
  showNotifications = false;
  suggestions: { id: string; name: string; category: string; image: string }[] = [];
  private searchSubject = new Subject<string>();

  notifications: { id: string; type: string; message: string; time: string; read: boolean }[] = [];
  unreadCount = 0;
  catalogCount = 0;
  alertCount = 0;

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  markAllRead() {
    this.notifService.markAllRead().subscribe({
      next: () => this.loadSidebarData(),
      error: (err) => alert(err.error?.detail || 'Failed to mark all read')
    });
  }

  markRead(id: string) {
    this.notifService.markAsRead(id).subscribe({
      next: () => this.loadSidebarData(),
      error: (err) => alert(err.error?.detail || 'Failed to mark notification read')
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.notif-wrapper') && !target.closest('.topbar-avatar') && !target.closest('.topbar-search')) { // Added .topbar-avatar to close user menu
      this.showNotifications = false;
      this.isUserMenuOpen = false; // Close user menu as well
      this.showSuggestions = false;
    }
  }

  pageTitle$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    startWith(null),
    map(() => {
      let r = this.route.firstChild;
      while (r?.firstChild) r = r.firstChild;
      const s = r?.snapshot.url[0]?.path || '';
      const m: Record<string, string> = {
        catalog: 'Catalog Tracker', competitors: 'Competitor Scanner',
        alerts: 'Pricing Alerts', analytics: 'Analytics', settings: 'Settings'
      };
      return m[s] || 'Reseller Overview';
    })
  );

  ngOnInit() {
    this.resellerService.sidebarRefresh$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.loadSidebarData());

    this.loadSidebarData();
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.loadSidebarData());
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => {
        if (!q || q.length < 2) {
          this.suggestions = [];
          return of([]);
        }
        return this.analyticsApi.searchProducts(q).pipe(
          catchError(() => of([]))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(results => {
      this.suggestions = results.map(r => ({
        id: r.product_unified_id,
        name: r.product_name,
        category: r.product_category,
        image: r.product_image_url || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200'
      })).slice(0, 5);
      this.showSuggestions = true;
    });
  }

  onSearchInput() {
    this.searchSubject.next(this.topbarSearch);
  }

  onSearch() {
    if (this.topbarSearch.trim()) {
      this.showSuggestions = false;
      this.router.navigate(['/search'], { queryParams: { q: this.topbarSearch } });
    }
  }

  selectSuggestion(prod: any) {
    this.topbarSearch = prod.name;
    this.showSuggestions = false;
    this.router.navigate(['/product', prod.id]);
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/']);
    });
  }

  private loadSidebarData() {
    this.notifService.getNotifications().subscribe(notes => {
      this.notifications = notes.map(n => ({
        id: n.id,
        type: 'price_drop',
        message: `${n.product_name} dropped ${n.drop_percent?.toFixed(1)}% to $${n.new_price} on ${n.platform}`,
        time: this.formatDate(n.created_at),
        read: n.is_read,
      }));
    });
    this.notifService.getUnreadCount().subscribe(count => this.unreadCount = count);

    forkJoin({
      products: this.resellerService.getProducts().pipe(catchError(() => of([]))),
      alerts: this.resellerService.getAlerts().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ products, alerts }) => {
        this.catalogCount = products.length;
        const active = alerts.filter(a => a.is_active);
        this.alertCount = active.length;
      }
    });
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    return date.toLocaleDateString();
  }
}
