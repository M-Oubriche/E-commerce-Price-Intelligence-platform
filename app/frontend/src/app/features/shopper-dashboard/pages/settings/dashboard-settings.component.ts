import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="settings-page" [@pageEnter] *ngIf="authService.currentUser$ | async as user">
      <header class="page-header animate-in">
        <h1>Settings</h1>
        <p>Manage your profile, preferences, and account security.</p>
      </header>

      <div class="settings-container">
        <!-- Profile Section -->
        <section class="settings-section animate-in">
          <h2 class="section-title">Profile</h2>
          <div class="profile-layout">
            <div class="avatar-col">
              <div class="avatar-circle">
                {{ (user.name || '').charAt(0).toUpperCase() }}
              </div>
              <div class="color-swatches">
                <div class="swatch" 
                     *ngFor="let color of colors" 
                     [style.background]="color"
                     [class.selected]="(user.avatarColor || selectedColor) === color"
                     (click)="updateColor(color)">
                </div>
              </div>
            </div>
            <div class="form-col">
              <div class="form-group">
                <label>Display Name</label>
                <input type="text" [value]="user.name" #nameInput>
              </div>
              <div class="form-group">
                <label>Email Address</label>
                <input type="email" [value]="user.email" #emailInput>
              </div>
              <button class="save-btn" (click)="saveChanges(nameInput.value, emailInput.value)">Save changes</button>
            </div>
          </div>
        </section>

        <!-- Interests Section -->
        <section class="settings-section animate-in">
          <h2 class="section-title">Your Interests</h2>
          <div class="category-grid">
            <div class="cat-card" *ngFor="let cat of categories" 
                 [class.selected]="cat.selected"
                 (click)="cat.selected = !cat.selected">
              <div class="cat-icon">{{ cat.icon }}</div>
              <div class="cat-name">{{ cat.name }}</div>
            </div>
          </div>
        </section>

        <!-- Notifications Section -->
        <section class="settings-section animate-in">
          <h2 class="section-title">Notifications</h2>
          <div class="toggle-list">
            <div class="toggle-row" *ngFor="let opt of notifOptions">
              <div class="toggle-info">
                <div class="toggle-label">{{ opt.label }}</div>
                <div class="toggle-desc">{{ opt.desc }}</div>
              </div>
              <div class="toggle" [class.on]="opt.enabled" [class.off]="!opt.enabled" (click)="opt.enabled = !opt.enabled">
                <div class="knob" [class.on]="opt.enabled" [class.off]="!opt.enabled"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Account Section -->
        <section class="settings-section animate-in">
          <h2 class="section-title">Account</h2>
          <div class="account-row">
            <div class="account-label">Account Type</div>
            <div class="account-badge">Shopper</div>
            <a class="switch-link">Switch to Business →</a>
          </div>
        </section>

        <!-- Danger Zone -->
        <section class="settings-section danger animate-in">
          <h2 class="section-title">Danger Zone</h2>
          <div class="danger-box">
            <div class="danger-info">
              <div class="danger-label">Delete account</div>
              <div class="danger-desc">Once you delete your account, there is no going back. Please be certain.</div>
            </div>
            <button class="danger-btn">Delete account</button>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; max-width: 800px; margin: 0 auto; }

    .settings-page {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .page-header h1 { font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 0; letter-spacing: -0.01em; }
    .page-header p { font-size: 14px; color: var(--text-secondary); margin: 6px 0 0; }

    .settings-section {
      background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 24px; padding: 32px;
      box-shadow: var(--panel-shadow); margin-bottom: 24px;
    }

    .section-title {
      font-size: 16px; font-weight: 700; color: var(--text-primary);
      padding-bottom: 16px; border-bottom: 1px solid var(--border); margin-bottom: 24px;
    }

    .settings-section.danger { border-color: rgba(239,68,68,0.2); background: rgba(239,68,68,0.02); }
    .settings-section.danger .section-title { color: #EF4444; border-bottom-color: rgba(239,68,68,0.1); }

    .profile-layout {
      display: flex; gap: 40px; align-items: flex-start;
    }

    .avatar-col { display: flex; flex-direction: column; align-items: center; gap: 16px; flex-shrink: 0; }
    .avatar-circle {
      width: 80px; height: 80px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; font-weight: 800; color: white;
      transition: all 0.3s ease;
      box-shadow: 0 0 20px rgba(0,0,0,0.2);
      background: linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%);
    }
    .color-swatches { display: flex; gap: 8px; }
    .swatch {
      width: 24px; height: 24px; border-radius: 50%; cursor: pointer; transition: all 0.2s;
      border: 2px solid transparent;
    }
    .swatch:hover { transform: scale(1.15); }
    .swatch.selected { border-color: white; box-shadow: 0 0 0 2px #3B82F6; }

    .form-col { flex: 1; display: flex; flex-direction: column; gap: 20px; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-group label { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
    .form-group input {
      height: 48px; border: 1px solid var(--border); border-radius: 12px;
      padding: 0 16px; font-size: 15px; color: var(--text-primary);
      background: var(--bg-primary); outline: none; transition: all 0.2s;
    }
    .form-group input:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12); }

    .save-btn {
      align-self: flex-end; height: 42px; padding: 0 24px;
      background: #3B82F6; color: white; border: none;
      border-radius: 10px; font-size: 14px; font-weight: 700;
      cursor: pointer; transition: all 0.2s;
    }
    .save-btn:hover { background: #2563EB; transform: translateY(-1px); }

    .toggle-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 0; border-bottom: 1px solid var(--border);
    }
    .toggle-row:last-child { border-bottom: none; }

    .toggle-label { font-size: 15px; font-weight: 600; color: var(--text-primary); }
    .toggle-desc { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

    .toggle {
      width: 44px; height: 24px; border-radius: 12px;
      position: relative; cursor: pointer; transition: background 0.2s; flex-shrink: 0;
    }
    .toggle.on { background: #3B82F6; }
    .toggle.off { background: var(--bg-elevated); }
    .knob {
      position: absolute; top: 4px; width: 16px; height: 16px;
      border-radius: 50%; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.3); transition: left 0.2s;
    }
    .knob.on { left: 24px; }
    .knob.off { left: 4px; }

    .category-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
    }
    .cat-card {
      padding: 16px 12px; border-radius: 14px; border: 1px solid var(--border);
      background: var(--bg-secondary); text-align: center; cursor: pointer; transition: all 0.2s;
    }
    .cat-icon { font-size: 24px; margin-bottom: 8px; }
    .cat-name { font-size: 12px; font-weight: 700; color: var(--text-secondary); }
    .cat-card.selected { background: rgba(59, 130, 246, 0.1); border-color: #3B82F6; }
    .cat-card.selected .cat-name { color: #3B82F6; }
    .cat-card:hover:not(.selected) { border-color: var(--border-mid); background: var(--bg-hover); }

    .account-row {
      display: flex; align-items: center; justify-content: space-between; padding: 8px 0;
    }
    .account-label { font-size: 15px; font-weight: 600; color: var(--text-primary); }
    .account-badge {
      font-size: 11px; font-weight: 800; padding: 4px 12px;
      border-radius: 20px; background: rgba(59, 130, 246, 0.1); color: #3B82F6;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .switch-link { font-size: 14px; font-weight: 600; color: #3B82F6; cursor: pointer; text-decoration: none; }
    .switch-link:hover { text-decoration: underline; }

    .danger-box { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
    .danger-label { font-size: 15px; font-weight: 700; color: var(--text-primary); }
    .danger-desc { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
    .danger-btn {
      height: 40px; padding: 0 20px; background: transparent;
      color: #EF4444; border: 1px solid #EF4444;
      border-radius: 10px; font-size: 14px; font-weight: 700;
      cursor: pointer; transition: all 0.2s; flex-shrink: 0;
    }
    .danger-btn:hover { background: #EF4444; color: white; }

    @media (max-width: 600px) {
      .profile-layout { flex-direction: column; align-items: center; }
      .category-grid { grid-template-columns: 1fr 1fr; }
      .danger-box { flex-direction: column; align-items: flex-start; }
    }
  `]
,
  animations: [
    trigger('pageEnter', [
      transition(':enter', [
        query('.animate-in', [
          style({ opacity: 0, transform: 'translateY(16px)' }),
          stagger(50, [
            animate('280ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class DashboardSettingsComponent {
  authService = inject(AuthService);
  colors = ['#4F8EF7', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#333333'];
  selectedColor = this.colors[0];

  categories = [
    { name: 'Smartphones', icon: '📱', selected: true },
    { name: 'Laptops', icon: '💻', selected: true },
    { name: 'Monitors', icon: '🖥️', selected: false },
    { name: 'Headphones', icon: '🎧', selected: true },
    { name: 'Périphériques', icon: '📷', selected: false },
    { name: 'Gaming', icon: '🎮', selected: true },
    { name: 'Tablets', icon: '📟', selected: false },
    { name: 'Components', icon: '🔌', selected: false }
  ];

  notifOptions = [
    { label: 'Email alerts', desc: 'Get notified via email when prices hit your target.', enabled: true },
    { label: 'In-app notifications', desc: 'See alerts in your dashboard notification center.', enabled: true },
    { label: 'Weekly price summary', desc: 'A digest of price movements for your tracked products.', enabled: false },
    { label: 'Price movement summary', desc: 'Get notified about general market trends.', enabled: false }
  ];

  updateColor(color: string) {
    this.selectedColor = color;
    this.authService.updateUser({ avatarColor: color });
  }

  saveChanges(name: string, email: string) {
    this.authService.updateUser({ name, email });
  }
}
