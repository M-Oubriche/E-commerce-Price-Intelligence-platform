import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastComponent } from '../../shared/components/toast/toast.component';

@Component({
  selector: 'app-seller-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
  template: `
    <div class="app-shell">
      <aside class="sidebar border-outline">
        <div class="sidebar-header border-bottom">
          <span class="type-label">PulsePrice</span>
          <span class="type-pill">SELLER</span>
        </div>
        
        <nav class="sidebar-nav">
          <a routerLink="dashboard" routerLinkActive="active" class="nav-link">
            <span class="indicator"></span>
            <span class="type-body">Performance</span>
          </a>
          <a routerLink="inventory" routerLinkActive="active" class="nav-link">
            <span class="indicator"></span>
            <span class="type-body">Inventory</span>
          </a>
        </nav>

        <div class="sidebar-footer border-top">
          <div class="user-info">
            <span class="type-label">{{ user?.name }}</span>
            <span class="type-body">{{ user?.organization }}</span>
          </div>
          <button (click)="logout()" class="logout-btn">
             <span class="type-label">Exit</span>
          </button>
        </div>
      </aside>

      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
      <app-toast></app-toast>
    </div>
  `,
  styles: [`
    @import 'src/app/styles/variables';

    .app-shell {
      display: flex;
      height: 100vh;
      background: $color-bg-base;
    }

    .sidebar {
      width: 240px;
      display: flex;
      flex-direction: column;
      border-top: none;
      border-left: none;
      border-bottom: none;
    }

    .sidebar-header {
      padding: $space-xl;
      display: flex;
      align-items: center;
      justify-content: space-between;

      .type-pill {
        font-size: 10px;
        font-weight: 600;
        background: rgba($color-seller-accent, 0.1);
        color: $color-seller-accent;
        padding: 2px 6px;
      }
    }

    .sidebar-nav {
      flex: 1;
      padding: $space-xl 0;
    }

    .nav-link {
      display: flex;
      align-items: center;
      padding: $space-md $space-xl;
      color: $color-text-secondary;
      text-decoration: none;
      position: relative;
      transition: $transition-snappy;

      .indicator {
        position: absolute;
        left: 0;
        width: 3px;
        height: 0;
        background: $color-accent;
        transition: $transition-snappy;
      }

      &:hover {
        color: $color-text-primary;
      }

      &.active {
        color: $color-text-primary;
        .indicator {
          height: 100%;
        }
      }
    }

    .sidebar-footer {
      padding: $space-xl;
      border-top: $border-width $border-style $color-border-neutral;
      display: flex;
      align-items: center;
      justify-content: space-between;

      .user-info {
        display: flex;
        flex-direction: column;
        span { font-size: 11px; }
      }

      .logout-btn {
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        color: $color-text-tertiary;
        &:hover { color: #ef4444; }
      }
    }

    .main-content {
      flex: 1;
      overflow-y: auto;
      padding: $space-3xl;
    }
  `]
})
export class SellerLayoutComponent implements OnInit {
  user = this.authService.currentUser;

  constructor(
    private authService: AuthService, 
    private themeService: ThemeService,
    private router: Router
  ) {}

  ngOnInit() {
    this.themeService.setRoleTheme('SELLER');
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
