import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alerts-page" [@pageEnter]>
      <header class="page-header animate-in">
        <div class="header-info">
          <h1>Price Alerts</h1>
          <p>Set conditions. We watch 24/7 and notify you the moment it's right.</p>
        </div>
        <button class="create-alert-btn" (click)="toggleDrawer()">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
          Create alert
        </button>
      </header>

      <div class="filter-tabs animate-in">
        <button class="tab active">All</button>
        <button class="tab">Active</button>
        <button class="tab">Paused</button>
        <button class="tab">Triggered</button>
      </div>

      <div class="alerts-list">
        <div class="alert-card animate-in" *ngFor="let alert of alerts">
          <img [src]="alert.image" [alt]="alert.productName" class="alert-img">
          
          <div class="alert-info">
            <div class="alert-name">{{ alert.productName }}</div>
            <div class="alert-condition">Alert when price drops to {{ alert.targetPrice | currency }} on any store</div>
            <div class="alert-status" [class]="alert.status">
              {{ alert.status === 'triggered' ? 'TRIGGERED!' : alert.status | uppercase }}
            </div>
          </div>

          <div class="alert-progress-section">
            <div class="progress-labels">
              <span class="current-price">{{ alert.currentPrice | currency }}</span>
              <span class="target-price">{{ alert.targetPrice | currency }}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" 
                   [style.width.%]="alert.progress"
                   [style.background]="getProgressColor(alert.progress)"
                   [style.box-shadow]="alert.progress > 85 ? '0 0 8px rgba(16,185,129,0.4)' : 'none'"></div>
            </div>
            <div class="progress-pct">{{ alert.progress }}% there</div>
          </div>

          <div class="alert-controls">
            <div class="toggle-switch" [class.on]="alert.status === 'active'" [class.off]="alert.status !== 'active'" (click)="toggleStatus(alert)">
              <div class="knob" [class.on]="alert.status === 'active'" [class.off]="alert.status !== 'active'"></div>
            </div>
            <button class="icon-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </button>
            <button class="icon-btn trash">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Drawer Overlay -->
      <div class="drawer-overlay" *ngIf="showDrawer" (click)="toggleDrawer()"></div>

      <!-- Create Alert Drawer -->
      <aside class="alert-drawer" [class.open]="showDrawer">
        <header class="drawer-header">
          <h3>Set alert conditions</h3>
          <button class="close-btn" (click)="toggleDrawer()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </header>

        <div class="drawer-content">
          <div class="drawer-section">
            <label>1. Pick from tracked products</label>
            <select class="drawer-input">
              <option *ngFor="let p of trackedProducts">{{ p.name }}</option>
            </select>
          </div>

          <div class="mode-tabs">
            <div class="mode-tab active">Simple</div>
            <div class="mode-tab">Advanced</div>
          </div>

          <div class="condition-cards">
            <div class="condition-card active">
              <div class="cond-icon">📉</div>
              <div class="cond-label">Drop to price</div>
              <div class="cond-desc">Alert at specific value</div>
            </div>
            <div class="condition-card">
              <div class="cond-icon">%</div>
              <div class="cond-label">Drop by %</div>
              <div class="cond-desc">Relative decrease</div>
            </div>
          </div>

          <div class="drawer-section">
            <label>Target Price</label>
            <input type="number" value="800" class="drawer-input">
          </div>

          <div class="preview-sentence">
            "We'll alert you when iPhone 15 Pro drops to $800 on any store via email."
          </div>

          <button class="drawer-submit">Create alert</button>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .alerts-page { display: flex; flex-direction: column; gap: 32px; max-width: 1400px; margin: 0 auto; }

    .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .header-info h1 { font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 0; letter-spacing: -0.01em; }
    .header-info p { font-size: 14px; color: var(--text-secondary); margin-top: 6px; }

    .create-alert-btn {
      height: 40px; padding: 0 20px;
      background: var(--accent-blue); color: white;
      border: none; border-radius: 10px;
      font-size: 14px; font-weight: 700;
      cursor: pointer; transition: all 0.2s;
      display: flex; align-items: center; gap: 8px;
    }
    .create-alert-btn svg { width: 16px; height: 16px; }
    .create-alert-btn:hover { opacity: 0.9; transform: translateY(-1px); }

    .filter-tabs {
      display: flex; gap: 0;
      border-bottom: 1px solid var(--border);
      margin-bottom: 8px;
    }
    .tab {
      padding: 12px 24px; font-size: 14px;
      font-weight: 600; color: var(--text-muted);
      cursor: pointer; border-bottom: 2px solid transparent;
      margin-bottom: -1px; transition: all 0.2s;
      background: none; border: none;
    }
    .tab.active { color: var(--accent-blue); border-bottom-color: var(--accent-blue); }
    .tab:hover:not(.active) { color: var(--text-primary); background: var(--bg-hover); }

    .alerts-list { display: flex; flex-direction: column; gap: 16px; }

    .alert-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 24px;
      box-shadow: var(--shadow-card);
      display: flex;
      align-items: center;
      gap: 24px;
      transition: all 0.2s;
    }
    .alert-card:hover { border-color: var(--border-mid); box-shadow: var(--shadow-hover); }

    .alert-img {
      width: 64px; height: 64px;
      border-radius: 12px; object-fit: cover;
      border: 1px solid var(--border); flex-shrink: 0;
      opacity: 0.9;
    }

    .alert-info { flex: 1; min-width: 0; }
    .alert-name { font-size: 15px; font-weight: 700; color: var(--text-primary); }
    .alert-condition { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

    .alert-status {
      font-size: 9px; font-weight: 800;
      text-transform: uppercase; letter-spacing: 0.08em;
      padding: 3px 10px; border-radius: 20px; margin-top: 8px;
      display: inline-block;
    }
    .alert-status.active { background: var(--accent-green-light); color: var(--accent-green); border: 1px solid var(--accent-green-light); }
    .alert-status.paused { background: var(--accent-amber-light); color: var(--accent-amber); border: 1px solid var(--accent-amber-light); }
    .alert-status.triggered { background: var(--accent-green-light); color: var(--accent-green); border: 1px solid var(--accent-green); }

    .alert-progress-section { flex: 1; margin: 0 32px; max-width: 300px; }
    .progress-labels { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; }
    .progress-labels .current-price { font-weight: 700; color: var(--text-primary); }
    .progress-labels .target-price { color: var(--accent-green); font-weight: 700; }

    .progress-track { height: 8px; background: var(--bg-elevated); border-radius: 100px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 100px; transition: all 1.2s ease-out; }
    .progress-pct { font-size: 11px; color: var(--text-muted); text-align: right; margin-top: 6px; font-weight: 600; }

    .alert-controls { display: flex; align-items: center; gap: 12px; }

    .toggle-switch {
      width: 40px; height: 22px;
      border-radius: 11px; position: relative;
      cursor: pointer; transition: background 0.2s;
      flex-shrink: 0;
    }
    .toggle-switch.on { background: var(--accent-blue); }
    .toggle-switch.off { background: var(--bg-elevated); }

    .knob {
      position: absolute; top: 3px;
      width: 16px; height: 16px;
      border-radius: 50%; background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      transition: left 0.2s;
    }
    .knob.on { left: 21px; }
    .knob.off { left: 3px; }

    .icon-btn {
      width: 36px; height: 36px; border-radius: 10px;
      background: var(--bg-secondary); border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.2s; color: var(--text-muted);
    }
    .icon-btn svg { width: 18px; height: 18px; color: currentColor; }
    .icon-btn:hover { border-color: var(--border-mid); background: var(--bg-hover); color: var(--text-primary); }
    .icon-btn.trash:hover { color: var(--accent-red); background: var(--accent-red-light); border-color: var(--accent-red); }

    .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; backdrop-filter: blur(4px); }

    .alert-drawer {
      position: fixed; top: 0; right: 0; bottom: 0;
      width: 460px; background: var(--bg-primary);
      border-left: 1px solid var(--border);
      box-shadow: -10px 0 50px rgba(0,0,0,0.5);
      z-index: 201; padding: 32px;
      overflow-y: auto;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
      display: flex; flex-direction: column;
      color: var(--text-primary);
    }
    .alert-drawer.open { transform: translateX(0); }

    .drawer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .drawer-header h3 { font-size: 20px; font-weight: 800; color: var(--text-primary); margin: 0; }
    .close-btn {
      width: 36px; height: 36px; border-radius: 10px;
      background: var(--bg-secondary); border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.2s; color: var(--text-muted);
    }
    .close-btn:hover { color: var(--text-primary); background: var(--bg-hover); }

    .drawer-content { display: flex; flex-direction: column; gap: 24px; }
    .drawer-section label { display: block; font-size: 13px; font-weight: 700; color: var(--text-secondary); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
    .drawer-input {
      width: 100%; height: 48px;
      border: 1px solid var(--border);
      border-radius: 12px; padding: 0 16px;
      font-size: 15px; color: var(--text-primary);
      outline: none; transition: all 0.2s;
      background: var(--bg-secondary);
    }
    .drawer-input:focus { border-color: var(--accent-blue); box-shadow: 0 0 0 3px var(--accent-blue-light); }

    .mode-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .mode-tab {
      height: 42px; border-radius: 10px; border: 1px solid var(--border);
      background: var(--bg-secondary); font-size: 14px; font-weight: 600; color: var(--text-muted);
      cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;
    }
    .mode-tab.active { background: var(--accent-blue-light); border-color: var(--accent-blue); color: var(--accent-blue); }

    .condition-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .condition-card {
      padding: 16px; border-radius: 14px; border: 1px solid var(--border);
      background: var(--bg-secondary); cursor: pointer; transition: all 0.2s;
    }
    .condition-card.active { background: var(--accent-blue-light); border-color: var(--accent-blue); }
    .cond-icon { font-size: 20px; margin-bottom: 8px; }
    .cond-label { font-size: 13px; font-weight: 700; color: var(--text-primary); }
    .cond-desc { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

    .preview-sentence {
      background: var(--accent-blue-light); border-left: 4px solid var(--accent-blue);
      border-radius: 4px 12px 12px 4px; padding: 16px;
      font-size: 14px; font-style: italic; color: var(--text-secondary); line-height: 1.6;
    }

    .drawer-submit {
      width: 100%; height: 52px;
      background: var(--accent-blue); color: white;
      border: none; border-radius: 12px;
      font-size: 15px; font-weight: 700;
      cursor: pointer; transition: all 0.2s;
      margin-top: 8px;
    }
    .drawer-submit:hover { opacity: 0.9; transform: translateY(-1px); }
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
export class AlertsComponent {
  showDrawer = false;

  alerts = [
    { productId: '1', productName: 'iPhone 15 Pro', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200', currentPrice: 854, targetPrice: 800, progress: 73, status: 'active' },
    { productId: '2', productName: 'MacBook Pro 14"', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200', currentPrice: 1879, targetPrice: 1800, progress: 85, status: 'active' },
    { productId: '4', productName: 'PS5 Console', image: 'https://images.unsplash.com/photo-1593118247619-e2d6f056869e?w=200', currentPrice: 449, targetPrice: 400, progress: 60, status: 'active' },
    { productId: '6', productName: 'RTX 4080 GPU', image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=200', currentPrice: 899, targetPrice: 850, progress: 100, status: 'triggered' }
  ];

  trackedProducts = [
    { name: 'iPhone 15 Pro' },
    { name: 'MacBook Pro 14"' },
    { name: 'Sony WH-1000XM5' }
  ];

  toggleDrawer() {
    this.showDrawer = !this.showDrawer;
  }

  toggleStatus(alert: any) {
    alert.status = alert.status === 'active' ? 'paused' : 'active';
  }

  getProgressColor(progress: number): string {
    if (progress > 85) return '#10B981';
    if (progress >= 60) return '#F59E0B';
    return '#3B82F6';
  }
}
