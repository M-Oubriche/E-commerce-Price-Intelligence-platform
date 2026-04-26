import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { Router } from '@angular/router';
import { PLATFORM_PRODUCT_LIBRARY } from '../../../core/constants/product-library';

@Component({
  selector: 'app-business-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="alerts-page" [@pageEnter]>
      <header class="page-header animate-in">
        <div class="header-info">
          <h1>Margin Alerts</h1>
          <p>Protect your profitability. We'll notify you when competitor pricing puts your targets at risk.</p>
        </div>
        <button class="create-alert-btn" (click)="toggleDrawer()">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Configure rule
        </button>
      </header>

      <div class="filter-tabs animate-in">
        <button class="tab" [class.active]="selectedFilter === 'All Alerts'" (click)="setFilter('All Alerts')">All Alerts</button>
        <button class="tab" [class.active]="selectedFilter === 'High Risk'" (click)="setFilter('High Risk')">High Risk</button>
        <button class="tab" [class.active]="selectedFilter === 'Healthy'" (click)="setFilter('Healthy')">Healthy</button>
        <button class="tab" [class.active]="selectedFilter === 'Paused'" (click)="setFilter('Paused')">Paused</button>
      </div>

      <div class="alerts-list">
        <div class="alert-card animate-in" *ngFor="let alert of filteredAlerts">
          <div class="product-visual">
            <img [src]="alert.image" [alt]="alert.productName" class="alert-img">
            <div class="risk-indicator" [class.high]="alert.risk === 'High'" [class.medium]="alert.risk === 'Medium'" [class.low]="alert.risk === 'Healthy'"></div>
          </div>
          
          <div class="alert-info">
            <div class="alert-name">{{ alert.productName }}</div>
            <div class="alert-condition">Target Margin: {{ alert.targetMargin }}% | Current: {{ alert.currentMargin }}%</div>
            <div class="alert-status" [class.high]="alert.risk === 'High'" [class.medium]="alert.risk === 'Medium'">
              {{ (alert.active ? alert.risk : 'PAUSED').toUpperCase() }} RISK
            </div>
          </div>

          <div class="alert-progress-section">
            <div class="progress-labels">
              <span class="label-text">PROFIT MARGIN SAFETY</span>
              <span class="pct-val" [style.color]="getProgressColor(alert.progress)">{{ alert.currentMargin }}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" 
                   [style.width.%]="alert.progress"
                   [style.background]="getProgressColor(alert.progress)"
                   [style.box-shadow]="alert.progress < 20 ? '0 0 10px rgba(239,68,68,0.3)' : 'none'"></div>
            </div>
            <div class="progress-footer">
              <span>Goal: {{ alert.targetMargin }}%</span>
              <span class="delta" [class.negative]="alert.currentMargin < alert.targetMargin">
                {{ alert.currentMargin - alert.targetMargin > 0 ? '+' : '' }}{{ (alert.currentMargin - alert.targetMargin).toFixed(1) }}%
              </span>
            </div>
          </div>

          <div class="alert-controls">
            <div class="toggle-switch" [class.on]="alert.active" [class.off]="!alert.active" (click)="toggleStatus(alert)">
              <div class="knob" [class.on]="alert.active" [class.off]="!alert.active"></div>
            </div>
            <button class="icon-btn" (click)="toggleDrawer(alert)">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.754 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg>
            </button>
            <button class="icon-btn trash" (click)="deleteAlert(alert)">
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
          <h3>{{ editingAlert ? 'Edit' : 'Configure' }} Margin Rule</h3>
          <button class="close-btn" (click)="toggleDrawer()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </header>

        <div class="drawer-content">
          <div class="drawer-section">
            <label>Apply Rule to</label>
            <div class="field-wrap">
              <input type="text" [(ngModel)]="drawerForm.target" (input)="showTargetDropdown = true" class="drawer-input" placeholder="Search product or category...">
              
              <!-- Autocomplete Dropdown -->
              <div class="suggestion-dropdown" *ngIf="showTargetDropdown && targetSuggestions.length > 0">
                <div class="suggestion-group-label" (click)="drawerForm.target = 'Full Catalog'; showTargetDropdown = false">
                  GLOBAL: Full Catalog
                </div>
                <div class="suggestion-item" *ngFor="let item of targetSuggestions" (click)="drawerForm.target = item.name; showTargetDropdown = false">
                  <div class="s-logo" [style.background]="'rgba(255,255,255,0.05)'">{{ item.name.charAt(0) }}</div>
                  <div class="s-info">
                    <span class="s-name">{{ item.name }}</span>
                    <span class="s-cat">{{ item.category }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="drawer-divider"></div>

          <div class="drawer-section">
            <label>Alert Trigger</label>
            <div class="mode-tabs">
              <div class="mode-tab" [class.active]="drawerForm.triggerMode === 'Margin Drops Below'" (click)="setTriggerMode('Margin Drops Below')">Margin Drops Below</div>
              <div class="mode-tab" [class.active]="drawerForm.triggerMode === 'Price Undercut By'" (click)="setTriggerMode('Price Undercut By')">Price Undercut By</div>
            </div>
          </div>

          <div class="drawer-section">
            <label>Minimum Acceptable Margin (%)</label>
            <input type="number" [(ngModel)]="drawerForm.minMargin" class="drawer-input">
          </div>

          <div class="drawer-section">
            <label>Notification Priority</label>
            <div class="priority-grid">
              <div class="p-card high" [class.active]="drawerForm.priority === 'High'" (click)="setPriority('High')">
                <div class="p-icon">🚨</div>
                <div class="p-label">High</div>
              </div>
              <div class="p-card" [class.active]="drawerForm.priority === 'Medium'" (click)="setPriority('Medium')">
                <div class="p-icon">⚡</div>
                <div class="p-label">Medium</div>
              </div>
              <div class="p-card" [class.active]="drawerForm.priority === 'Low'" (click)="setPriority('Low')">
                <div class="p-icon">ℹ️</div>
                <div class="p-label">Low</div>
              </div>
            </div>
          </div>

          <div class="preview-sentence">
            "PulsePrice will monitor {{ drawerForm.target === 'Full Catalog' ? 'all rivals' : drawerForm.target }} and alert you immediately via Push and Email if any price change forces your margin below {{ drawerForm.minMargin }}%."
          </div>

          <button class="drawer-submit" (click)="deployRule()">{{ editingAlert ? 'Update' : 'Deploy' }} Margin Rule</button>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    :host { display: block; animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .alerts-page { display: flex; flex-direction: column; gap: 32px; max-width: 1400px; margin: 0 auto; padding-top: 2rem; }

    .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .header-info h1 { font-size: 26px; font-weight: 850; color: var(--text-primary); margin: 0; letter-spacing: -0.02em; }
    .header-info p { font-size: 14px; color: var(--text-secondary); margin-top: 8px; max-width: 500px; line-height: 1.5; }

    .create-alert-btn {
      height: 44px; padding: 0 24px;
      background: var(--accent-blue); color: white;
      border: none; border-radius: 12px;
      font-size: 14px; font-weight: 700;
      cursor: pointer; transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
      display: flex; align-items: center; gap: 10px;
      box-shadow: 0 10px 20px -5px rgba(59, 130, 246, 0.3);
    }
    .create-alert-btn svg { width: 18px; height: 18px; color: currentColor; }
    .create-alert-btn:hover { transform: translateY(-2px); box-shadow: 0 15px 30px -5px rgba(59, 130, 246, 0.4); }

    .filter-tabs {
      display: flex; gap: 8px;
      border-bottom: 2px solid var(--border);
      margin-bottom: 8px;
    }
    .tab {
      padding: 12px 20px; font-size: 14px;
      font-weight: 600; color: var(--text-muted);
      cursor: pointer; border-bottom: 2px solid transparent;
      margin-bottom: -2px; transition: all 0.2s ease;
      background: none; border: none;
    }
    .tab.active { color: var(--accent-blue); border-bottom-color: var(--accent-blue); }
    .tab:hover:not(.active) { color: var(--text-primary); background: rgba(255,255,255,0.03); }

    .alerts-list { display: flex; flex-direction: column; gap: 16px; }

    .alert-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 28px;
      transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
    }
    .alert-card:hover { border-color: var(--border-mid); transform: scale(1.005); box-shadow: var(--shadow-hover); }

    .product-visual { position: relative; flex-shrink: 0; }
    .alert-img { width: 72px; height: 72px; border-radius: 16px; object-fit: cover; border: 1px solid var(--border); }
    
    .risk-indicator {
      position: absolute; top: -1px; right: -1px; width: 14px; height: 14px;
      border: 3px solid var(--bg-card); border-radius: 50%;
      background: #ccc;
    }
    .risk-indicator.high { background: #EF4444; box-shadow: 0 0 10px #EF4444; }
    .risk-indicator.medium { background: #F59E0B; }
    .risk-indicator.low { background: #10B981; }

    .alert-info { flex: 1; min-width: 0; }
    .alert-name { font-size: 16px; font-weight: 750; color: var(--text-primary); }
    .alert-condition { font-size: 13px; color: var(--text-muted); margin-top: 6px; }

    .alert-status {
      font-size: 9px; font-weight: 850;
      text-transform: uppercase; letter-spacing: 0.1em;
      padding: 4px 10px; border-radius: 100px; margin-top: 10px;
      display: inline-block;
      background: var(--bg-elevated);
      color: var(--text-muted);
    }
    .alert-status.high { background: rgba(239, 68, 68, 0.1); color: #EF4444; border: 1px solid rgba(239,68,68,0.2); }
    .alert-status.medium { background: rgba(245, 158, 11, 0.1); color: #F59E0B; border: 1px solid rgba(245,158,11,0.2); }

    .alert-progress-section { flex: 1.5; margin: 0 12px; min-width: 240px; }
    .progress-labels { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px; }
    .progress-labels .label-text { font-size: 10px; font-weight: 800; color: var(--text-muted); opacity: 0.8; letter-spacing: 0.05em; }
    .progress-labels .pct-val { font-size: 20px; font-weight: 900; line-height: 1; }

    .progress-track { height: 10px; background: var(--bg-elevated); border-radius: 100px; overflow: hidden; margin-bottom: 8px; }
    .progress-fill { height: 100%; border-radius: 100px; transition: width 1.5s cubic-bezier(0.16,1,0.3,1); }
    
    .progress-footer { display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: var(--text-muted); }
    .progress-footer .delta { color: #10B981; }
    .progress-footer .delta.negative { color: #EF4444; }

    .alert-controls { display: flex; align-items: center; gap: 14px; }

    .toggle-switch {
      width: 44px; height: 24px;
      border-radius: 100px; position: relative;
      cursor: pointer; transition: all 0.3s;
      flex-shrink: 0;
      background: var(--bg-elevated);
    }
    .toggle-switch.on { background: var(--accent-blue); }
    
    .knob {
      position: absolute; top: 4px; border-radius: 50%; width: 16px; height: 16px;
      background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
      left: 4px;
    }
    .knob.on { left: 24px; }

    .icon-btn {
      width: 40px; height: 40px; border-radius: 12px;
      background: var(--bg-secondary); border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.2s; color: var(--text-muted);
    }
    .icon-btn svg { width: 18px; height: 18px; color: currentColor; }
    .icon-btn:hover { border-color: var(--border-mid); color: var(--text-primary); background: var(--bg-hover); }
    .icon-btn.trash:hover { color: var(--accent-red); background: rgba(239,68,68,0.1); border-color: var(--accent-red); }

    .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; backdrop-filter: blur(8px); }

    .alert-drawer {
      position: fixed; top: 0; right: 0; bottom: 0;
      width: 500px; background: var(--bg-card);
      border-left: 1px solid var(--border);
      box-shadow: -20px 0 60px rgba(0,0,0,0.4);
      z-index: 201; padding: 40px;
      overflow-y: auto;
      transform: translateX(100%);
      transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
      display: flex; flex-direction: column;
      color: var(--text-primary);
    }
    .alert-drawer.open { transform: translateX(0); }

    .drawer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
    .drawer-header h3 { font-size: 22px; font-weight: 850; color: var(--text-primary); margin: 0; }
    .close-btn {
      width: 40px; height: 40px; border-radius: 12px;
      background: var(--bg-secondary); border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.2s; color: var(--text-muted);
    }

    .drawer-content { display: flex; flex-direction: column; gap: 28px; }
    .drawer-section label { display: block; font-size: 11px; font-weight: 850; color: var(--text-muted); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.1em; }
    .drawer-input {
      width: 100%; height: 52px;
      border: 1px solid var(--border);
      border-radius: 14px; padding: 0 18px;
      font-size: 16px; color: var(--text-primary);
      outline: none; transition: all 0.2s;
      background: var(--bg-primary);
    }
    .drawer-input:focus { border-color: var(--accent-blue); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

    .mode-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .mode-tab {
      height: 44px; border-radius: 10px; border: 1px solid var(--border);
      background: var(--bg-primary); font-size: 13px; font-weight: 700; color: var(--text-muted);
      cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;
    }
    .mode-tab.active { background: var(--accent-blue-light); border-color: var(--accent-blue); color: var(--accent-blue); }

    .priority-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .p-card {
      padding: 16px 12px; border-radius: 14px; border: 1px solid var(--border);
      background: var(--bg-primary); text-align: center; cursor: pointer; transition: all 0.2s;
    }
    .p-card.active { border-color: var(--accent-blue); background: var(--accent-blue-light); }
    .p-card.high:hover { border-color: #EF4444; background: rgba(239,68,68,0.05); }
    .p-icon { font-size: 20px; margin-bottom: 6px; }
    .p-label { font-size: 12px; font-weight: 700; color: var(--text-secondary); }

    .preview-sentence {
      background: rgba(59, 130, 246, 0.05); border-left: 4px solid var(--accent-blue);
      border-radius: 4px 14px 14px 4px; padding: 20px;
      font-size: 14px; color: var(--text-secondary); line-height: 1.6; font-style: italic;
    }

    .drawer-submit {
      width: 100%; height: 56px;
      background: var(--accent-blue); color: white;
      border: none; border-radius: 14px;
      font-size: 16px; font-weight: 750;
      cursor: pointer; transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
      margin-top: 10px;
      box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);
    }
    .drawer-submit:hover { transform: translateY(-2px); box-shadow: 0 15px 35px -5px rgba(59, 130, 246, 0.5); }

    .drawer-divider { height: 1px; background: var(--border); margin: 4px 0; }

    /* Autocomplete */
    .field-wrap { position: relative; }
    .suggestion-dropdown {
      position: absolute; top: 100%; left: 0; right: 0; 
      background: var(--bg-card, #0a0a0c); border: 1px solid var(--border);
      border-radius: 12px; margin-top: 8px; z-index: 210;
      max-height: 240px; overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
    }
    .suggestion-group-label { padding: 12px 18px; font-size: 10px; font-weight: 800; color: var(--accent-blue); background: rgba(59,130,246,0.05); cursor: pointer; &:hover { background: rgba(59,130,246,0.1); } }
    .suggestion-item {
      padding: 10px 18px; display: flex; gap: 12px; align-items: center; 
      cursor: pointer; transition: all 0.2s; border-bottom: 1px solid rgba(255,255,255,0.03);
      &:hover { background: rgba(59,130,246,0.08); }
    }
    .s-logo { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: var(--text-primary); border: 1px solid var(--border); background: var(--bg-elevated); }
    .s-info { display: flex; flex-direction: column; gap: 2px; }
    .s-name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
    .s-cat { font-size: 10px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; }
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
export class BusinessAlertsComponent {
  showDrawer = false;
  showTargetDropdown = false;
  selectedFilter: string = 'All Alerts';
  editingAlert: any = null;

  availableProducts = PLATFORM_PRODUCT_LIBRARY;

  // Drawer Form State
  drawerForm = {
    target: 'Full Catalog',
    triggerMode: 'Margin Drops Below',
    minMargin: 15,
    priority: 'Medium'
  };

  alerts = [
    { productId: '1', productName: 'iPhone 15 Pro 256GB', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200', currentMargin: 12.4, targetMargin: 15.0, progress: 82, risk: 'High', active: true },
    { productId: '2', productName: 'MacBook Pro M3 14"', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200', currentMargin: 8.2, targetMargin: 10.0, progress: 75, risk: 'High', active: true },
    { productId: '3', productName: 'Sony WH-1000XM5', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200', currentMargin: 18.5, targetMargin: 15.0, progress: 100, risk: 'Healthy', active: true },
    { productId: '4', productName: 'Canon EOS R8', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200', currentMargin: 11.8, targetMargin: 12.0, progress: 95, risk: 'Medium', active: true }
  ];

  get filteredAlerts() {
    if (this.selectedFilter === 'All Alerts') return this.alerts;
    if (this.selectedFilter === 'High Risk') return this.alerts.filter(a => a.risk === 'High');
    if (this.selectedFilter === 'Healthy') return this.alerts.filter(a => a.risk === 'Healthy');
    if (this.selectedFilter === 'Paused') return this.alerts.filter(a => !a.active);
    return this.alerts;
  }

  setFilter(filter: string) {
    this.selectedFilter = filter;
  }

  toggleDrawer(alert: any = null) {
    if (alert) {
      this.editingAlert = alert;
      this.drawerForm = {
        target: alert.productName,
        triggerMode: 'Margin Drops Below',
        minMargin: alert.targetMargin,
        priority: 'Medium'
      };
    } else {
      this.editingAlert = null;
      this.resetDrawerForm();
    }
    this.showDrawer = !this.showDrawer;
  }

  resetDrawerForm() {
    this.drawerForm = {
      target: 'Full Catalog',
      triggerMode: 'Margin Drops Below',
      minMargin: 15,
      priority: 'Medium'
    };
  }

  toggleStatus(alert: any) {
    alert.active = !alert.active;
  }

  deleteAlert(alert: any) {
    this.alerts = this.alerts.filter(a => a.productId !== alert.productId);
  }

  setPriority(priority: string) {
    this.drawerForm.priority = priority;
  }

  setTriggerMode(mode: string) {
    this.drawerForm.triggerMode = mode;
  }

  deployRule() {
    if (this.drawerForm.target !== 'Full Catalog') {
      const isValid = PLATFORM_PRODUCT_LIBRARY.some(p => p.name === this.drawerForm.target);
      if (!isValid) {
        // Validation could be added to UI, for now we just return to prevent data mess
        return;
      }
    }
    if (this.editingAlert) {
      const index = this.alerts.findIndex(a => a.productId === this.editingAlert.productId);
      if (index !== -1) {
        this.alerts[index].targetMargin = this.drawerForm.minMargin;
        // Update other properties if needed
      }
    } else {
      // Mock adding a new alert
      const newId = (this.alerts.length + 1).toString();
      this.alerts.push({
        productId: newId,
        productName: this.drawerForm.target === 'Full Catalog' ? 'New Bulk Rule' : this.drawerForm.target,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200',
        currentMargin: 20,
        targetMargin: this.drawerForm.minMargin,
        progress: 100,
        risk: 'Healthy',
        active: true
      });
    }
    this.showDrawer = false;
  }

  getProgressColor(progress: number): string {
    if (progress >= 100) return '#10B981';
    if (progress >= 85) return '#3B82F6';
    if (progress >= 60) return '#F59E0B';
    return '#EF4444';
  }

  get targetSuggestions() {
    if (!this.drawerForm.target || this.drawerForm.target === 'Full Catalog') return [];
    return this.availableProducts.filter(p => 
      p.name.toLowerCase().includes(this.drawerForm.target.toLowerCase())
    );
  }
}
