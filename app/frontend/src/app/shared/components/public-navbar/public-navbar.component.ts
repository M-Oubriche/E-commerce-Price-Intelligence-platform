import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../../core/services/auth.service';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { Observable } from 'rxjs';
import { PLATFORM_PRODUCT_LIBRARY } from '../../../core/constants/product-library';

@Component({
  selector: 'app-public-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule, ThemeToggleComponent],
  template: `
    <nav class="public-navbar" [class.scrolled]="isScrolled">
      <div class="nav-container">

        <!-- LEFT: Logo -->
        <a class="logo" routerLink="/">
          <span class="logo-pulse">Pulse</span><span class="logo-price">Price</span>
        </a>

        <!-- CENTER: Search -->
        <div class="nav-search" *ngIf="showSearch">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            id="navbar-search"
            type="text"
            [(ngModel)]="searchQuery"
            (input)="showSuggestions = true"
            (keyup.enter)="onSearch()"
            placeholder="Search any product..."
            autocomplete="off"
          >
          <span class="search-hint">Enter ↵</span>

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

        <!-- RIGHT: Actions -->
        <div class="nav-right">
          <div class="desktop-actions">
            <div class="nav-links">
              <a (click)="scrollToSection('categories')" class="nav-link-item">Categories</a>
              <a (click)="scrollToSection('features')" class="nav-link-item">Features</a>
              <a (click)="scrollToSection('how-it-works')" class="nav-link-item">How it Works</a>
              <a (click)="scrollToSection('business')" class="nav-link-item">Business</a>
              <a routerLink="/deals" class="deal-feed-link" routerLinkActive="active">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                Deal Feed
              </a>
            </div>

            <app-theme-toggle></app-theme-toggle>

            <!-- Guest state -->
            <ng-container *ngIf="!(currentUser$ | async)">
              <a class="btn-ghost" routerLink="/auth" [queryParams]="{mode: 'login'}">Log in</a>
              <a class="btn-primary" routerLink="/auth" [queryParams]="{mode: 'signup'}">Get started free</a>
            </ng-container>

            <!-- Logged-in state -->
            <ng-container *ngIf="currentUser$ | async as user">
              <div class="user-menu" (click)="toggleDropdown($event)">
                <div class="user-avatar">
                  {{ (user.name || '').substring(0, 1).toUpperCase() }}
                </div>
                <svg class="chevron" [class.open]="isDropdownOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                <div class="user-dropdown" [class.show]="isDropdownOpen">
                  <div class="dropdown-header">
                    <div class="dh-avatar">{{ (user.name || '').substring(0, 1).toUpperCase() }}</div>
                    <div class="dh-info">
                      <span class="dh-name">{{ user.name }}</span>
                      <span class="dh-role">{{ user.type === 'business' ? 'Business Account' : 'Shopper Account' }}</span>
                    </div>
                  </div>
                  <div class="dropdown-divider"></div>
                  <a (click)="goToDashboard(user); isDropdownOpen=false" class="dropdown-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    My Dashboard
                  </a>
                  <div class="dropdown-divider"></div>
                  <a (click)="logout(); isDropdownOpen=false" class="dropdown-item danger">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Log out
                  </a>
                </div>
              </div>
            </ng-container>
          </div>

          <!-- Mobile toggle -->
          <button class="mobile-toggle" (click)="toggleMobileMenu()" aria-label="Menu">
            <span class="hamburger" [class.open]="isMobileMenuOpen">
              <span></span><span></span><span></span>
            </span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Mobile Overlay -->
    <div class="mobile-overlay" [class.open]="isMobileMenuOpen" (click)="closeMobileMenu()"></div>
    <div class="mobile-drawer" [class.open]="isMobileMenuOpen">
      <div class="drawer-top">
        <a class="logo" routerLink="/" (click)="closeMobileMenu()">
          <span class="logo-pulse">Pulse</span><span class="logo-price">Price</span>
        </a>
        <button class="drawer-close" (click)="closeMobileMenu()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div class="drawer-search" *ngIf="showSearch">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" [(ngModel)]="searchQuery" (input)="showSuggestions = true" (keyup.enter)="onSearch(); closeMobileMenu()" placeholder="Search any product..." autocomplete="off">
        
        <!-- Mobile Suggestions -->
        <div class="drawer-suggestions" *ngIf="showSuggestions && filteredSuggestions.length > 0">
           <div class="suggestion-item" *ngFor="let prod of filteredSuggestions" (click)="selectSuggestion(prod); closeMobileMenu()">
              <div class="s-info">
                 <span class="s-name">{{ prod.name }}</span>
              </div>
           </div>
        </div>
      </div>

      <nav class="drawer-nav">
        <a (click)="scrollToSection('categories')" class="drawer-link">Categories</a>
        <a (click)="scrollToSection('features')" class="drawer-link">Features</a>
        <a (click)="scrollToSection('how-it-works')" class="drawer-link">How it Works</a>
        <a (click)="scrollToSection('business')" class="drawer-link">Business</a>
        <a routerLink="/deals" class="drawer-link" routerLinkActive="active" (click)="closeMobileMenu()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          Deal Feed
        </a>

        <ng-container *ngIf="currentUser$ | async as user">
          <a (click)="goToDashboard(user); closeMobileMenu()" class="drawer-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            My Dashboard
          </a>
          <a (click)="logout(); closeMobileMenu()" class="drawer-link danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Log out
          </a>
        </ng-container>
      </nav>

      <div class="drawer-footer" *ngIf="!(currentUser$ | async)">
        <a class="btn-ghost w-full" routerLink="/auth" [queryParams]="{mode: 'login'}" (click)="closeMobileMenu()">Log in</a>
        <a class="btn-primary w-full" routerLink="/auth" [queryParams]="{mode: 'signup'}" (click)="closeMobileMenu()">Get started free</a>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .public-navbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
      padding: 1.5rem 0;
      background: transparent;
      transition: all 0.3s ease;
      border-bottom: 1px solid transparent;
    }
    .public-navbar.scrolled {
      padding: 1rem 0;
      background: rgba(10, 15, 30, 0.8);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom-color: var(--border);
      box-shadow: 0 4px 24px rgba(0,0,0,0.2);
    }

    /* ── LIGHT MODE ── */
    :host-context(html.light-mode) .public-navbar {
      background: #FFFFFF;
      border-bottom: 1px solid #E8E6E0;
    }
    :host-context(html.light-mode) .public-navbar.scrolled {
      background: rgba(255,255,255,0.97) !important;
      border-bottom-color: #E8E6E0 !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06) !important;
    }
    :host-context(html.light-mode) .logo .logo-pulse { color: #1D3461 !important; }
    :host-context(html.light-mode) .logo .logo-price { color: #1C1C1E !important; }
    :host-context(html.light-mode) .nav-search input {
      background: #F5F4F0 !important;
      border-color: #E8E6E0 !important;
      color: #1C1C1E !important;
    }
    :host-context(html.light-mode) .nav-search input::placeholder { color: #9E9E9E !important; }
    :host-context(html.light-mode) .nav-search input:focus {
      background: #FFFFFF !important;
      border-color: #1D3461 !important;
      box-shadow: 0 0 0 3px rgba(29,52,97,0.1) !important;
    }
    :host-context(html.light-mode) .search-icon { color: #9E9E9E !important; opacity: 1 !important; }
    :host-context(html.light-mode) .search-hint { color: #9E9E9E !important; }
    :host-context(html.light-mode) .nav-link-item {
      color: #6B6B6B !important;
    }
    :host-context(html.light-mode) .nav-link-item:hover { color: #1C1C1E !important; }
    :host-context(html.light-mode) .deal-feed-link { color: #6B6B6B !important; }
    :host-context(html.light-mode) .deal-feed-link:hover { color: #1C1C1E !important; background: #F5F4F0 !important; }
    :host-context(html.light-mode) .deal-feed-link.active { color: #C17D0E !important; }
    :host-context(html.light-mode) .btn-ghost {
      color: #1C1C1E !important;
      border-color: #E8E6E0 !important;
      background: transparent !important;
    }
    :host-context(html.light-mode) .btn-ghost:hover { background: #F5F4F0 !important; border-color: #D4D0C8 !important; }
    :host-context(html.light-mode) .btn-primary {
      background: #1D3461 !important;
      color: #FFFFFF !important;
    }
    :host-context(html.light-mode) .btn-primary:hover { background: #162850 !important; }
    :host-context(html.light-mode) .user-menu:hover { background: #F5F4F0 !important; }
    :host-context(html.light-mode) .chevron { color: #6B6B6B !important; }
    :host-context(html.light-mode) .user-dropdown {
      background: #FFFFFF !important;
      border-color: #E8E6E0 !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1) !important;
    }
    :host-context(html.light-mode) .dh-name { color: #1C1C1E !important; }
    :host-context(html.light-mode) .dh-role { color: #6B6B6B !important; }
    :host-context(html.light-mode) .dropdown-divider { background: #E8E6E0 !important; }
    :host-context(html.light-mode) .dropdown-item { color: #6B6B6B !important; }
    :host-context(html.light-mode) .dropdown-item:hover { background: #F5F4F0 !important; color: #1C1C1E !important; }
    :host-context(html.light-mode) .hamburger span { background: #1C1C1E !important; }
    :host-context(html.light-mode) .mobile-drawer {
      background: #FFFFFF !important;
      border-left-color: #E8E6E0 !important;
    }
    :host-context(html.light-mode) .drawer-top { border-bottom-color: #E8E6E0 !important; }
    :host-context(html.light-mode) .drawer-close { color: #6B6B6B !important; }
    :host-context(html.light-mode) .drawer-search input {
      background: #F5F4F0 !important;
      border-color: #E8E6E0 !important;
      color: #1C1C1E !important;
    }
    :host-context(html.light-mode) .drawer-search input::placeholder { color: #9E9E9E !important; }
    :host-context(html.light-mode) .drawer-link { color: #6B6B6B !important; }
    :host-context(html.light-mode) .drawer-link:hover,
    :host-context(html.light-mode) .drawer-link.active {
      background: rgba(29,52,97,0.08) !important;
      color: #1D3461 !important;
    }
    :host-context(html.light-mode) .drawer-footer { border-top-color: #E8E6E0 !important; }

    .nav-container {
      max-width: 1440px; margin: 0 auto; padding: 0 2rem;
      display: flex; align-items: center; gap: 1.5rem;
    }

    /* Logo */
    .logo {
      display: flex; align-items: center;
      font-size: 1.35rem; font-weight: 900; text-decoration: none;
      letter-spacing: -0.03em; flex-shrink: 0;
      .logo-pulse { color: var(--accent-blue); }
      .logo-price { color: var(--text-primary, #fff); }
    }

    /* Search */
    .nav-search {
      flex: 1; max-width: 400px; margin: 0 auto;
      position: relative; display: flex; align-items: center;
      @media (max-width: 1200px) { display: none; }
    }
    .search-icon {
      position: absolute; left: 14px; width: 17px; height: 17px;
      color: var(--text-secondary); opacity: 0.5; pointer-events: none;
    }
    .nav-search input {
      width: 100%; height: 38px;
      padding: 0 3.5rem 0 2.75rem;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 100px; .logo-pulse { color: var(--accent-blue); }
      .logo-price { color: #fff; } font-size: 0.85rem;
      transition: all 0.2s;
      &::placeholder { color: var(--text-muted); }
      &:focus {
        outline: none;
        background: var(--bg-hover);
        border-color: var(--accent-blue);
        box-shadow: 0 0 0 3px var(--accent-blue-light);
      }
    }
    .search-hint {
      position: absolute; right: 14px;
      font-size: 0.65rem; color: var(--text-muted);
      pointer-events: none; white-space: nowrap;
    }

    /* Right Side */
    .nav-right { margin-left: auto; display: flex; align-items: center; gap: 0.75rem; }

    .desktop-actions {
      display: flex; align-items: center; gap: 1.5rem;
      @media (max-width: 768px) { display: none; }
    }

    .nav-links {
      display: flex; align-items: center; gap: 1.25rem;
      @media (max-width: 1100px) { display: none; }
    }
    .nav-link-item {
      color: var(--text-secondary); text-decoration: none;
      font-size: 0.85rem; font-weight: 600; cursor: pointer;
      transition: color 0.2s;
      &:hover { .logo-pulse { color: var(--accent-blue); }
      .logo-price { color: #fff; } }
    }

    .deal-feed-link {
      display: flex; align-items: center; gap: 0.4rem;
      color: var(--text-secondary); text-decoration: none;
      font-size: 0.85rem; font-weight: 600; padding: 0.4rem 0.75rem;
      border-radius: 100px; transition: all 0.2s;
      svg { width: 15px; height: 15px; color: var(--accent-amber); }
      &:hover { .logo-pulse { color: var(--accent-blue); }
      .logo-price { color: #fff; } background: var(--bg-hover); }
      &.active { color: var(--accent-amber); }
    }

    .btn-ghost {
      display: inline-flex; align-items: center;
      padding: 0.4rem 1rem;
      background: transparent; border: 1px solid var(--border-mid);
      .logo-pulse { color: var(--accent-blue); }
      .logo-price { color: #fff; } font-size: 0.85rem; font-weight: 600;
      border-radius: 100px; cursor: pointer; text-decoration: none;
      transition: all 0.2s;
      &:hover { border-color: var(--text-secondary); background: var(--bg-hover); }
    }

    .btn-primary {
      display: inline-flex; align-items: center;
      padding: 0.45rem 1.1rem;
      background: var(--accent-blue); color: #fff;
      font-size: 0.85rem; font-weight: 600;
      border-radius: 100px; cursor: pointer; text-decoration: none;
      border: none; transition: all 0.2s;
      &:hover { background: var(--accent-blue); filter: brightness(1.1); box-shadow: 0 0 15px var(--accent-blue-light); }
    }

    /* User Menu */
    .user-menu {
      position: relative; display: flex; align-items: center; gap: 0.35rem;
      cursor: pointer; padding: 0.35rem 0.5rem;
      border-radius: 100px; transition: background 0.2s;
      &:hover { background: var(--bg-hover); }
    }
    .user-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%);
      color: #fff; font-weight: 700; font-size: 0.75rem;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid var(--border);
      flex-shrink: 0;
    }
    .chevron {
      width: 14px; height: 14px; color: var(--text-secondary);
      transition: transform 0.2s;
      &.open { transform: rotate(180deg); }
    }

    /* Dropdown */
    .user-dropdown {
      position: absolute; top: calc(100% + 10px); right: 0;
      min-width: 230px;
      background: var(--bg-secondary); border: 1px solid var(--border);
      border-radius: 14px; padding: 0.5rem;
      box-shadow: var(--shadow-hover);
      opacity: 0; visibility: hidden; transform: translateY(8px) scale(0.97);
      transition: all 0.18s cubic-bezier(0.16,1,0.3,1);
      z-index: 1000;
      &.show { opacity: 1; visibility: visible; transform: translateY(0) scale(1); }
    }
    .dropdown-header {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem;
      .dh-avatar {
        width: 36px; height: 36px; border-radius: 50%;
        background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
        color: #fff; font-weight: 700; font-size: 0.85rem;
        display: flex; align-items: center; justify-content: center;
      }
      .dh-info { display: flex; flex-direction: column; }
      .dh-name { font-size: 0.9rem; font-weight: 600; .logo-pulse { color: var(--accent-blue); }
      .logo-price { color: #fff; } }
      .dh-role { font-size: 0.75rem; color: var(--text-secondary); }
    }
    .dropdown-divider { height: 1px; background: var(--border); margin: 0.25rem 0; }
    .dropdown-item {
      display: flex; align-items: center; gap: 0.65rem;
      padding: 0.7rem 0.75rem; border-radius: 8px;
      color: var(--text-secondary); font-size: 0.875rem; font-weight: 500;
      text-decoration: none; cursor: pointer; transition: all 0.15s;
      svg { width: 15px; height: 15px; flex-shrink: 0; }
      &:hover { background: var(--bg-hover); .logo-pulse { color: var(--accent-blue); }
      .logo-price { color: #fff; } }
      &.danger { color: var(--accent-red);
        &:hover { background: var(--accent-red-light); color: var(--accent-red); }
      }
    }

    /* Mobile Toggle */
    .mobile-toggle {
      display: none; background: none; border: none; cursor: pointer; padding: 0.5rem;
      @media (max-width: 768px) { display: flex; align-items: center; justify-content: center; }
    }
    .hamburger {
      display: flex; flex-direction: column; gap: 5px; width: 22px;
      span {
        display: block; height: 2px; background: var(--text-primary);
        border-radius: 2px; transition: all 0.3s;
        &:nth-child(1) { width: 22px; }
        &:nth-child(2) { width: 16px; }
        &:nth-child(3) { width: 22px; }
      }
      &.open span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); width: 22px; }
      &.open span:nth-child(2) { opacity: 0; transform: translateX(-10px); }
      &.open span:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }
    }

    /* Mobile Overlay & Drawer */
    .mobile-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.65); backdrop-filter: blur(6px);
      z-index: 1000; opacity: 0; transition: opacity 0.3s;
      &.open { opacity: 1; }
      @media (max-width: 768px) { display: block; pointer-events: none; }
      &.open { pointer-events: all; }
    }
    .mobile-drawer {
      position: fixed; top: 0; right: 0; bottom: 0; width: 300px;
      max-width: 85vw;
      background: var(--bg-secondary); border-left: 1px solid var(--border);
      z-index: 1001; display: flex; flex-direction: column;
      transform: translateX(100%); transition: transform 0.38s cubic-bezier(0.16,1,0.3,1);
      &.open { transform: translateX(0); }
    }
    .drawer-top {
      display: flex; align-items: center; justify-content: space-between; padding: 1.25rem;
      border-bottom: 1px solid var(--border);
    }
    .drawer-close {
      background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 0.5rem;
      svg { width: 20px; height: 20px; }
      &:hover { .logo-pulse { color: var(--accent-blue); }
      .logo-price { color: #fff; } }
    }
    .drawer-search {
      margin: 1rem 1.25rem; position: relative;
      svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 16px; color: var(--text-muted); }
      input {
        width: 100%; padding: 0.65rem 1rem 0.65rem 2.5rem;
        background: var(--bg-elevated); border: 1px solid var(--border);
        border-radius: 10px; .logo-pulse { color: var(--accent-blue); }
      .logo-price { color: #fff; } font-size: 0.9rem;
        &:focus { outline: none; border-color: var(--accent-blue); }
      }
    }
    .drawer-nav {
      flex: 1; display: flex; flex-direction: column; gap: 0.25rem; padding: 0 0.75rem; overflow-y: auto;
    }
    .drawer-link {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem;
      color: var(--text-secondary); font-size: 0.95rem; font-weight: 600;
      text-decoration: none; border-radius: 100px; transition: all 0.15s; cursor: pointer;
      svg { width: 18px; height: 18px; }
      &:hover, &.active { background: var(--accent-blue-light); color: var(--accent-blue); }
      &.danger { color: var(--accent-red); &:hover { background: var(--accent-red-light); color: var(--accent-red); } }
    }
    .drawer-footer {
      padding: 1.25rem; border-top: 1px solid var(--border);
      display: flex; flex-direction: column; gap: 0.75rem;
    }
    .w-full { width: 100%; justify-content: center; }

    /* Suggestions */
    .suggestions-dropdown {
      position: absolute; top: calc(100% + 8px); left: 0; right: 0; 
      background: rgba(15, 20, 35, 0.95); backdrop-filter: blur(12px);
      border: 1px solid var(--border); border-radius: 12px; z-index: 2000;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5); overflow: hidden;
    }
    .suggestion-item {
      padding: 10px 16px; display: flex; gap: 12px; align-items: center; cursor: pointer; transition: all 0.2s;
      &:hover { background: rgba(59, 130, 246, 0.1); }
      .s-img { width: 32px; height: 32px; border-radius: 6px; object-fit: cover; }
      .s-info { display: flex; flex-direction: column; }
      .s-name { font-size: 13px; font-weight: 600; color: #fff; }
      .s-cat { font-size: 10px; color: var(--text-muted); text-transform: uppercase; }
    }
    
    .drawer-suggestions {
      background: rgba(255,255,255,0.03); border-radius: 8px; margin-top: 4px;
      .suggestion-item { padding: 8px 12px; }
      .s-name { font-size: 14px; }
    }

    :host-context(html.light-mode) .suggestions-dropdown { background: #fff !important; }
    :host-context(html.light-mode) .s-name { color: #1c1c1e !important; }
  `]
})
export class PublicNavbarComponent implements OnInit {
  isScrolled = false;
  searchQuery = '';
  showSearch = true;
  isDropdownOpen = false;
  isMobileMenuOpen = false;
  showSuggestions = false;

  private authService = inject(AuthService);
  currentUser$ = this.authService.currentUser$;
  router = inject(Router);
  route = inject(ActivatedRoute);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.searchQuery = params['q'] || '';
      if (params['section']) {
        setTimeout(() => this.scrollToSection(params['section']), 100);
      }
    });
    this.router.events.subscribe(() => {
      this.closeMobileMenu();
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 20;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest('.user-menu')) {
      this.isDropdownOpen = false;
    }
  }

  onSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], { queryParams: { q: this.searchQuery } });
    }
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  toggleMobileMenu() { this.isMobileMenuOpen = !this.isMobileMenuOpen; }
  closeMobileMenu() { this.isMobileMenuOpen = false; }

  goToDashboard(user: User) {
    this.router.navigate([user.type === 'business' ? '/business' : '/dashboard']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
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

  scrollToSection(sectionId: string) {
    this.closeMobileMenu();
    if (this.router.url.split('?')[0] === '/') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      this.router.navigate(['/'], { queryParams: { section: sectionId } });
    }
  }
}
