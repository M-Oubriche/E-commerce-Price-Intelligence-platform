import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { Router, RouterLink, ActivatedRoute, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../../core/services/auth.service';
import { Observable } from 'rxjs';
import { PLATFORM_PRODUCT_LIBRARY } from '../../../core/constants/product-library';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  template: `
    <nav class="navbar" [class.scrolled]="isScrolled">
      <div class="container">
        <div class="nav-left">
          <div class="logo" routerLink="/">
            <span class="pulse">Pulse</span><span class="price">Price</span>
          </div>
        </div>

        <div class="nav-center">
          <div class="search-input-wrapper">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" [(ngModel)]="searchQuery" (input)="showSuggestions = true" (keyup.enter)="onSearch()" placeholder="Search electronics..." autocomplete="off">
            
            <!-- Suggestions -->
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
          <div class="nav-links">
            <a routerLink="/deals" class="nav-item" routerLinkActive="active">Deal Feed</a>
            <a (click)="scrollToSection('categories')" class="nav-item">Categories</a>
            <a (click)="scrollToSection('features')" class="nav-item">Features</a>
            <a (click)="scrollToSection('how-it-works')" class="nav-item">How it Works</a>
            <a (click)="scrollToSection('business')" class="nav-item">Business</a>
          </div>
        </div>

        <div class="nav-right">
          <ng-container *ngIf="!(currentUser$ | async)">
            <button class="btn-text" routerLink="/auth" [queryParams]="{mode: 'login'}">Log in</button>
            <button class="btn-primary" routerLink="/auth" [queryParams]="{mode: 'signup'}">Get started free</button>
          </ng-container>
          
          <ng-container *ngIf="currentUser$ | async as user">
            <div class="user-profile" routerLink="/dashboard">
              <div class="avatar">{{ user.name.substring(0, 1) }}</div>
              <span class="user-name">{{ user.name }}</span>
            </div>
          </ng-container>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
      padding: 1.25rem 0; transition: all 0.3s ease;
      background: transparent;
    }
    .navbar.scrolled {
      padding: 0.75rem 0; background: rgba(10, 15, 30, 0.8);
      backdrop-filter: blur(12px); border-bottom: 1px solid #1E293B;
    }
    .container {
      max-width: 1400px; margin: 0 auto; padding: 0 1.5rem;
      display: flex; justify-content: space-between; align-items: center;
    }
    .logo {
      font-size: 1.5rem; font-weight: 800; cursor: pointer;
      .pulse { color: #3B82F6; }
      .price { color: #FFF; }
    }
    .nav-center {
      display: flex; align-items: center; gap: 2rem; flex: 1; justify-content: center;
      @media (max-width: 991px) { display: none; }
    }
    .search-input-wrapper {
      position: relative; width: 220px;
      .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.4); }
      input {
        width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
        padding: 0.6rem 1rem 0.6rem 2.5rem; border-radius: 100px; color: #FFF; font-size: 0.9rem;
        transition: all 0.2s;
        &:focus { outline: none; border-color: #3B82F6; background: rgba(255,255,255,0.08); }
      }
    }
    .nav-links {
      display: flex; gap: 1rem;
      .nav-item { color: rgba(255,255,255,0.6); text-decoration: none; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: color 0.2s; &:hover { color: #FFF; } &.active { color: #3B82F6; } }
    }
    .nav-right { display: flex; gap: 1rem; align-items: center; }
    .btn-text { background: transparent; border: none; color: rgba(255,255,255,0.6); font-weight: 600; cursor: pointer; &:hover { color: #FFF; } }
    .btn-primary {
      background: linear-gradient(135deg, #3B82F6, #7C3AED); color: white; border: none;
      padding: 0.6rem 1.25rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer;
    }
    .user-profile {
      display: flex; align-items: center; gap: 0.75rem; cursor: pointer;
      .avatar { width: 32px; height: 32px; border-radius: 50%; background: #3B82F6; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #FFF; font-size: 0.8rem; }
      .user-name { font-size: 0.9rem; color: #FFF; font-weight: 500; @media (max-width: 1100px) { display: none; } }
    }

    /* Suggestions */
    .suggestions-dropdown {
      position: absolute; top: calc(100% + 10px); left: 0; right: -40px;
      background: rgba(10, 15, 30, 0.9); backdrop-filter: blur(16px);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 14px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.4); z-index: 1000; overflow: hidden;
    }
    .suggestion-item {
      padding: 10px 14px; display: flex; gap: 10px; align-items: center; cursor: pointer; transition: all 0.2s;
      &:hover { background: rgba(59, 130, 246, 0.15); }
      .s-img { width: 30px; height: 30px; border-radius: 6px; object-fit: cover; }
      .s-info { display: flex; flex-direction: column; }
      .s-name { font-size: 13px; font-weight: 600; color: #fff; line-height: 1.2; }
      .s-cat { font-size: 9px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; }
    }
  `]
})
export class NavbarComponent implements OnInit {
  isScrolled = false;
  searchQuery = '';
  showSuggestions = false;
  private authService = inject(AuthService);
  currentUser$: Observable<User | null> = this.authService.currentUser$;
  router = inject(Router);
  route = inject(ActivatedRoute);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.searchQuery = params['q'] || '';
      if (params['section']) {
        setTimeout(() => this.scrollToSection(params['section']), 100);
      }
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 50;
  }

  onSearch() {
    if (this.searchQuery.trim()) {
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

  scrollToSection(sectionId: string) {
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
