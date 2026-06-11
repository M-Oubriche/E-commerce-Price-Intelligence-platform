import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { AuthService } from '../../../../core/services/auth.service';
import { WatchlistService, WatchlistItem } from '../../../../core/services/watchlist.service';
import { AnalyticsApiService } from '../../../../core/services/analytics-api.service';
import { ActivityLogsService } from '../../../../core/services/activity-logs.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="home-page" [@pageEnter]>
      
      <!-- LOADING SKELETON -->
      <ng-container *ngIf="isLoading; else contentTemplate">
        <div class="skeleton-header skeleton"></div>
        <div class="dashboard-grid">
          <div class="main-column">
            <div class="content-panel skeleton" style="height: 400px;"></div>
          </div>
          <div class="side-column">
            <div class="content-panel skeleton" style="height: 400px;"></div>
          </div>
        </div>
      </ng-container>

      <ng-template #contentTemplate>
        <!-- WELCOME ROW: GREETING + STATS -->
        <div class="welcome-row animate-in">
          <div class="welcome-text">
            <h2 class="welcome-greeting">{{ greeting }}, {{ userName }}</h2>
            <p class="welcome-sub">{{ welcomeSubtitle }}</p>
          </div>
          
          <div class="stat-cards">
            <div class="stat-card">
              <div class="stat-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
              </div>
              <div class="stat-info">
                <span class="stat-label">Tracked</span>
                <span class="stat-value">{{ displayStats.tracked }}</span>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              </div>
              <div class="stat-info">
                <span class="stat-label">Alerts</span>
                <span class="stat-value">{{ displayStats.activeAlerts }}</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon savings">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div class="stat-info">
                <span class="stat-label">Total Saved</span>
                <span class="stat-value">{{ displayStats.totalSaved | currency:'USD':'symbol':'1.0-0' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="dashboard-grid">
          <!-- MAIN COLUMN -->
          <div class="main-column">
            <!-- PRICE DROPS SECTION -->
            <section class="content-panel animate-in">
              <div class="panel-header">
                <div class="title-wrap">
                  <h2>Recent Price Drops</h2>
                  <span class="live-indicator">
                    <span class="dot"></span> Live
                  </span>
                </div>
                <a routerLink="/dashboard/tracked" class="view-all">View all tracking</a>
              </div>

              <div class="drop-grid" *ngIf="priceDrops.length > 0; else emptyDrops">
                <div class="product-drop-card" *ngFor="let product of priceDrops" [routerLink]="['/product', product.id]">
                  <div class="card-img-wrap">
                    <img [src]="product.image" [alt]="product.name">
                    <div class="deal-badge" [class]="getScoreClass(product.dealScore)">
                      Score: {{ product.dealScore }}
                    </div>
                  </div>
                  <div class="card-content">
                    <div class="cat-tag">{{ product.category }}</div>
                    <h3 class="prod-name">{{ product.name }}</h3>
                    <div class="price-info">
                      <div class="current-price">{{ product.currentPrice | currency }}</div>
                      <div class="drop-amount">↓ {{ (product.originalPrice - product.currentPrice) | currency:'USD':'symbol':'1.0-0' }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <ng-template #emptyDrops>
                <div class="empty-state">
                  <div class="empty-icon">✓</div>
                  <p>All clear! No price drops detected in the last 24 hours.</p>
                </div>
              </ng-template>
            </section>
          </div>

          <!-- SIDEBAR COLUMN -->
          <div class="side-column">
            <!-- ALERTS PANEL -->
            <section class="content-panel animate-in">
              <div class="panel-header">
                <h2>Alert Progress</h2>
              </div>
              <div class="progress-list">
                <div class="progress-item" *ngFor="let alert of alerts.slice(0,3)">
                  <div class="item-row">
                    <img *ngIf="alert.image" [src]="alert.image" class="item-thumb" 
                         onerror="this.style.display='none'">
                    <div class="item-info">
                      <div class="item-top">
                        <span class="item-name">{{ alert.productName }}</span>
                        <span class="item-pct" [style.color]="getProgressColor(alert.progress)">{{ alert.progress }}%</span>
                      </div>
                      <span class="item-category">{{ alert.category }}</span>
                      <div class="progress-bar-container">
                        <div class="progress-bar-fill" 
                             [style.width.%]="alert.progress"
                             [style.background]="getProgressColor(alert.progress)"
                             [class.glow]="alert.progress > 85"></div>
                      </div>
                      <div class="item-prices">
                        <span class="curr">{{ alert.currentPrice | currency }}</span>
                        <span class="tgt">Target: {{ alert.targetPrice | currency }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="progress-empty" *ngIf="alerts.length === 0">
                  <span>No active alerts</span>
                </div>
              </div>
              <a routerLink="/dashboard/alerts" class="panel-footer-link">Manage Alerts</a>
            </section>
          </div>
        </div>

        <!-- SECTION 1 — "Best time to buy" insights -->
        <div class="insights-section animate-in">
          <div class="section-header">
            <span class="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Smart insights
            </span>
            <span class="section-sub">based on price history of your tracked products</span>
          </div>

          <div class="insights-grid">
            <div class="insight-card" *ngFor="let insight of insights" [class]="'insight-card insight-' + insight.type">
              <div class="insight-icon-wrap" [class]="'icon-' + insight.type">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path [attr.d]="insight.icon"></path>
                </svg>
              </div>
              <div class="insight-content">
                <div class="insight-product">{{ insight.product }}</div>
                <div class="insight-message">{{ insight.message }}</div>
              </div>
              <div class="insight-action">
                <a [routerLink]="['/product', insight.productId]" class="insight-link">View →</a>
              </div>
            </div>
          </div>
        </div>

        <!-- TWO COLUMN ROW: RECENTLY VIEWED + CURATED -->
        <div class="bottom-row animate-in">
          <div class="recent-section">
            <div class="section-header">
              <span class="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Recently viewed
              </span>
              <span class="section-sub">products you visited recently</span>
              <a class="section-clear" (click)="clearRecentlyViewed($event)">Clear history</a>
            </div>

            <div class="recent-scroll">
              <div
                class="recent-card"
                *ngFor="let product of recentlyViewed"
                [routerLink]="['/product', product.id]"
              >
                <div class="recent-img-wrap">
                  <img
                    [src]="product.image"
                    [alt]="product.name"
                    class="recent-img"
                    onerror="this.style.display='none'"
                  />
                  <div class="recent-score" [class]="product.dealScore >= 8 ? 'score-high' : product.dealScore >= 5 ? 'score-mid' : 'score-low'">
                    {{ product.dealScore }}
                  </div>
                </div>
                <div class="recent-info">
                  <div class="recent-category">{{ product.category }}</div>
                  <div class="recent-name">{{ product.name }}</div>
                  <div class="recent-price">{{ product.currentPrice | currency }}</div>
                  <div class="recent-platform">{{ product.platform }}</div>
                </div>
                <div class="recent-time">{{ product.viewedAgo }}</div>
              </div>
            </div>
          </div>

          <div class="curated-section">
            <!-- DEALS PANEL -->
            <section class="content-panel">
              <div class="panel-header">
                <h2>Curated for You</h2>
              </div>
              <div class="deal-list">
                <div class="deal-item" *ngFor="let deal of personalizedDeals" [routerLink]="['/product', deal.id]">
                  <div class="deal-icon"></div>
                  <div class="deal-details">
                    <div class="deal-title">{{ deal.productName }}</div>
                    <div class="deal-meta">
                      <span class="price">{{ deal.currentPrice | currency }}</span>
                      <span class="save">Save {{ deal.savingsAmount | currency }}</span>
                    </div>
                  </div>
                  <div class="deal-arrow">→</div>
                </div>
              </div>
              <a routerLink="/deals" class="panel-footer-link secondary">Explore Deal Feed</a>
            </section>
          </div>
        </div>

        <!-- SEARCH ZONE - BOTTOM -->
        <section class="search-panel animate-in">
          <div class="search-container">
            <div class="search-header">
              <h3>Start Tracking New Products</h3>
              <p>Paste a URL or search for a product to begin monitoring prices.</p>
            </div>
            <div class="search-box-wrapper" [class.shake]="searchShake">
              <svg class="search-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input type="text" [(ngModel)]="searchQuery" (input)="onSearchInput()" (keydown.enter)="onSearch()" placeholder="Search product name or paste Amazon/Walmart link..." autocomplete="off">
              <button class="primary-search-btn" (click)="onSearch()">Analyze Price</button>
            </div>
            <!-- Autocomplete -->
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
        </section>
      </ng-template>

    </div>
  `,
  styles: [`
    :host { display: block; }

    .home-page {
      display: flex;
      flex-direction: column;
      gap: 32px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .welcome-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 24px;
    }

    .welcome-text {
      flex-shrink: 0;
      .welcome-greeting { font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0 0 6px; }
      .welcome-sub { font-size: 13px; color: var(--text-secondary); margin: 0; }
    }

    .stat-cards {
      display: flex;
      gap: 12px;
      flex-shrink: 0;
    }

    /* --- STAT CARD STYLES --- */
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 140px;
      transition: all 0.2s;

      &:hover {
        transform: translateY(-2px);
        background: var(--bg-elevated);
        border-color: var(--border-mid);
        box-shadow: var(--shadow-hover);
      }
    }

    .stat-icon {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--accent-blue-light);
      color: var(--accent-blue);
      svg { width: 16px; height: 16px; }

      &.savings {
        background: var(--accent-green-light);
        color: var(--accent-green);
      }
    }

    .stat-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .stat-label {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-value {
      font-size: 16px;
      font-weight: 800;
      color: var(--text-primary);
      line-height: 1;
    }

    /* --- LAYOUT GRID --- */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 24px;

      @media (max-width: 1100px) {
        grid-template-columns: 1fr;
      }
    }

    .main-column {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .side-column {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* --- PANEL STYLES --- */
    .content-panel {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 24px;
      box-shadow: var(--shadow-card);
      display: flex;
      flex-direction: column;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;

      .title-wrap {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      h2 {
        font-size: 18px;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0;
      }

      .live-indicator {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
        font-weight: 800;
        color: var(--accent-green);
        text-transform: uppercase;
        background: rgba(16, 185, 129, 0.15);
        padding: 4px 10px;
        border-radius: 20px;

        .dot {
          width: 6px;
          height: 6px;
          background: var(--accent-green);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
      }

      .view-all {
        font-size: 13px;
        font-weight: 600;
        color: var(--accent-blue);
        text-decoration: none;
        &:hover { text-decoration: underline; }
      }
    }

    /* --- PRICE DROP CARDS --- */
    .drop-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 20px;
    }

    .product-drop-card {
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s;
      background: transparent;

      &:hover {
        transform: translateY(-2px);
        background: var(--bg-elevated);
        border-color: var(--border-mid);
        box-shadow: var(--shadow-hover);
      }

      .card-img-wrap {
        height: 160px;
        position: relative;
        overflow: hidden;
        background: #0D1117;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.8;
        }

        .deal-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          font-size: 9px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: uppercase;
          &.score-high { background: rgba(16, 185, 129, 0.15); color: var(--accent-green); }
          &.score-mid { background: rgba(245, 158, 11, 0.15); color: var(--accent-amber); }
          &.score-low { background: rgba(239, 68, 68, 0.15); color: var(--accent-red); }
        }
      }

      .card-content {
        padding: 16px;
      }

      .cat-tag {
        font-size: 10px;
        font-weight: 700;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 4px;
      }

      .prod-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 12px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        height: 40px;
      }

      .price-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .current-price {
        font-size: 18px;
        font-weight: 800;
        color: var(--accent-green);
      }

      .drop-amount {
        font-size: 11px;
        font-weight: 700;
        background: rgba(16, 185, 129, 0.12);
        color: var(--accent-green);
        padding: 2px 8px;
        border-radius: 20px;
      }
    }

    /* --- SEARCH PANEL --- */
    .search-panel {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 40px;
      color: var(--text-primary);
      box-shadow: var(--shadow-card);
    }

    .search-container {
      max-width: 800px;
      margin: 0 auto;
      text-align: center;
    }

    .search-header h3 {
      font-size: 22px;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.01em;
    }

    .search-header p {
      color: var(--text-secondary);
      font-size: 14px;
      margin: 10px 0 24px;
    }

    .search-box-wrapper {
      position: relative;
      margin-bottom: 20px;

      .search-ico {
        position: absolute;
        left: 16px;
        top: 50%;
        transform: translateY(-50%);
        width: 20px;
        height: 20px;
        color: var(--text-muted);
      }

      input {
        width: 100%;
        height: 56px;
        background: var(--bg-primary);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 0 160px 0 52px;
        color: var(--text-primary);
        font-size: 15px;
        transition: all 0.2s;

        &:focus {
          border-color: var(--accent-blue);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
          outline: none;
        }
      }

      .primary-search-btn {
        position: absolute;
        right: 8px;
        top: 8px;
        bottom: 8px;
        background: var(--accent-blue);
        color: white;
        border: none;
        border-radius: 10px;
        padding: 0 20px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background: #2563EB;
        }
      }
    }

    /* Autocomplete */
    .suggestions-dropdown {
      position: absolute; top: calc(100% + 10px); left: 0; right: 0; 
      background: var(--bg-card, #0a101f); backdrop-filter: blur(12px);
      border: 1px solid var(--border); border-radius: 16px;
      box-shadow: 0 15px 50px rgba(0,0,0,0.4); z-index: 1000; overflow: hidden;
      text-align: left;
    }
    .suggestion-item {
      padding: 12px 18px; display: flex; gap: 14px; align-items: center; cursor: pointer; transition: all 0.2s;
      &:hover { background: rgba(59, 130, 246, 0.1); }
      .s-img { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; }
      .s-info { display: flex; flex-direction: column; }
      .s-name { font-size: 14px; font-weight: 700; color: #fff; }
      .s-cat { font-size: 10px; color: var(--text-muted); text-transform: uppercase; }
    }

    /* --- SIDEBAR COMPONENTS --- */
    .progress-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .progress-item {
      .item-row {
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }

      .item-thumb {
        width: 44px;
        height: 44px;
        border-radius: 8px;
        object-fit: cover;
        flex-shrink: 0;
        background: var(--panel-border);
      }

      .item-info {
        flex: 1;
        min-width: 0;
      }

      .item-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2px;
        .item-name { font-size: 13px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; margin-right: 8px; }
        .item-pct { font-size: 13px; font-weight: 800; flex-shrink: 0; }
      }

      .item-category {
        display: inline-block;
        font-size: 10px;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }

      .progress-bar-container {
        height: 6px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 100px;
        overflow: hidden;
        margin-bottom: 6px;

        .progress-bar-fill {
          height: 100%;
          border-radius: 100px;
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
          
          &.glow {
            box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
          }
        }
      }

      .item-prices {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        font-weight: 600;
        .curr { color: var(--text-secondary); }
        .tgt { color: var(--accent-green); }
      }
    }

    .progress-empty {
      text-align: center;
      padding: 24px 0;
      font-size: 13px;
      color: var(--text-muted);
    }

    .deal-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .deal-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: var(--bg-elevated);
        transform: translateX(4px);
        .deal-arrow { transform: translateX(4px); color: var(--accent-blue); }
      }

      .deal-icon {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--accent-blue);
        flex-shrink: 0;
      }

      .deal-details {
        flex: 1;
        min-width: 0;
      }

      .deal-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .deal-meta {
        display: flex;
        gap: 8px;
        margin-top: 2px;
        font-size: 11px;
        font-weight: 600;
        .price { color: var(--accent-green); }
        .save { color: var(--text-muted); }
      }

      .deal-arrow {
        font-size: 14px;
        color: var(--text-muted);
        transition: all 0.2s;
      }
    }

    .panel-footer-link {
      display: block;
      margin-top: 20px;
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      color: white;
      text-decoration: none;
      padding: 10px;
      background: var(--accent-blue);
      border-radius: 12px;
      transition: all 0.2s;

      &:hover {
        background: #2563EB;
      }

      &.secondary {
        background: transparent;
        border: 1px solid var(--border-mid);
        color: var(--text-primary);
        &:hover {
          background: rgba(255, 255, 255, 0.05);
        }
      }
    }

    .empty-state {
      padding: 48px 0;
      text-align: center;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 20px;

      .empty-icon {
        font-size: 32px;
        margin-bottom: 12px;
      }

      p {
        font-size: 14px;
        color: var(--text-muted);
        font-weight: 600;
        margin: 0;
      }
    }

    /* --- ANIMATIONS & UTILS --- */
    .skeleton-header {
      height: 80px;
      border-radius: 24px;
      margin-bottom: 32px;
      background: rgba(255, 255, 255, 0.03);
    }

    .skeleton {
      background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }

    .insights-section {
      width: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 22px 24px;
      margin-bottom: 16px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;

      .section-title {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 13px;
        font-weight: 700;
        color: var(--text-primary);
        text-transform: uppercase;
        letter-spacing: 0.06em;

        svg {
          width: 15px;
          height: 15px;
          color: var(--accent-blue);
        }
      }

      .section-sub {
        font-size: 12px;
        color: var(--text-muted);
      }
    }

    .insights-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .insight-card {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 16px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--bg-elevated);
      transition: all 0.18s ease;
      cursor: pointer;

      &:hover {
        border-color: var(--border-mid);
        transform: translateY(-1px);
        box-shadow: var(--shadow-card);
      }
    }

    .insight-icon-wrap {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      svg { width: 16px; height: 16px; }

      &.icon-buy-now {
        background: rgba(16,185,129,0.12);
        svg { color: var(--accent-green); }
      }

      &.icon-wait {
        background: rgba(245,158,11,0.12);
        svg { color: var(--accent-amber); }
      }

      &.icon-neutral {
        background: rgba(59,130,246,0.12);
        svg { color: var(--accent-blue); }
      }
    }

    .insight-content {
      flex: 1;
      min-width: 0;

      .insight-product {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 4px;
      }

      .insight-message {
        font-size: 12px;
        color: var(--text-secondary);
        line-height: 1.5;
      }
    }

    .insight-action {
      flex-shrink: 0;

      .insight-link {
        font-size: 12px;
        font-weight: 500;
        color: var(--accent-blue);
        text-decoration: none;
        white-space: nowrap;
        &:hover { text-decoration: underline; }
      }
    }

    .insight-card.insight-buy-now { border-left: 3px solid var(--accent-green); }
    .insight-card.insight-wait { border-left: 3px solid var(--accent-amber); }
    .insight-card.insight-neutral { border-left: 3px solid var(--accent-blue); }

    .bottom-row {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 16px;
      align-items: start;
      margin-bottom: 16px;
      width: 100%;
      min-width: 0;

      @media (max-width: 1100px) {
        grid-template-columns: 1fr;
      }
    }

    .recent-section {
      width: 100%;
      min-width: 0;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 22px 24px;
    }

    .curated-section {
      width: 100%;
      min-width: 0;
      overflow: hidden;
    }

    .section-clear {
      margin-left: auto;
      font-size: 12px;
      color: var(--text-muted);
      text-decoration: none;
      cursor: pointer;
      transition: color 0.15s;
      &:hover { color: var(--accent-red); }
    }

    .recent-scroll {
      display: flex;
      gap: 14px;
      overflow-x: auto;
      padding-bottom: 4px;
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
    }

    .recent-card {
      flex-shrink: 0;
      width: 160px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.18s ease;
      position: relative;

      &:hover {
        transform: translateY(-2px);
        border-color: var(--border-mid);
        box-shadow: var(--shadow-card);
      }
    }

    .recent-img-wrap {
      position: relative;
      height: 110px;

      .recent-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .recent-score {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 700;
        color: white;
        backdrop-filter: blur(4px);

        &.score-high { background: rgba(16,185,129,0.9); }
        &.score-mid { background: rgba(245,158,11,0.9); }
        &.score-low { background: rgba(239,68,68,0.9); }
      }
    }

    .recent-info {
      padding: 10px 12px 8px;

      .recent-category {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
        margin-bottom: 3px;
      }

      .recent-name {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 6px;
      }

      .recent-price {
        font-size: 14px;
        font-weight: 700;
        color: var(--accent-green);
        font-variant-numeric: tabular-nums;
      }

      .recent-platform {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 2px;
      }
    }

    .recent-time {
      position: absolute;
      top: 8px;
      left: 8px;
      font-size: 10px;
      color: white;
      background: rgba(0,0,0,0.5);
      padding: 2px 7px;
      border-radius: 20px;
      backdrop-filter: blur(4px);
    }
  `],
  animations: [
    trigger('pageEnter', [
      transition(':enter', [
        query('.animate-in', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(100, [
            animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class DashboardHomeComponent implements OnInit {
  authService = inject(AuthService);
  private watchlistService = inject(WatchlistService);
  private analyticsApi = inject(AnalyticsApiService);
  private activityLogsService = inject(ActivityLogsService);
  private destroyRef = inject(DestroyRef);
  router = inject(Router);

  private searchSubject = new Subject<string>();

  isLoading = true;
  searchQuery = '';
  searchShake = false;
  showSuggestions = false;
  suggestions: any[] = [];

  stats = { tracked: 0, activeAlerts: 0, dropsToday: 0, totalSaved: 0 };
  displayStats = { tracked: 0, activeAlerts: 0, dropsToday: 0, totalSaved: 0 };

  trackedProducts: any[] = [];
  priceDrops: any[] = [];
  alerts: any[] = [];
  insights: any[] = [];
  recentlyViewed: any[] = [];
  personalizedDeals: any[] = [];

  get greeting(): string {
    return 'Welcome back';
  }

  get userName(): string {
    return this.authService.currentUser?.full_name?.split(' ')[0] || 'there';
  }

  get welcomeSubtitle(): string {
    const drops = this.priceDrops.length;
    const alertsCount = this.alerts.length;
    if (drops > 0 && alertsCount > 0) return `You have ${drops} price drop${drops > 1 ? 's' : ''} and ${alertsCount} alert${alertsCount > 1 ? 's' : ''} close to triggering today.`;
    if (drops > 0) return `You have ${drops} price drop${drops > 1 ? 's' : ''} on your tracked products today.`;
    if (alertsCount > 0) return `You have ${alertsCount} alert${alertsCount > 1 ? 's' : ''} close to triggering. Keep watching.`;
    return 'All your tracked products are being monitored. No drops today yet.';
  }

  get filteredSuggestions(): any[] {
    return this.suggestions;
  }

  ngOnInit() {
    this.fetchDashboardData();

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

  fetchDashboardData() {
    this.isLoading = true;

    let fallbackTimer: ReturnType<typeof setTimeout>;
    const done = () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      this.isLoading = false;
      setTimeout(() => this.runStatsAnimations(), 50);
    };

    fallbackTimer = setTimeout(() => done(), 8_000);

    forkJoin({
      watchlist: this.watchlistService.getWatchlist().pipe(catchError(() => of([] as WatchlistItem[]))),
      priceDrops: this.analyticsApi.getFlashDeals().pipe(catchError(() => of([] as any[])))
    }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: ({ watchlist: items, priceDrops: drops }) => {
        this.trackedProducts = items.map(item => this.mapToDisplay(item)).slice(0, 5);
        this.priceDrops = (drops || [])
          .slice(0, 4)
          .map(d => ({
            id: d.product_unified_id,
            name: d.product_name,
            category: d.product_category,
            image: d.product_image_url || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400',
            currentPrice: d.latest_price,
            originalPrice: d.previous_price,
            dealScore: d.deal_score || Math.min(5 + Math.round(d.drop_percentage / 10), 10),
          }));
        this.alerts = items
          .flatMap(item =>
            (item.shopper_alerts || []).map(alert => ({
              id: alert.id,
              productName: item.product_name,
              category: item.category,
              image: item.image_url,
              currentPrice: item.current_price,
              targetPrice: alert.target_value,
              progress: alert.progress_pct,
            }))
          )
          .sort((a, b) => b.progress - a.progress)
          .slice(0, 5);
        this.stats = {
          tracked: items.length,
          activeAlerts: items.reduce((acc, item) => acc + (item.shopper_alerts?.filter(a => a.status === 'active').length || 0), 0),
          dropsToday: items.filter(item => item.current_price < item.original_price).length,
          totalSaved: items.reduce((acc, item) => acc + Math.max(0, Number(item.original_price) - Number(item.current_price)), 0)
        };
        done();
      },
      error: () => done()
    });

    this.loadRecentlyViewed();

    this.analyticsApi.getShopperInsights().pipe(
      catchError(() => of([])),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: insights => {
        if (insights && insights.length > 0) {
          this.insights = insights.slice(0, 4).map(ins => ({
            productId: ins.top_viewed_product_name,
            product: ins.top_viewed_product_name,
            message: ins.demand_trend,
            type: (ins.interest_score > 80 ? 'buy-now' : ins.interest_score > 50 ? 'neutral' : 'wait') as 'buy-now' | 'neutral' | 'wait',
            icon: ins.interest_score > 80
              ? 'M13 10V3L4 14h7v7l9-11h-7z'
              : 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
          }));
        }
      },
      error: () => {}
    });

    this.analyticsApi.getDealAnalysis().pipe(
      catchError(() => of([])),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: deals => {
        if (deals && deals.length > 0) {
          this.personalizedDeals = deals.slice(0, 3).map(d => ({
            id: d.product_unified_id,
            category: d.product_category,
            productName: d.product_name,
            currentPrice: d.current_price || 0,
            savingsAmount: d.avg_price_30d && d.current_price ? d.avg_price_30d - d.current_price : 0
          }));
        }
      },
      error: () => {}
    });
  }

  private mapToDisplay(item: WatchlistItem) {
    return {
      id: item.id,
      name: item.product_name,
      category: item.category,
      currentPrice: item.current_price,
      originalPrice: item.original_price,
      platform: item.platform,
      dealScore: this.calculateDealScore(item),
      image: item.image_url
    };
  }

  private loadRecentlyViewed() {
    const fallbackImage = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200';
    this.activityLogsService.getRecentlyViewed().pipe(
      catchError(() => of({ data: [] })),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(res => {
      this.recentlyViewed = (res.data || []).slice(0, 6).map(entry => {
        const meta = entry.log_metadata || {};
        return {
          id: entry.entity_id,
          name: meta.name || '',
          category: meta.category || '',
          currentPrice: meta.currentPrice || 0,
          platform: meta.platform || '',
          dealScore: meta.dealScore || 0,
          image: meta.image || fallbackImage,
          viewedAgo: this.formatViewedAgo(entry.created_at),
        };
      });
    });
  }

  private formatViewedAgo(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  }

  clearRecentlyViewed(event: Event) {
    event.preventDefault();
    this.recentlyViewed = [];
  }

  private calculateDealScore(item: WatchlistItem): number {
    const drop = ((item.original_price - item.current_price) / item.original_price) * 100;
    const score = 5 + (drop / 10);
    return Math.min(Math.round(score * 10) / 10, 10);
  }

  runStatsAnimations() {
    this.countUp(this.stats.tracked, 1000, v => this.displayStats.tracked = v);
    this.countUp(this.stats.activeAlerts, 1000, v => this.displayStats.activeAlerts = v);
    this.countUp(this.stats.dropsToday, 1000, v => this.displayStats.dropsToday = v);
    this.countUp(this.stats.totalSaved, 1200, v => this.displayStats.totalSaved = v);
  }

  countUp(target: number, duration: number, setter: (v: number) => void) {
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setter(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  getScoreClass(score: number): string {
    if (score >= 8) return 'score-high';
    if (score >= 5) return 'score-mid';
    return 'score-low';
  }

  getProgressColor(progress: number): string {
    if (progress >= 85) return 'var(--accent-green)';
    if (progress >= 60) return 'var(--accent-amber)';
    return 'var(--accent-blue)';
  }

  onSearchInput() {
    this.searchSubject.next(this.searchQuery);
  }

  onSearch() {
    if (this.searchQuery) {
      this.showSuggestions = false;
      this.router.navigate(['/search'], { queryParams: { q: this.searchQuery } });
    } else {
      this.searchShake = true;
      setTimeout(() => this.searchShake = false, 400);
    }
  }

  selectSuggestion(prod: any) {
    this.searchQuery = prod.name;
    this.showSuggestions = false;
    this.router.navigate(['/product', prod.id]);
  }
}
