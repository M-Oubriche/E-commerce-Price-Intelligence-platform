import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ResellerService } from '../../../core/services/reseller.service';
import { AnalyticsApiService } from '../../../core/services/analytics-api.service';

@Component({
  selector: 'app-reseller-alerts',
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
        <button class="tab" [class.active]="selectedFilter === 'Critical'" (click)="setFilter('Critical')">Critical</button>
        <button class="tab" [class.active]="selectedFilter === 'At Risk'" (click)="setFilter('At Risk')">At Risk</button>
        <button class="tab" [class.active]="selectedFilter === 'Healthy'" (click)="setFilter('Healthy')">Healthy</button>
        <button class="tab" [class.active]="selectedFilter === 'Paused'" (click)="setFilter('Paused')">Paused</button>
      </div>

      <div class="alerts-list">
        <div class="alert-card animate-in" *ngFor="let alert of filteredAlerts">
          <div class="product-visual">
            <img [src]="alert.image" [alt]="alert.productName" class="alert-img">
            <div class="risk-indicator" [class.critical]="alert.risk === 'critical'" [class.risk]="alert.risk === 'risk'" [class.healthy]="alert.risk === 'healthy'"></div>
          </div>
          
          <div class="alert-info">
            <div class="alert-name">{{ alert.productName }}</div>
            <div class="alert-condition">{{ alert.triggerMode === 'MARGIN_DROPS_BELOW' ? ('Min. Gap: ' + alert.targetMargin + '%') : ('Undercut threshold: ' + alert.thresholdValue + (alert.thresholdType === 'PERCENT' ? '%' : '$')) }} | Your Gap: {{ alert.currentMargin != null ? alert.currentMargin + '%' : 'N/A' }}</div>
            <div class="alert-status" [class.critical]="alert.risk === 'critical'" [class.risk]="alert.risk === 'risk'">
              {{ alert.risk === 'Unknown' ? 'NO DATA' : alert.active ? (alert.risk === 'risk' ? 'At Risk' : alert.risk === 'critical' ? 'Critical' : 'Healthy') : 'PAUSED' }}
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
          <h3>{{ editingAlert ? 'Edit' : 'Configure' }} Price Alert</h3>
          <button class="close-btn" (click)="toggleDrawer()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </header>

        <div class="drawer-content">

          <!-- Step 1: Target -->
          <div class="drawer-section">
            <div class="section-step-label"><span class="step-num">1</span> Choose target product</div>
            <div class="target-list">
              <div class="target-option" *ngFor="let prod of products"
                   [class.selected]="drawerForm.targetProductId === prod.id"
                   (click)="selectTarget(prod.product_name, prod.id)">
                <div class="target-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                </div>
                <div class="target-info">
                  <span class="target-name">{{ prod.product_name }}</span>
                  <span class="target-meta">{{ prod.category || 'Uncategorized' }} &mdash; {{ prod.my_price | currency }}</span>
                </div>
                <div class="target-check" *ngIf="drawerForm.targetProductId === prod.id">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              </div>
            </div>
            <div class="no-products" *ngIf="products.length === 0">
              <p>No tracked products yet. Add products to your catalog first.</p>
            </div>
          </div>

          <div class="drawer-divider"></div>

          <!-- Step 2: Condition -->
          <div class="drawer-section">
            <div class="section-step-label"><span class="step-num">2</span> Alert condition</div>
            <div class="mode-tabs">
              <div class="mode-tab" [class.active]="drawerForm.triggerMode === 'MARGIN_DROPS_BELOW'" (click)="setTriggerMode('MARGIN_DROPS_BELOW')">
                <div class="mode-tab-header">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                  Margin Drops Below
                </div>
                <div class="mode-tab-desc">Alert when your profit margin falls below a target percentage</div>
              </div>
              <div class="mode-tab" [class.active]="drawerForm.triggerMode === 'PRICE_UNDERCUT_BY'" (click)="setTriggerMode('PRICE_UNDERCUT_BY')">
                <div class="mode-tab-header">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                  Price Undercut By
                </div>
                <div class="mode-tab-desc">Alert when a competitor's price is X% or $ below your price</div>
              </div>
            </div>

            <!-- Margin threshold input -->
            <div class="threshold-input" *ngIf="drawerForm.triggerMode === 'MARGIN_DROPS_BELOW'">
                  <label>Minimum acceptable price gap (%)</label>
              <div class="input-suffix">
                <input type="number" [(ngModel)]="drawerForm.minMargin" class="drawer-input" min="0" max="100">
                <span class="suffix">%</span>
              </div>
              <div class="input-hint">We'll alert you if your margin drops below {{ drawerForm.minMargin }}%</div>
            </div>

            <!-- Undercut threshold input -->
            <div class="threshold-input" *ngIf="drawerForm.triggerMode === 'PRICE_UNDERCUT_BY'">
              <label>Undercut threshold</label>
              <div class="input-suffix">
                <input type="number" [(ngModel)]="drawerForm.thresholdValue" class="drawer-input" min="0">
                <div class="threshold-type-toggle">
                  <span [class.active]="drawerForm.thresholdType === 'PERCENT'" (click)="drawerForm.thresholdType = 'PERCENT'">%</span>
                  <span [class.active]="drawerForm.thresholdType === 'ABSOLUTE'" (click)="drawerForm.thresholdType = 'ABSOLUTE'">$</span>
                </div>
              </div>
              <div class="input-hint">Alert if a competitor undercuts your price by {{ drawerForm.thresholdValue }}{{ drawerForm.thresholdType === 'PERCENT' ? '%' : '$' }} or more</div>
            </div>
          </div>

          <div class="drawer-divider"></div>

          <!-- Step 3: Priority -->
          <div class="drawer-section">
            <div class="section-step-label"><span class="step-num">3</span> Notification priority</div>
            <div class="priority-grid">
                <div class="p-card high" [class.active]="drawerForm.priority === 'HIGH'" (click)="setPriority('HIGH')">
                <div class="p-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M12 2l4 4M12 2L8 6"/><path d="M2 12h20"/></svg>
                </div>
                <div class="p-label">High</div>
              </div>
              <div class="p-card" [class.active]="drawerForm.priority === 'MEDIUM'" (click)="setPriority('MEDIUM')">
                <div class="p-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="12"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
                </div>
                <div class="p-label">Medium</div>
              </div>
              <div class="p-card" [class.active]="drawerForm.priority === 'LOW'" (click)="setPriority('LOW')">
                <div class="p-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="12" x2="22" y2="12"/></svg>
                </div>
                <div class="p-label">Low</div>
              </div>
            </div>
          </div>

          <!-- Preview -->
          <div class="preview-sentence">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/><path d="M2 12h20"/></svg>
            <span>Monitor <strong>{{ drawerForm.target }}</strong>
            and notify at <strong>{{ drawerForm.priority === 'HIGH' ? 'High' : drawerForm.priority === 'MEDIUM' ? 'Medium' : 'Low' }} priority</strong>
            when {{ drawerForm.triggerMode === 'MARGIN_DROPS_BELOW' ? 'margin drops below ' + drawerForm.minMargin + '%' : 'a rival undercuts by ' + drawerForm.thresholdValue + (drawerForm.thresholdType === 'PERCENT' ? '%' : '$') }}.</span>
          </div>

          <button class="drawer-submit" [class.disabled]="!drawerForm.targetProductId" [disabled]="!drawerForm.targetProductId" (click)="deployRule()">{{ editingAlert ? 'Update' : 'Deploy' }} Alert Rule</button>
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
    .risk-indicator.critical { background: #EF4444; box-shadow: 0 0 10px #EF4444; }
    .risk-indicator.risk { background: #F59E0B; }
    .risk-indicator.healthy { background: #10B981; }

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
    .alert-status.critical { background: rgba(239, 68, 68, 0.1); color: #EF4444; border: 1px solid rgba(239,68,68,0.2); }
    .alert-status.risk { background: rgba(245, 158, 11, 0.1); color: #F59E0B; border: 1px solid rgba(245,158,11,0.2); }
    .alert-status.healthy { background: rgba(16, 185, 129, 0.1); color: #34D399; border: 1px solid rgba(16,185,129,0.2); }

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

    .drawer-content { display: flex; flex-direction: column; gap: 24px; }

    .section-step-label {
      font-size: 11px; font-weight: 800; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.08em;
      display: flex; align-items: center; gap: 8px; margin-bottom: 14px;
    }
    .step-num {
      width: 20px; height: 20px; border-radius: 6px;
      background: var(--accent-blue); color: #fff;
      font-size: 10px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    .drawer-section label { display: block; font-size: 11px; font-weight: 850; color: var(--text-muted); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.1em; }

    .target-list { display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow-y: auto; }
    .target-option {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; border-radius: 10px;
      border: 1px solid var(--border);
      cursor: pointer; transition: all 0.15s;
      background: var(--bg-primary);
    }
    .target-option:hover { border-color: var(--border-mid); background: var(--bg-elevated); }
    .target-option.selected { border-color: var(--accent-blue); background: rgba(59,130,246,0.06); }
    .target-icon {
      width: 32px; height: 32px; border-radius: 8px;
      background: var(--bg-elevated); border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; color: var(--text-secondary);
    }
    .target-option.selected .target-icon { color: var(--accent-blue); border-color: var(--accent-blue); }
    .target-icon svg { width: 16px; height: 16px; }
    .target-info { flex: 1; min-width: 0; }
    .target-name { font-size: 13px; font-weight: 700; color: var(--text-primary); display: block; }
    .target-meta { font-size: 10px; color: var(--text-muted); margin-top: 1px; display: block; }
    .target-check {
      width: 20px; height: 20px; border-radius: 50%;
      background: var(--accent-blue); color: #fff;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .target-check svg { width: 12px; height: 12px; }

    .mode-tabs { display: flex; flex-direction: column; gap: 8px; }
    .mode-tab {
      padding: 14px 16px; border-radius: 12px; border: 1px solid var(--border);
      background: var(--bg-primary); cursor: pointer; transition: all 0.2s;
      display: flex; flex-direction: column; gap: 4px;
    }
    .mode-tab:hover { border-color: var(--border-mid); background: var(--bg-elevated); }
    .mode-tab.active { border-color: var(--accent-blue); background: rgba(59,130,246,0.06); }
    .mode-tab-header {
      display: flex; align-items: center; gap: 8px;
      font-size: 14px; font-weight: 700; color: var(--text-primary);
    }
    .mode-tab-header svg { width: 18px; height: 18px; color: var(--text-secondary); flex-shrink: 0; }
    .mode-tab.active .mode-tab-header svg { color: var(--accent-blue); }
    .mode-tab-desc { font-size: 11px; color: var(--text-muted); line-height: 1.4; padding-left: 26px; }

    .threshold-input { margin-top: 12px; }
    .threshold-input label { font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; display: block; }
    .input-suffix { display: flex; align-items: center; gap: 0; position: relative; }
    .input-suffix .drawer-input { padding-right: 50px; }
    .suffix {
      position: absolute; right: 14px; font-size: 16px; font-weight: 700;
      color: var(--text-muted); pointer-events: none;
    }
    .threshold-type-toggle {
      position: absolute; right: 4px; top: 4px; bottom: 4px;
      display: flex; border-radius: 8px; overflow: hidden;
      background: var(--bg-elevated); border: 1px solid var(--border);
    }
    .threshold-type-toggle span {
      padding: 0 10px; font-size: 13px; font-weight: 700;
      color: var(--text-muted); cursor: pointer;
      display: flex; align-items: center; transition: all 0.15s;
    }
    .threshold-type-toggle span.active { background: var(--accent-blue); color: #fff; }
    .input-hint { font-size: 11px; color: var(--text-muted); margin-top: 8px; font-style: italic; }

    .priority-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .p-card {
      padding: 16px 12px; border-radius: 14px; border: 1px solid var(--border);
      background: var(--bg-primary); text-align: center; cursor: pointer; transition: all 0.2s;
    }
    .p-card.active { border-color: var(--accent-blue); background: var(--accent-blue-light); }
    .p-card.high:hover { border-color: #EF4444; background: rgba(239,68,68,0.05); }
    .p-icon { font-size: 20px; margin-bottom: 4px; display: flex; justify-content: center; }
    .p-icon svg { width: 20px; height: 20px; color: var(--text-secondary); }
    .p-card.active .p-icon svg { color: var(--accent-blue); }
    .p-label { font-size: 12px; font-weight: 700; color: var(--text-secondary); }

    .preview-sentence {
      display: flex; align-items: flex-start; gap: 10px;
      background: rgba(59, 130, 246, 0.05); border-left: 4px solid var(--accent-blue);
      border-radius: 4px 14px 14px 4px; padding: 16px 18px;
      font-size: 13px; color: var(--text-secondary); line-height: 1.6;
    }
    .preview-sentence svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 3px; color: var(--accent-blue); }
    .preview-sentence strong { color: var(--text-primary); font-weight: 700; }

    .drawer-divider { height: 1px; background: var(--border); margin: 4px 0; }

    .no-products { padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px; border: 1px dashed var(--border); border-radius: 12px; }
    .no-products p { margin: 0; }

    .drawer-input {
      width: 100%; height: 52px;
      border: 1px solid var(--border);
      border-radius: 14px; padding: 0 18px;
      font-size: 16px; color: var(--text-primary);
      outline: none; transition: all 0.2s;
      background: var(--bg-primary);
    }
    .drawer-input:focus { border-color: var(--accent-blue); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

    .drawer-submit { width: 100%; height: 56px; background: var(--accent-blue); color: #fff; border: none; border-radius: 14px; font-size: 16px; font-weight: 750; cursor: pointer; transition: all 0.3s cubic-bezier(0.16,1,0.3,1); margin-top: 10px; box-shadow: 0 10px 25px -5px rgba(59,130,246,0.4); }
    .drawer-submit:hover { transform: translateY(-2px); box-shadow: 0 15px 35px -5px rgba(59,130,246,0.5); }
    .drawer-submit.disabled { opacity: 0.35; cursor: not-allowed; transform: none; box-shadow: none; }
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
export class ResellerAlertsComponent implements OnInit {
  private resellerService = inject(ResellerService);
  private analyticsApi = inject(AnalyticsApiService);
  private destroyRef = inject(DestroyRef);
  
  showDrawer = false;
  selectedFilter: string = 'All Alerts';
  editingAlert: any = null;
  isLoading = false;

  products: any[] = [];

  drawerForm = {
    target: '',
    targetProductId: null as string | null,
    triggerMode: 'MARGIN_DROPS_BELOW',
    minMargin: 15,
    thresholdValue: 10,
    thresholdType: 'PERCENT' as 'PERCENT' | 'ABSOLUTE',
    priority: 'MEDIUM'
  };

  alerts: any[] = [];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    forkJoin({
      alerts: this.resellerService.getAlerts().pipe(catchError(() => of([]))),
      prods: this.resellerService.getProducts().pipe(catchError(() => of([])))
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ alerts, prods }) => {
      console.log('loadData - alerts from API:', alerts.length, 'products:', prods.length);
      this.products = prods;
      const prodMap = new Map(prods.map(p => [p.id, p]));

      const enrichCalls = alerts.filter(a => a.seller_product_id && prodMap.has(a.seller_product_id)).map(a => {
        const prod = prodMap.get(a.seller_product_id!)!;
        return this.analyticsApi.searchProducts(prod.product_name).pipe(
          catchError(() => of([])),
          map((results: any[]) => {
            const normalized = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
            const searchName = normalized(prod.product_name);
            const scored = results.map((r: any) => {
              const bqName = normalized(r.product_name || '');
              const words = searchName.split(/\s+/).filter((w: string) => w.length > 2);
              const matches = words.filter((w: string) => bqName.includes(w)).length;
              const score = words.length > 0 ? matches / words.length : (bqName === searchName ? 1 : 0);
              const exactBonus = bqName === searchName ? 10 : 0;
              return { result: r, score: score + exactBonus };
            });
            scored.sort((a: any, b: any) => b.score - a.score);
            const best = scored[0]?.score >= 0.3 ? scored[0].result : null;
            let lowestComp: number | null = null;
            if (best) {
              const bestId = best.product_unified_id;
              const sameProduct = results.filter((r: any) => r.product_unified_id === bestId);
              const prices = sameProduct.map((r: any) => r.current_price).filter((p: number) => p > 0);
              if (prices.length > 0) lowestComp = Math.min(...prices);
            }
            return { productId: prod.id, image: best?.product_image_url || null, lowestComp };
          })
        );
      });

      const finalize = (enriched: { productId: string; image: string | null; lowestComp: number | null }[]) => {
        console.log('finalize - enriched:', enriched.length, 'entries, alerts total:', alerts.length);
        const imageMap = new Map(enriched.map(e => [e.productId, e.image]));
        const lowestCompMap = new Map(enriched.map(e => [e.productId, e.lowestComp]));
        this.alerts = alerts.map(a => {
          const prod = a.seller_product_id ? prodMap.get(a.seller_product_id) : null;
          const myPrice = prod?.my_price || 0;
          const bqLowest = prod?.id ? lowestCompMap.get(prod.id) : null;
          const lowestComp = bqLowest ?? prod?.cached_lowest_comp_price ?? null;
          const currentMarginRaw = myPrice > 0 && lowestComp != null && lowestComp > 0
            ? (1 - lowestComp / myPrice) * 100
            : null;
          const targetMargin = a.target_margin_pct || 15;
          const progress = currentMarginRaw != null && targetMargin > 0 ? Math.min(100, (currentMarginRaw / targetMargin) * 100) : 0;
          const risk = currentMarginRaw == null
            ? 'Unknown'
            : currentMarginRaw > 10 ? 'critical' : currentMarginRaw > 0 ? 'risk' : 'healthy';
          const displayMargin = currentMarginRaw != null ? Math.round(currentMarginRaw * 100) / 100 : null;
          return {
            id: a.id,
            productId: a.seller_product_id,
            productName: prod ? prod.product_name : 'Full Catalog',
            image: (a.seller_product_id ? imageMap.get(a.seller_product_id) : null) || '',
            currentMargin: displayMargin,
            targetMargin,
            progress,
            risk,
            active: a.is_active,
            triggerMode: a.trigger_mode,
            priority: a.priority,
            thresholdValue: a.threshold_value,
            thresholdType: a.threshold_type
          };
        });
        this.isLoading = false;
      };

      if (enrichCalls.length === 0) {
        finalize([]);
      } else {
        forkJoin(enrichCalls).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(finalize);
      }
    });
  }

  selectTarget(name: string, productId: string) {
    this.drawerForm.target = name;
    this.drawerForm.targetProductId = productId;
  }

  get filteredAlerts() {
    let list = this.alerts;
    if (this.selectedFilter === 'Critical') list = this.alerts.filter(a => a.risk === 'critical');
    if (this.selectedFilter === 'At Risk') list = this.alerts.filter(a => a.risk === 'risk');
    if (this.selectedFilter === 'Healthy') list = this.alerts.filter(a => a.risk === 'healthy');
    if (this.selectedFilter === 'Paused') list = this.alerts.filter(a => !a.active);
    return list;
  }

  setFilter(filter: string) {
    this.selectedFilter = filter;
  }

  toggleDrawer(alert: any = null) {
    if (alert) {
      this.editingAlert = alert;
      this.drawerForm = {
        target: alert.productName,
        targetProductId: alert.productId,
        triggerMode: alert.triggerMode,
        minMargin: alert.targetMargin,
        thresholdValue: alert.thresholdValue ?? 10,
        thresholdType: alert.thresholdType ?? 'PERCENT',
        priority: (alert.priority || '').toUpperCase()
      };
    } else {
      this.editingAlert = null;
      this.resetDrawerForm();
    }
    this.showDrawer = !this.showDrawer;
  }

  resetDrawerForm() {
    this.drawerForm = {
      target: '',
      targetProductId: null,
      triggerMode: 'MARGIN_DROPS_BELOW',
      minMargin: 15,
      thresholdValue: 10,
      thresholdType: 'PERCENT',
      priority: 'MEDIUM'
    };
  }

  toggleStatus(alert: any) {
    this.resellerService.updateAlert(alert.id, { is_active: !alert.active })
      .subscribe({
        next: () => { this.loadData(); this.resellerService.sidebarRefresh$.next(); },
        error: (err) => alert(err.error?.detail || 'Failed to toggle alert')
      });
  }

  deleteAlert(alert: any) {
    if (!confirm('Delete this price alert?')) return;
    this.resellerService.deleteAlert(alert.id).subscribe({
      next: () => { this.loadData(); this.resellerService.sidebarRefresh$.next(); },
      error: (err) => alert(err.error?.detail || 'Failed to delete alert')
    });
  }

  setPriority(priority: string) {
    this.drawerForm.priority = priority;
  }

  setTriggerMode(mode: string) {
    this.drawerForm.triggerMode = mode;
  }

  deployRule() {
    if (!this.drawerForm.targetProductId) {
      alert('Please select a product to monitor');
      return;
    }

    const payload: any = {
      seller_product_id: this.drawerForm.targetProductId,
      trigger_mode: this.drawerForm.triggerMode,
      priority: this.drawerForm.priority
    };

    if (this.drawerForm.triggerMode === 'MARGIN_DROPS_BELOW') {
      payload.target_margin_pct = this.drawerForm.minMargin;
    } else {
      payload.threshold_value = this.drawerForm.thresholdValue;
      payload.threshold_type = this.drawerForm.thresholdType;
    }

    console.log('deployRule - payload:', JSON.stringify(payload));
    console.log('deployRule - editingAlert:', this.editingAlert?.id);

    if (this.editingAlert) {
      this.resellerService.updateAlert(this.editingAlert.id, payload)
        .subscribe({
          next: (res) => {
            console.log('updateAlert response:', res);
            this.loadData();
            this.resellerService.sidebarRefresh$.next();
            this.showDrawer = false;
          },
          error: (err) => {
            console.error('updateAlert error:', err);
            alert(err.error?.detail || 'Failed to update alert');
          }
        });
    } else {
      this.resellerService.createAlert(payload)
        .subscribe({
          next: (res) => {
            console.log('createAlert response:', res);
            this.loadData();
            this.resellerService.sidebarRefresh$.next();
            this.showDrawer = false;
          },
          error: (err) => {
            console.error('createAlert error:', err);
            alert(err.error?.detail || 'Failed to create alert');
          }
        });
    }
  }

  getProgressColor(progress: number): string {
    if (progress >= 100) return '#10B981';
    if (progress >= 85) return '#3B82F6';
    if (progress >= 60) return '#F59E0B';
    return '#EF4444';
  }
}
