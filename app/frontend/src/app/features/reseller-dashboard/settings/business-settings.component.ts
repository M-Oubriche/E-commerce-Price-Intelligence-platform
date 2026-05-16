import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { PreferencesService, AlertPreferences, DisplayPreferences } from '../../../core/services/preferences.service';
import { Router } from '@angular/router';
import { UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-reseller-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-page" [@pageEnter] *ngIf="authService.currentUser$ | async as user">
      <header class="page-header animate-in">
        <h1>Reseller Settings</h1>
        <p>Configure your marketplace sync, pricing thresholds, and organization profile.</p>
      </header>

      <div class="settings-container">
        <!-- Business Profile Section -->
        <section class="settings-section animate-in">
          <h2 class="section-title">Organization Profile</h2>
          <div class="profile-layout">
            <div class="avatar-col">
              <div class="avatar-circle" [style.background]="getAvatarColor(user.email)">
                {{ user.initials || (user.full_name || '').charAt(0).toUpperCase() }}
              </div>
              <div class="role-badge">Admin</div>
            </div>
            <div class="form-col">
              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Organization Name</label>
                  <input type="text" [(ngModel)]="profileForm.full_name" #nameInput>
                </div>
                <div class="form-group flex-1">
                  <label>Registration ID</label>
                  <input type="text" value="TAX-9988-221" readonly class="readonly">
                </div>
              </div>
              <div class="form-group">
                <label>Billing Email</label>
                <input type="email" [(ngModel)]="profileForm.email" #emailInput>
              </div>
              <button class="save-btn" 
                      [disabled]="isSavingProfile"
                      (click)="saveChanges()">
                {{ isSavingProfile ? 'Updating...' : 'Update Profile' }}
              </button>
            </div>
          </div>
        </section>

        <!-- Marketplaces Section -->
        <section class="settings-section animate-in">
          <h2 class="section-title">Tracked Marketplaces</h2>
          <div class="loading-state" *ngIf="isLoadingDisplay">
            <div class="spinner"></div>
          </div>
          <div class="category-grid" *ngIf="!isLoadingDisplay">
            <div class="cat-card" *ngFor="let market of marketplaces" 
                 [class.selected]="market.enabled"
                 (click)="market.enabled = !market.enabled">
              <div class="cat-icon">{{ market.icon }}</div>
              <div class="cat-name">{{ market.name }}</div>
              <div class="cat-status" *ngIf="market.enabled">Active</div>
            </div>
          </div>
        </section>

        <!-- Pricing Synchronization Section -->
        <section class="settings-section animate-in">
          <h2 class="section-title">Pricing & Synchronization</h2>
          <div class="loading-state" *ngIf="isLoadingAlerts">
            <div class="spinner"></div>
          </div>
          <div class="toggle-list" *ngIf="!isLoadingAlerts && alertPrefs">
            <div class="toggle-row">
              <div class="toggle-info">
                <div class="toggle-label">Real-time Repricing</div>
                <div class="toggle-desc">Sync catalog prices instantly as market moves.</div>
              </div>
              <div class="toggle" [class.on]="alertPrefs.websocket_live" (click)="toggleAlert('websocket_live')">
                <div class="knob" [class.on]="alertPrefs.websocket_live"></div>
              </div>
            </div>
            <div class="toggle-row">
              <div class="toggle-info">
                <div class="toggle-label">Market Trend Reports</div>
                <div class="toggle-desc">Get weekly insights into market price movements.</div>
              </div>
              <div class="toggle" [class.on]="alertPrefs.market_trend_reports" (click)="toggleAlert('market_trend_reports')">
                <div class="knob" [class.on]="alertPrefs.market_trend_reports"></div>
              </div>
            </div>
            <div class="toggle-row">
              <div class="toggle-info">
                <div class="toggle-label">Email Notifications</div>
                <div class="toggle-desc">Receive critical price alerts via email.</div>
              </div>
              <div class="toggle" [class.on]="alertPrefs.email_notifications" (click)="toggleAlert('email_notifications')">
                <div class="knob" [class.on]="alertPrefs.email_notifications"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Account Section -->
        <section class="settings-section animate-in">
          <h2 class="section-title">Switch Mode</h2>
          <div class="account-row">
            <div class="account-label">Looking for personal shopping?</div>
            <a (click)="switchToClient()" class="switch-link">Switch to Client Dashboard →</a>
          </div>
        </section>

        <!-- Danger Zone -->
        <section class="settings-section danger animate-in">
          <h2 class="section-title">System Deactivation</h2>
          <div class="danger-box">
            <div class="danger-info">
              <div class="danger-label">Pause Monitoring</div>
              <div class="danger-desc">This will immediately stop all background tracking and market syncs.</div>
            </div>
            <button class="danger-btn" (click)="deleteAccount()">Deactivate Account</button>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; max-width: 900px; margin: 0 auto; animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .settings-page { display: flex; flex-direction: column; gap: 32px; padding: 12px 0; }

    .page-header h1 { font-size: 26px; font-weight: 850; color: var(--text-primary); margin: 0; letter-spacing: -0.02em; }
    .page-header p { font-size: 14px; color: var(--text-secondary); margin: 8px 0 0; line-height: 1.5; }

    .settings-section {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 24px; padding: 32px;
      box-shadow: var(--shadow-card); margin-bottom: 8px;
    }

    .section-title {
      font-size: 16px; font-weight: 800; color: var(--text-primary);
      padding-bottom: 20px; border-bottom: 1px solid var(--border); margin-bottom: 28px;
      text-transform: uppercase; letter-spacing: 0.05em;
    }

    .settings-section.danger { border-color: rgba(239,68,68,0.2); background: rgba(239,68,68,0.01); }
    .settings-section.danger .section-title { color: #EF4444; border-bottom-color: rgba(239,68,68,0.1); }

    .profile-layout { display: flex; gap: 48px; align-items: flex-start; }

    .avatar-col { display: flex; flex-direction: column; align-items: center; gap: 14px; flex-shrink: 0; }
    .avatar-circle {
      width: 96px; height: 96px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 32px; font-weight: 900; color: white;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
      box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);
    }
    .role-badge { font-size: 10px; font-weight: 900; color: var(--accent-blue); background: var(--accent-blue-light); padding: 4px 12px; border-radius: 20px; text-transform: uppercase; }

    .form-col { flex: 1; display: flex; flex-direction: column; gap: 24px; }
    .form-row { display: flex; gap: 20px; }
    .flex-1 { flex: 1; }
    .form-group { display: flex; flex-direction: column; gap: 10px; }
    .form-group label { font-size: 11px; font-weight: 850; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
    .form-group input {
      height: 52px; border: 1px solid var(--border); border-radius: 14px;
      padding: 0 20px; font-size: 16px; color: var(--text-primary);
      background: var(--bg-primary); outline: none; transition: all 0.2s;
    }
    .form-group input:focus { border-color: var(--accent-blue); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
    .form-group input.readonly { background: rgba(0,0,0,0.05); cursor: not-allowed; border-style: dashed; }

    .save-btn {
      align-self: flex-end; height: 46px; padding: 0 32px;
      background: var(--accent-blue); color: white; border: none;
      border-radius: 12px; font-size: 15px; font-weight: 700;
      cursor: pointer; transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
      box-shadow: 0 10px 20px -5px rgba(59, 130, 246, 0.3);
    }
    .save-btn:hover { transform: translateY(-2px); box-shadow: 0 15px 30px -5px rgba(59, 130, 246, 0.5); }
    .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .toggle-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 0; border-bottom: 1px solid var(--border);
    }
    .toggle-row:last-child { border-bottom: none; }
    .toggle-label { font-size: 16px; font-weight: 700; color: var(--text-primary); }
    .toggle-desc { font-size: 13px; color: var(--text-muted); margin-top: 6px; }

    .toggle {
      width: 48px; height: 26px; border-radius: 100px;
      position: relative; cursor: pointer; transition: background 0.3s;
      background: var(--bg-elevated);
    }
    .toggle.on { background: var(--accent-blue); }
    .knob {
      position: absolute; top: 4px; width: 18px; height: 18px;
      border-radius: 50%; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
      left: 4px;
    }
    .toggle.on .knob { left: 26px; }

    .category-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .cat-card {
      padding: 24px 16px; border-radius: 18px; border: 1px solid var(--border);
      background: var(--bg-primary); text-align: center; cursor: pointer; transition: all 0.3s ease;
      position: relative;
    }
    .cat-icon { font-size: 32px; margin-bottom: 12px; }
    .cat-name { font-size: 14px; font-weight: 800; color: var(--text-secondary); }
    .cat-status {
      position: absolute; top: 8px; right: 10px; font-size: 8px; font-weight: 900;
      text-transform: uppercase; color: #10B981;
    }
    .cat-card.selected { background: rgba(59, 130, 246, 0.05); border-color: var(--accent-blue); box-shadow: 0 8px 24px -10px rgba(59, 130, 246, 0.4); }
    .cat-card.selected .cat-name { color: var(--accent-blue); }

    .loading-state { text-align: center; padding: 20px 0; }
    .spinner {
      width: 24px; height: 24px; border: 2px solid var(--border);
      border-top-color: var(--accent-blue); border-radius: 50%;
      margin: 0 auto; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .account-row { display: flex; align-items: center; justify-content: space-between; }
    .account-label { font-size: 15px; font-weight: 700; color: var(--text-primary); }
    .switch-link { font-size: 14px; font-weight: 750; color: var(--accent-blue); cursor: pointer; text-decoration: none; border-bottom: 2px solid rgba(59, 130, 246, 0.2); transition: all 0.2s; }
    .switch-link:hover { border-bottom-color: var(--accent-blue); }

    .danger-box { display: flex; align-items: center; justify-content: space-between; gap: 32px; }
    .danger-label { font-size: 16px; font-weight: 800; color: var(--text-primary); }
    .danger-desc { font-size: 14px; color: var(--text-muted); margin-top: 6px; line-height: 1.5; }
    .danger-btn {
      height: 44px; padding: 0 24px; background: transparent;
      color: #EF4444; border: 1.5px solid #EF4444;
      border-radius: 12px; font-size: 14px; font-weight: 800;
      cursor: pointer; transition: all 0.2s; flex-shrink: 0;
    }
    .danger-btn:hover { background: #EF4444; color: white; }

    @media (max-width: 600px) {
      .profile-layout { flex-direction: column; align-items: center; gap: 32px; }
      .category-grid { grid-template-columns: 1fr 1fr; }
      .danger-box { flex-direction: column; align-items: flex-start; }
      .form-row { flex-direction: column; }
    }
  `]
,
  animations: [
    trigger('pageEnter', [
      transition(':enter', [
        query('.animate-in', [
          style({ opacity: 0, transform: 'translateY(24px)' }),
          stagger(60, [
            animate('400ms cubic-bezier(0.16,1,0.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class ResellerSettingsComponent implements OnInit {
  authService = inject(AuthService);
  private prefsService = inject(PreferencesService);
  private destroyRef = inject(DestroyRef);
  router = inject(Router);

  profileForm = {
    full_name: '',
    email: ''
  };

  alertPrefs: AlertPreferences | null = null;
  displayPrefs: DisplayPreferences | null = null;
  isLoadingAlerts = true;
  isLoadingDisplay = true;
  isSavingProfile = false;

  marketplaces = [
    { name: 'Amazon', icon: '📦', enabled: true },
    { name: 'Walmart', icon: '🛒', enabled: true },
    { name: 'Best Buy', icon: '🏷️', enabled: true },
    { name: 'eBay', icon: '💎', enabled: false }
  ];

  ngOnInit() {
    this.authService.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(user => {
      if (user) {
        this.profileForm.full_name = user.full_name;
        this.profileForm.email = user.email;
      }
    });

    this.loadData();
  }

  loadData() {
    this.isLoadingAlerts = true;
    this.isLoadingDisplay = true;

    this.prefsService.getAlertPreferences()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (prefs) => {
          this.alertPrefs = prefs;
          this.isLoadingAlerts = false;
        },
        error: () => this.isLoadingAlerts = false
      });

    this.prefsService.getDisplayPreferences()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (prefs) => {
          this.displayPrefs = prefs;
          this.isLoadingDisplay = false;
        },
        error: () => this.isLoadingDisplay = false
      });
  }

  getAvatarColor(email: string): string {
    const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const index = email ? email.charCodeAt(0) % colors.length : 0;
    return colors[index];
  }

  toggleAlert(key: keyof AlertPreferences) {
    if (!this.alertPrefs) return;
    const newValue = !this.alertPrefs[key];
    const oldVal = this.alertPrefs[key];
    (this.alertPrefs as any)[key] = newValue;

    this.prefsService.updateAlertPreferences({ [key]: newValue })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          if (this.alertPrefs) (this.alertPrefs as any)[key] = oldVal;
          alert('Failed to update preference.');
        }
      });
  }

  saveChanges() {
    this.isSavingProfile = true;

    const initials = this.profileForm.full_name
      ? this.profileForm.full_name.split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2)
      : '';

    this.authService.updateUser({
      full_name: this.profileForm.full_name,
      email: this.profileForm.email,
      initials: initials
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSavingProfile = false;
          alert('Organization profile updated!');
        },
        error: () => {
          this.isSavingProfile = false;
          alert('Failed to update profile.');
        }
      });
  }

  switchToClient() {
    if (confirm('Switch back to personal Shopper mode? Business features will be hidden.')) {
      this.authService.updateUser({ role: UserRole.CLIENT }).subscribe({
        next: () => {
          alert('Switched to Client mode.');
          this.router.navigate(['/dashboard']);
        },
        error: () => {
          alert('Failed to switch account type.');
        }
      });
    }
  }

  deleteAccount() {
    if (confirm('CRITICAL: Are you absolutely sure you want to deactivate and delete your organization account? All catalog data and competitor tracking will be permanently removed. This action CANNOT be undone.')) {
      this.authService.deleteAccount().subscribe({
        next: () => {
          alert('Your organization account has been permanently deleted.');
          this.router.navigate(['/']);
        },
        error: () => {
          alert('Failed to delete account. Please try again.');
        }
      });
    }
  }
}
