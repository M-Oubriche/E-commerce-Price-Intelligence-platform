import { Component, OnInit, OnDestroy, inject, DestroyRef } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ResellerService } from '../../../core/services/reseller.service';
import { AnalyticsApiService } from '../../../core/services/analytics-api.service';

@Component({
  selector: 'app-reseller-competitor-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe, DecimalPipe, RouterModule],
  template: `
    <div class="scanner-page">
      
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">Competitor Scanner</h1>
          <p class="page-subtitle">Monitor rival sellers, track overlapping inventory, and intercept their pricing strategies.</p>
        </div>
        <div class="header-right">
          <div class="sync-info">
            <span class="sync-time">{{ isSyncing ? 'Refreshing...' : (lastSyncTime ? 'Last updated ' + lastSyncTime : '') }}</span>
            <div class="sync-dot" [class.syncing]="isSyncing"></div>
          </div>
          <button class="sync-btn" (click)="refreshData()" [disabled]="isSyncing">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" [class.spin]="isSyncing">
              <path d="M21 2v6h-6M21.34 15.57a10 10 0 1 1-.59-10.45l5.25 2.88"/>
            </svg>
            {{ isSyncing ? 'Refreshing...' : 'Refresh Data' }}
          </button>
        </div>
      </div>

      <div class="competitors-grid">
        <div class="competitor-card" *ngFor="let competitor of competitors" [class]="'aggression-' + competitor.aggression.toLowerCase()">
          <div class="card-top">
            <div class="competitor-identity">
               <div class="competitor-logo">{{ competitor.seller_name.charAt(0) }}</div>
               <div class="competitor-info">
                 <span class="competitor-name">{{ competitor.seller_name }}</span>
                <span class="aggression-badge" [class]="'badge-' + competitor.aggression.toLowerCase()">
                  {{ competitor.aggression }} AGGRESSION
                </span>
              </div>
            </div>
            <div class="menu-container">
              <button class="card-menu-btn" (click)="toggleCardMenu($event, competitor.id)">⋯</button>
              <div class="card-dropdown" *ngIf="activeMenuId === competitor.id">
                <button class="dropdown-item" (click)="visitWebsite(competitor)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  Visit Website
                </button>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item delete" (click)="removeRival(competitor.id)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  Stop Monitoring
                </button>
              </div>
            </div>
          </div>

          <div class="card-stats">
            <div class="stat-block">
              <span class="stat-label">COMPETITIVENESS</span>
              <span class="stat-value win-rate">{{ competitor.competitiveness }}%</span>
            </div>
          </div>

          <div class="card-chart">
            <span class="chart-label">PRICING TREND</span>
            <span class="trend-arrow" [class.trend-up]="competitor.trendDir === 'up'"
                                       [class.trend-down]="competitor.trendDir === 'down'"
                                       [class.trend-flat]="competitor.trendDir === 'flat'">
              <svg *ngIf="competitor.trendDir === 'up'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline>
              </svg>
              <svg *ngIf="competitor.trendDir === 'down'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline>
              </svg>
              <svg *ngIf="competitor.trendDir === 'flat'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </span>
          </div>
        </div>
        
        <div class="add-rival-card" (click)="openAddRivalModal()">
          <div class="add-icon">+</div>
          <div class="add-label">Monitor New Rival</div>
        </div>
      </div>

      <div class="main-content">
        <div class="product-matrix-panel">
          <div class="panel-header">
            <div>
              <h3 class="panel-title">Head-to-Head Product Matrix</h3>
              <p class="panel-subtitle">Compare your pricing against each tracked rival on shared inventory.</p>
            </div>
            <div class="search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" placeholder="Filter by product name..." [(ngModel)]="productFilter" (input)="showFilterDropdown = true" (ngModelChange)="updateDerivedData()">
              
              <!-- Autocomplete Dropdown -->
               <div class="suggestion-dropdown" *ngIf="showFilterDropdown && filterSuggestions.length > 0">
                 <div class="suggestion-item" *ngFor="let item of filterSuggestions" (click)="productFilter = item.name; showFilterDropdown = false; updateDerivedData()">
                   <div class="s-logo">{{ item.name.charAt(0) }}</div>
                   <div class="s-info">
                     <span class="s-name">{{ item.name }}</span>
                   </div>
                 </div>
               </div>
            </div>
          </div>

          <div class="matrix-table-wrap">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th class="col-product">CATALOG ITEM</th>
                  <th class="col-price your-price">YOUR PRICE</th>
                  <th class="col-price" *ngFor="let src of matrixSources">
                    <div class="th-competitor">
                   <div class="th-logo">{{ src.charAt(0) }}</div>
                     {{ src.toUpperCase() }}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of filteredItems; let i = index" [class.row-even]="i % 2 === 0">
                  <td class="col-product">
                    <div class="product-cell">
                      <img [src]="item.image" class="product-thumb" onerror="this.style.display='none'">
                      <div class="product-cell-info">
                        <span class="product-cell-name">{{ item.name }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="col-price your-price">
                    <span class="your-price-val">{{ item.yourPrice | currency }}</span>
                  </td>
                  <td class="col-price" *ngFor="let src of matrixSources"
                      [class.cheaper]="item.competitorPrices[src] != null && item.competitorPrices[src]! < item.yourPrice"
                      [class.expensive]="item.competitorPrices[src] != null && item.competitorPrices[src]! > item.yourPrice"
                      [class.match]="item.competitorPrices[src] === item.yourPrice">
                    <div class="price-cell">
                      <span class="comp-price">{{ item.competitorPrices[src] | currency }}</span>
                      <ng-container *ngIf="item.competitorPrices[src] != null">
                        <span class="price-delta"
                          *ngIf="(item.competitorPrices[src]! - item.yourPrice) !== 0"
                          [class.delta-down]="(item.competitorPrices[src]! - item.yourPrice) < 0"
                          [class.delta-up]="(item.competitorPrices[src]! - item.yourPrice) > 0">
                          {{ (item.competitorPrices[src]! - item.yourPrice) > 0 ? '+' : '' }}{{ (item.competitorPrices[src]! - item.yourPrice) | currency }}
                        </span>
                      </ng-container>
                      <span class="match-badge" *ngIf="item.competitorPrices[src] === item.yourPrice">MATCH</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="activity-panel">
          <div class="panel-header" style="padding: 18px 18px 14px">
            <div>
              <h3 class="panel-title">Market Activity</h3>
              <p class="panel-subtitle">Recent moves by tracked rivals.</p>
            </div>
          </div>

          <div class="activity-feed">
            <div class="activity-item" *ngFor="let event of marketActivity"
                 [class.event-drop]="event.action === 'dropped'"
                 [class.event-raise]="event.action === 'raised'"
                 [class.tracked-rival]="event.isTracked">
              <div class="activity-logo">{{ event.compLogo }}</div>
              <div class="activity-body">
                <div class="activity-top">
                  <span class="activity-competitor">{{ event.compName }}</span>
                  <span class="activity-badge" *ngIf="event.isTracked">tracked</span>
                  <span class="activity-time">{{ event.timestamp }}</span>
                </div>
                <div class="activity-message">
                  <span class="activity-product">{{ event.productName }}</span>
                  <span class="activity-action">{{ event.action === 'dropped' ? 'dropped price by' : 'raised price by' }}</span>
                  <span class="activity-amount" [class.amount-drop]="event.action === 'dropped'" [class.amount-raise]="event.action === 'raised'">
                    {{ event.value | currency }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="activity-footer">
            <button class="view-all-btn" (click)="viewAllActivity()">View All Activity</button>
          </div>
        </div>
      </div>

      <!-- Add Rival Modal -->
      <div class="modal-overlay" *ngIf="showAddRivalModal" (click)="closeAddRivalModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="modal-title">Monitor New Rival</h2>
            <button class="close-btn" (click)="closeAddRivalModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p class="modal-description">Stay ahead of the market by tracking a new competitor. Choose from our supported global marketplaces below.</p>
            
            <div class="website-grid">
              <div class="website-item" *ngFor="let site of trackedWebsites"
                   [class.selected]="selectedRival?.name === site.name"
                   [class.disabled]="isAlreadyTracked(site.name)"
                   (click)="!isAlreadyTracked(site.name) && selectRival(site)">
                <div class="site-icon-wrap">
                  <div class="site-icon">{{ site.name.charAt(0) }}</div>
                </div>
                <div class="site-info">
                  <span class="site-name">{{ site.name }}</span>
                  <span class="site-domain">{{ site.domain }}</span>
                </div>
                <div class="status-indicator">
                  <span class="already-tracked" *ngIf="isAlreadyTracked(site.name)">ALREADY TRACKED</span>
                  <div class="check-mark" *ngIf="selectedRival?.name === site.name">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="cancel-btn" (click)="closeAddRivalModal()">Cancel</button>
            <button class="confirm-btn" [disabled]="!selectedRival" (click)="confirmAddRival()">
              Start Monitoring {{ selectedRival ? selectedRival.name : 'Rival' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: 24px 28px;
      max-width: 100%;
      overflow-x: hidden;
    }

    .scanner-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
      max-width: 100%;
    }
    
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }

    .page-header .page-title {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 4px;
    }

    .page-header .page-subtitle {
      font-size: 13px;
      color: var(--text-secondary);
      margin: 0;
    }

    .page-header .header-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
      flex-shrink: 0;
    }

    .page-header .sync-info {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .page-header .sync-info .sync-time {
      font-size: 11px;
      color: var(--text-muted);
    }
    .page-header .sync-info .sync-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-green);
      animation: pulse 2s ease infinite;
    }

    .page-header .sync-btn {
      height: 36px;
      padding: 0 16px;
      background: var(--accent-blue);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 7px;
      transition: all 0.15s;
    }
    .page-header .sync-btn svg {
      width: 14px;
      height: 14px;
    }
    .page-header .sync-btn:hover {
      filter: brightness(1.1);
    }

    /* Autocomplete */
    .search-wrap { position: relative; }
    .suggestion-dropdown {
      position: absolute; top: 100%; left: 0; right: 0; 
      background: var(--bg-card, #0a0a0c); border: 1px solid var(--border);
      border-radius: 12px; margin-top: 8px; z-index: 100;
      max-height: 240px; overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
    }
    .suggestion-item {
      padding: 10px 18px; display: flex; gap: 12px; align-items: center; 
      cursor: pointer; transition: all 0.2s; border-bottom: 1px solid rgba(255,255,255,0.03);
      &:hover { background: rgba(255,255,255,0.08); }
    }
    .s-logo { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: var(--text-primary); border: 1px solid var(--border); background: var(--bg-elevated); }
    .s-info { display: flex; flex-direction: column; gap: 2px; }
    .s-name { font-size: 13px; font-weight: 700; color: var(--text-primary); text-align: left; }
    .s-cat { font-size: 10px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; text-align: left; }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-content {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 20px;
      width: 100%;
      max-width: 500px;
      overflow: hidden;
      box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.25);
      animation: modalEnter 0.25s ease-out;
    }

    @keyframes modalEnter {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .modal-header {
      padding: 24px 28px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
    }

    .modal-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 24px;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
    }

    .modal-body {
      padding: 24px 28px;
    }

    .modal-description {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0 0 24px;
      line-height: 1.5;
    }

    .website-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 320px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .website-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      border: 1.5px solid var(--border);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .website-item:hover {
      background: var(--bg-elevated);
      border-color: var(--border-mid);
    }

    .website-item.selected {
      border-color: var(--accent-blue);
      background: rgba(59, 130, 246, 0.04);
    }

    .site-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .site-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .site-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .site-domain {
      font-size: 11px;
      color: var(--text-muted);
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .already-tracked {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-muted);
      background: var(--bg-elevated);
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 0.02em;
    }

    .website-item.disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background: rgba(0, 0, 0, 0.02);
    }

    .check-mark {
      color: var(--accent-blue);
      width: 18px;
      height: 18px;
    }

    .modal-footer {
      padding: 16px 28px 24px;
      display: flex;
      gap: 12px;
    }

    .modal-footer button {
      height: 40px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .cancel-btn {
      flex: 1;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-secondary);
    }

    .cancel-btn:hover {
      background: var(--bg-elevated);
      color: var(--text-primary);
    }

    .confirm-btn {
      flex: 2;
      background: var(--accent-blue);
      border: none;
      color: white;
    }

    .confirm-btn:hover:not(:disabled) {
      filter: brightness(1.1);
    }

    .confirm-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.4;
        transform: scale(0.8);
      }
    }

    .competitors-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      width: 100%;
    }

    .competitor-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px;
      transition: all 0.18s ease;
      border-left: 3px solid transparent;
    }
    .competitor-card:hover {
      border-color: var(--border-mid);
      transform: translateY(-2px);
      box-shadow: var(--shadow-card);
    }
    .competitor-card.aggression-high {
      border-left-color: var(--accent-red);
    }
    .competitor-card.aggression-medium {
      border-left-color: var(--accent-amber);
    }
    .competitor-card.aggression-low {
      border-left-color: var(--accent-green);
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
    }

    .competitor-identity {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .competitor-logo {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
      flex-shrink: 0;
    }

    .competitor-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
      display: block;
    }

    .aggression-badge {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-top: 3px;
      display: inline-block;
    }
    .aggression-badge.badge-high {
      background: rgba(239, 68, 68, 0.12);
      color: var(--accent-red);
    }
    .aggression-badge.badge-medium {
      background: rgba(245, 158, 11, 0.12);
      color: var(--accent-amber);
    }
    .aggression-badge.badge-low {
      background: rgba(16, 185, 129, 0.12);
      color: var(--accent-green);
    }

    .card-menu-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      font-size: 16px;
      line-height: 1;
    }
    .card-menu-btn:hover {
      color: var(--text-primary);
    }

    .card-stats {
      display: flex;
      align-items: center;
      gap: 0;
      margin-bottom: 14px;
      background: var(--bg-elevated);
      border-radius: 8px;
      padding: 10px 14px;
    }

    .stat-block {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .stat-label {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }

    .stat-value {
      font-size: 20px;
      font-weight: 800;
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    .stat-value.win-rate {
      color: var(--accent-blue);
    }

    .stat-divider {
      width: 1px;
      height: 32px;
      background: var(--border);
      margin: 0 14px;
      flex-shrink: 0;
    }

    .card-chart .chart-label {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      display: block;
      margin-bottom: 6px;
    }
    .card-chart .trend-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 40px;
    }
    .card-chart .trend-arrow.trend-up { color: var(--success, #22c55e); }
    .card-chart .trend-arrow.trend-down { color: var(--danger, #ef4444); }
    .card-chart .trend-arrow.trend-flat { color: var(--text-muted, #9ca3af); }

    .add-rival-card {
      background: transparent;
      border: 2px dashed var(--border);
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.18s ease;
      min-height: 160px;
      padding: 18px;
    }
    .add-rival-card .add-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      color: var(--text-muted);
      transition: all 0.18s;
    }
    .add-rival-card .add-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      transition: color 0.18s;
    }
    .add-rival-card:hover {
      border-color: var(--accent-blue);
    }
    .add-rival-card:hover .add-icon {
      background: rgba(59, 130, 246, 0.1);
      color: var(--accent-blue);
      border-color: var(--accent-blue);
    }
    .add-rival-card:hover .add-label {
      color: var(--accent-blue);
    }

    .main-content {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 16px;
      width: 100%;
      min-width: 0;
    }

    .product-matrix-panel {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .activity-panel {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      width: 300px;
      flex-shrink: 0;
    }

    .panel-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .panel-header .panel-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 3px;
    }
    .panel-header .panel-subtitle {
      font-size: 12px;
      color: var(--text-secondary);
      margin: 0;
    }    .search-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0 12px;
      height: 34px;
      flex-shrink: 0;
      min-width: 180px;
    }
    .search-wrap svg {
      width: 13px;
      height: 13px;
      color: var(--text-muted);
      flex-shrink: 0;
    }
    .search-wrap input {
      background: none;
      border: none;
      outline: none;
      font-size: 13px;
      color: var(--text-primary);
    }
    .search-wrap input::placeholder {
      color: var(--text-muted);
    }

    .matrix-table-wrap {
      overflow-x: auto;
      overflow-y: auto;
      flex: 1;
    }
    .matrix-table-wrap::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }
    .matrix-table-wrap::-webkit-scrollbar-track {
      background: transparent;
    }
    .matrix-table-wrap::-webkit-scrollbar-thumb {
      background: var(--border-mid);
      border-radius: 2px;
    }

    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .matrix-table thead tr {
      background: var(--bg-elevated);
      position: sticky;
      top: 0;
      z-index: 1;
    }
    .matrix-table th {
      padding: 10px 16px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      text-align: left;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    .matrix-table td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }
    .matrix-table tr:last-child td {
      border-bottom: none;
    }
    .matrix-table tr:hover td {
      background: var(--bg-elevated) !important;
    }
    .matrix-table .row-even td {
      background: rgba(255, 255, 255, 0.01);
    }

    .col-product {
      width: 35%;
    }

    .col-price {
      width: calc(65% / 4);
      text-align: right;
    }

    .your-price {
      background: rgba(59, 130, 246, 0.04) !important;
      border-left: 2px solid rgba(59, 130, 246, 0.2);
      border-right: 2px solid rgba(59, 130, 246, 0.2);
    }

    .your-price-val {
      font-size: 14px;
      font-weight: 700;
      color: var(--accent-blue);
      font-variant-numeric: tabular-nums;
    }
  
    .product-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .product-cell .product-thumb {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      object-fit: cover;
      flex-shrink: 0;
      border: 1px solid var(--border);
    }
    .product-cell .product-cell-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .product-cell .product-cell-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .product-cell .product-cell-sku {
      font-size: 10px;
      color: var(--text-muted);
      font-family: var(--font-mono, monospace);
    }

    .price-cell {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 3px;
    }

    .comp-price {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }

    .price-delta {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      font-variant-numeric: tabular-nums;
    }
    .price-delta.delta-down {
      background: rgba(239, 68, 68, 0.12);
      color: var(--accent-red);
    }
    .price-delta.delta-up {
      background: rgba(16, 185, 129, 0.12);
      color: var(--accent-green);
    }

    .match-badge {
      font-size: 9px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(245, 158, 11, 0.12);
      color: var(--accent-amber);
      letter-spacing: 0.04em;
    }

    td.cheaper {
      background: rgba(239, 68, 68, 0.04) !important;
    }

    td.expensive {
      background: rgba(16, 185, 129, 0.04) !important;
    }
    
    .th-competitor {
      display: flex; align-items: center; gap: 6px; justify-content: flex-end;
    }
    
    .th-logo {
      width: 18px; height: 18px; border-radius: 4px;
      background: var(--border); display: flex; align-items: center; justify-content: center;
      font-size: 9px; color: var(--text-primary);
    }

    .activity-feed {
      flex: 1;
      overflow-y: auto;
      padding: 4px 0;
      scrollbar-width: none;
    }
    .activity-feed::-webkit-scrollbar {
      display: none;
    }

    .activity-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 18px;
      border-bottom: 1px solid var(--border);
      border-left: 2px solid transparent;
      transition: background 0.15s;
    }
    .activity-item:last-child {
      border-bottom: none;
    }
    .activity-item:hover {
      background: var(--bg-elevated);
    }
    .activity-item.event-drop {
      border-left-color: var(--accent-red);
    }
    .activity-item.event-raise {
      border-left-color: var(--accent-green);
    }

    .activity-logo {
      width: 30px;
      height: 30px;
      border-radius: 7px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: var(--text-primary);
      flex-shrink: 0;
      margin-top: 1px;
    }

    .activity-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .activity-top {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .activity-competitor {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-primary);
      white-space: nowrap;
    }

    .activity-badge {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 1px 5px;
      border-radius: 4px;
      background: var(--accent-blue, #3b82f6);
      color: #fff;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .activity-time {
      font-size: 10px;
      color: var(--text-muted);
      white-space: nowrap;
      flex-shrink: 0;
      margin-left: auto;
    }

    .activity-message {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }

    .activity-product {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 120px;
    }
    .activity-product::after {
      content: '—';
      margin-left: 4px;
      color: var(--text-muted);
    }

    .activity-action {
      font-size: 11px;
      color: var(--text-secondary);
    }

    .activity-amount {
      font-size: 12px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .activity-amount.amount-drop {
      color: var(--accent-red);
    }
    .activity-amount.amount-raise {
      color: var(--accent-green);
    }

    .activity-sku {
      font-size: 10px;
      color: var(--text-muted);
      font-family: var(--font-mono, monospace);
    }

    .activity-footer {
      padding: 12px 18px;
      border-top: 1px solid var(--border);
      flex-shrink: 0;
    }
    .activity-footer .view-all-btn {
      width: 100%;
      height: 34px;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .activity-footer .view-all-btn:hover {
      border-color: var(--border-mid);
      color: var(--text-primary);
      background: var(--bg-elevated);
    }
    
    :host, .scanner-page, .main-content,
    .product-matrix-panel, .competitors-grid {
      max-width: 100%;
      box-sizing: border-box;
    }
    
    .matrix-table {
      table-layout: fixed;
      width: 100%;
    }
    .matrix-table .col-product {
      width: 36%;
    }

    .card-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: -4px;
      width: 170px;
      background: rgba(var(--bg-card-rgb, 255, 255, 255), 0.85);
      backdrop-filter: blur(12px) saturate(180%);
      -webkit-backdrop-filter: blur(12px) saturate(180%);
      border: 1px solid rgba(var(--border-rgb, 226, 232, 240), 0.5);
      border-radius: 12px;
      box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.15), 0 5px 15px -5px rgba(0, 0, 0, 0.05);
      z-index: 100;
      padding: 6px;
      transform-origin: top right;
      animation: dropdownEnter 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes dropdownEnter {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 12px;
      border: none;
      background: none;
      border-radius: 8px;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }

    .dropdown-item svg {
      width: 15px;
      height: 15px;
      color: var(--text-muted);
      opacity: 0.8;
      transition: all 0.15s;
    }

    .dropdown-item:hover {
      background: var(--bg-elevated);
      color: var(--text-primary);
      transform: translateX(2px);
    }

    .dropdown-item:hover svg {
      color: var(--accent-blue);
      opacity: 1;
    }

    .dropdown-item.delete {
      color: var(--accent-red);
    }
    .dropdown-item.delete:hover {
      background: rgba(239, 68, 68, 0.08);
      color: var(--accent-red);
    }
    .dropdown-item.delete:hover svg {
      color: var(--accent-red);
      transform: rotate(10deg);
    }

    .dropdown-divider {
      height: 1px;
      background: var(--border);
      opacity: 0.5;
      margin: 4px 6px;
    }
  `]
})
export class ResellerCompetitorScannerComponent implements OnInit, OnDestroy {
  private resellerService = inject(ResellerService);
  private analyticsApi = inject(AnalyticsApiService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);

  isSyncing = false;
  productFilter = '';
  showAddRivalModal = false;
  selectedRival: any = null;
  activeMenuId: string | null = null;
  showFilterDropdown = false;
  lastSyncTime = '';

  get filterSuggestions() {
    if (!this.productFilter || this.productFilter.length < 1) return [];
    return this.items.filter(p => 
      p.name.toLowerCase().includes(this.productFilter.toLowerCase())
    );
  }
  trackedWebsites: { name: string; domain: string }[] = [];

  competitors: any[] = [];
  items: { id: string; name: string; yourPrice: number; image: string; competitorPrices: Record<string, number | null> }[] = [];
  filteredItems: any[] = [];
  marketActivity: any[] = [];
  matrixSources: string[] = [];

  ngOnInit() {
    this.loadAllData();
  }

  ngOnDestroy() { }

  loadAllData() {
    this.isSyncing = true;
    forkJoin({
      comps: this.resellerService.getCompetitors().pipe(catchError(() => of([]))),
      prods: this.resellerService.getProducts().pipe(catchError(() => of([]))),
      drops: this.analyticsApi.getPriceDrops().pipe(catchError(() => of([]))),
      platforms: this.analyticsApi.getPlatformPerformance().pipe(catchError(() => of([])))
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ comps, prods, drops, platforms }) => {
      this.competitors = comps.map(c => {
        const trend = c.competitiveness_trend || 0;
        return {
          ...c,
          seller_name: c.seller_name,
          name: c.seller_name,
          aggression: c.aggressiveness,
          competitiveness: c.competitiveness || 50,
          trendDir: trend >= 0.3 ? 'up' : trend <= -0.3 ? 'down' : 'flat'
        };
      });
      // Build tracked websites from real system data
      const sourceSet = new Set<string>();
      // 1. Platforms tracked by the analytics system
      for (const p of platforms) {
        if (p.platform) sourceSet.add(p.platform.trim());
      }
      // 2. Sources from price drops
      for (const d of drops) {
        if (d.source) sourceSet.add(d.source.trim());
      }
      // 3. Already-tracked competitors
      for (const c of comps) {
        if (c.seller_name) sourceSet.add(c.seller_name.trim());
      }
      this.trackedWebsites = Array.from(sourceSet).sort().map(s => ({
        name: s,
        domain: s.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'
      }));

      this.items = prods.map(p => ({
        id: p.id,
        name: p.product_name,
        yourPrice: p.my_price,
        image: '',
        competitorPrices: {}
      }));

      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      this.lastSyncTime = `${hours}:${mins}`;

      this.enrichProductImages(prods, drops);
    });
  }

  updateDerivedData(drops: any[] = []) {
    const query = this.productFilter.toLowerCase();

    this.filteredItems = this.items
      .filter(p => !query || p.name.toLowerCase().includes(query))
      .map(p => ({
        name: p.name,
        image: p.image,
        yourPrice: p.yourPrice,
        competitorPrices: p.competitorPrices
      }));

    const compNames = new Set(this.competitors.map(c => c.seller_name.toLowerCase()));

    this.marketActivity = drops.slice(0, 20).map(d => {
      const src = d.source || '';
      const isTracked = compNames.has(src.toLowerCase());
      return {
        compName: src,
        compLogo: src.charAt(0),
        productName: d.product_name,
        action: 'dropped',
        value: d.absolute_drop_usd || 0,
        timestamp: d.latest_date ? this.relativeTime(d.latest_date) : 'recent',
        timeLabel: d.latest_date || '',
        fullDate: d.latest_date || '',
        impactScore: d.drop_percentage > 20 ? 'High' : d.drop_percentage > 10 ? 'Med' : 'Low' as 'High' | 'Med' | 'Low',
        priceHistory7d: [d.previous_price, d.latest_price],
        isTracked
      };
    });
    this.marketActivity.sort((a, b) => new Date(b.fullDate).getTime() - new Date(a.fullDate).getTime());
  }

  private enrichProductImages(prods: any[], drops: any[]) {
    const normalized = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const findBestMatch = (productName: string, results: any[]) => {
      const searchName = normalized(productName);
      const scored = results.map((r: any) => {
        const bqName = normalized(r.product_name || '');
        const words = searchName.split(/\s+/).filter((w: string) => w.length > 2);
        const matches = words.filter((w: string) => bqName.includes(w)).length;
        const score = words.length > 0 ? matches / words.length : (bqName === searchName ? 1 : 0);
        const exactBonus = bqName === searchName ? 10 : 0;
        return { result: r, score: score + exactBonus };
      });
      scored.sort((a: any, b: any) => b.score - a.score);
      return scored[0]?.score >= 0.3 ? scored[0].result : null;
    };

    const searches = prods.map(p =>
      this.analyticsApi.searchProducts(p.product_name).pipe(
        catchError(() => of([])),
        map((results: any[]) => {
          const best = findBestMatch(p.product_name, results);
          if (!best) return { id: p.id, image: null, sources: [] as { source: string; price: number | null }[] };
          const bestId = best.product_unified_id;
          const sameProduct = results.filter((r: any) => r.product_unified_id === bestId);
          return {
            id: p.id,
            image: best.product_image_url || null,
            sources: sameProduct.map(r => ({ source: r.source, price: r.current_price }))
          };
        })
      )
    );

    if (searches.length === 0) {
      this.isSyncing = false;
      this.updateDerivedData(drops);
      return;
    }

    forkJoin(searches).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(enriched => {
      const allSources = new Set<string>();
      for (const e of enriched) {
        for (const s of e.sources) {
          if (s.source) allSources.add(s.source.trim());
        }
      }
      this.matrixSources = Array.from(allSources).sort();

      const enrichedMap = new Map(enriched.map(e => [e.id, e]));
      for (const item of this.items) {
        const e = enrichedMap.get(item.id);
        if (e) {
          if (e.image) item.image = e.image;
          for (const s of e.sources) {
            if (s.source && s.price != null) {
              item.competitorPrices[s.source.trim()] = s.price;
            }
          }
        }
      }
      this.isSyncing = false;
      this.updateDerivedData(drops);
    });
  }

  private relativeTime(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  isAlreadyTracked(name: string): boolean {
    return this.competitors.some(c => c.seller_name.toLowerCase() === name.toLowerCase());
  }

  refreshData() {
    if (this.isSyncing) return;
    this.loadAllData();
  }

  toggleCardMenu(event: MouseEvent, id: string) {
    event.stopPropagation();
    this.activeMenuId = this.activeMenuId === id ? null : id;

    if (this.activeMenuId) {
      const closeMenu = () => {
        this.activeMenuId = null;
        document.removeEventListener('click', closeMenu);
      };
      setTimeout(() => {
        document.addEventListener('click', closeMenu);
      }, 0);
    }
  }

  visitWebsite(competitor: any) {
    if (competitor.domain) {
      window.open(`https://www.${competitor.domain}`, '_blank');
    }
  }

  removeRival(id: string) {
    if (confirm('Are you sure you want to stop monitoring this competitor?')) {
      this.resellerService.deleteCompetitor(id).subscribe(() => {
        this.loadAllData();
        this.resellerService.sidebarRefresh$.next();
      });
    }
  }
  openAddRivalModal() {
    this.showAddRivalModal = true;
    this.selectedRival = null;
  }

  closeAddRivalModal() {
    this.showAddRivalModal = false;
    this.selectedRival = null;
  }

  selectRival(site: any) {
    this.selectedRival = site;
  }

  confirmAddRival() {
    if (!this.selectedRival) return;

    if (this.isAlreadyTracked(this.selectedRival.name)) {
      alert(`You are already tracking ${this.selectedRival.name}. Please choose a different rival.`);
      return;
    }

    const payload = {
      seller_name: this.selectedRival.name,
      seller_id: this.selectedRival.name.toLowerCase().replace(' ', '-'),
      platform: this.selectedRival.name,
      domain: this.selectedRival.domain
    };

    this.resellerService.createCompetitor(payload).subscribe(() => {
      this.loadAllData();
      this.resellerService.sidebarRefresh$.next();
      this.closeAddRivalModal();
    });
  }

  viewAllActivity() {
    this.router.navigate(['/reseller/analytics'], { queryParams: { tab: 'activity' } });
  }
}
