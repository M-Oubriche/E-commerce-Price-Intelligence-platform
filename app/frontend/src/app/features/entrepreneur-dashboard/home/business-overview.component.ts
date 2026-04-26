import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { AuthService } from '../../../core/services/auth.service';

interface StatCard { icon: string; label: string; value: number; displayValue: number; prefix: string; suffix: string; colorClass: string; }
interface ProductRow { name: string; category: string; image: string; yourPrice: number; lowestComp: number; margin: number; status: 'healthy' | 'risk' | 'critical'; platform: string; }
interface MarketMove { event: string; product: string; platform: string; change: string; direction: 'up' | 'down'; time: string; image: string; }
interface Insight { icon: string; product: string; message: string; type: 'win' | 'risk' | 'watch'; link: string; }
interface TopOpp { name: string; category: string; image: string; opportunity: number; action: string; accentColor: string; accentBg: string; }

@Component({
  selector: 'app-business-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe],
  template: `
    <div class="overview-page" [@pageEnter]>

      <!-- LOADING SKELETON -->
      <ng-container *ngIf="isLoading; else contentTpl">
        <div class="skeleton-header skeleton"></div>
        <div class="skeleton-grid">
          <div class="content-panel skeleton" style="height:380px"></div>
          <div class="content-panel skeleton" style="height:380px"></div>
        </div>
      </ng-container>

      <ng-template #contentTpl>

        <!-- ── WELCOME ROW ── -->
        <div class="welcome-row animate-in">
          <div class="welcome-text">
            <h2 class="welcome-greeting">Welcome back, {{ userName }}</h2>
            <p class="welcome-sub">{{ subtitle }}</p>
          </div>

          <div class="stat-cards">
            <div class="stat-card" *ngFor="let s of stats">
              <div class="stat-icon" [ngClass]="s.colorClass" [ngSwitch]="s.label">
                <svg *ngSwitchCase="'Products Tracked'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                <svg *ngSwitchCase="'Competitors'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                <svg *ngSwitchCase="'Price Alerts'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                <svg *ngSwitchCase="'Competitiveness'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <div class="stat-info">
                <span class="stat-label">{{ s.label }}</span>
                <span class="stat-value">{{ s.prefix }}{{ s.displayValue }}{{ s.suffix }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── MAIN GRID: PRODUCT TABLE + MARKET FEED ── -->
        <div class="dashboard-grid animate-in">

          <!-- LEFT: Margin Health Table -->
          <section class="content-panel">
            <div class="panel-header">
              <div class="title-wrap">
                <h2>Market Health</h2>
                <span class="live-indicator">
                  <span class="dot"></span> Live
                </span>
              </div>
              <a routerLink="/business/alerts" class="view-all risk-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                3 at risk
              </a>
            </div>

            <div class="product-table">
              <div class="product-header">
                <span>Catalog Item</span>
                <span>Your Price</span>
                <span>Lowest Comp.</span>
                <span>Visibility</span>
                <span>Status</span>
              </div>
              <div class="product-row" *ngFor="let s of products"
                   [class.risk-row]="s.status==='risk'"
                   [class.critical-row]="s.status==='critical'">
                <div class="product-info-container">
                  <div class="product-dot" [ngClass]="s.status"></div>
                  <img [src]="s.image" [alt]="s.name" class="product-img">
                  <div class="product-info">
                    <span class="product-name">{{ s.name }}</span>
                  </div>
                </div>
                <span class="product-price my">{{ s.yourPrice | currency }}</span>
                <span class="product-price comp" [class.lower]="s.lowestComp < s.yourPrice">{{ s.lowestComp | currency }}</span>
                <div class="margin-bar-wrap">
                  <div class="margin-bar-track">
                    <div class="margin-bar-fill" [ngClass]="s.status" [style.width.%]="s.margin"></div>
                  </div>
                  <span class="margin-label">{{ s.margin }}% Share</span>
                </div>
                <span class="status-badge" [ngClass]="s.status">
                  {{ s.status === 'healthy' ? '✓ Healthy' : s.status === 'risk' ? '⚠ At Risk' : '✗ Critical' }}
                </span>
              </div>
            </div>

            <a routerLink="/business/catalog" class="panel-footer-link secondary">View full catalog →</a>
          </section>

          <!-- RIGHT: Market Moves Feed -->
          <section class="content-panel">
            <div class="panel-header">
              <h2>Market Moves</h2>
              <span class="live-indicator">
                <span class="dot"></span> Live
              </span>
            </div>

            <div class="market-feed">
              <div class="mf-item" *ngFor="let m of marketMoves">
                <div class="mf-img-wrap">
                  <img [src]="m.image" alt="Product" class="mf-img">
                  <div class="mf-dir-badge" [ngClass]="m.direction">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <ng-container *ngIf="m.direction==='down'">
                        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                        <polyline points="17 18 23 18 23 12"></polyline>
                      </ng-container>
                      <ng-container *ngIf="m.direction==='up'">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                        <polyline points="17 6 23 6 23 12"></polyline>
                      </ng-container>
                    </svg>
                  </div>
                </div>
                <div class="mf-body">
                  <p class="mf-event">{{ m.event }}</p>
                  <p class="mf-meta">{{ m.product }} · {{ m.platform }}</p>
                </div>
                <div class="mf-right">
                  <span class="mf-change" [ngClass]="m.direction">{{ m.change }}</span>
                  <span class="mf-time">{{ m.time }}</span>
                </div>
              </div>
            </div>

            <a routerLink="/business/competitors" class="panel-footer-link secondary">View all competitor activity →</a>
          </section>
        </div>

        <!-- ── SMART INSIGHTS ── -->
        <div class="insights-section animate-in">
          <div class="section-header">
            <span class="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Smart Insights
            </span>
            <span class="section-sub">based on live market data and your catalog</span>
          </div>
          <div class="insights-grid">
            <div class="insight-card" *ngFor="let i of insights" [ngClass]="'insight-' + i.type">
              <div class="insight-icon-wrap" [ngClass]="'icon-' + i.type">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path [attr.d]="i.icon"></path>
                </svg>
              </div>
              <div class="insight-content">
                <div class="insight-product">{{ i.product }}</div>
                <div class="insight-message">{{ i.message }}</div>
              </div>
              <div class="insight-action">
                <a [routerLink]="i.link" class="insight-link">Act →</a>
              </div>
            </div>
          </div>
        </div>

        <!-- ── BOTTOM ROW: TOP OPPORTUNITIES + ALERTS SUMMARY ── -->
        <div class="bottom-row animate-in">

          <!-- Top Opportunities -->
          <div class="opp-section">
            <div class="section-header">
              <span class="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                </svg>
                Top Opportunities
              </span>
              <span class="section-sub">Products where you can capture more market share</span>
              <a routerLink="/business/catalog" class="section-link">See full catalog</a>
            </div>
            <div class="opp-scroll">
              <div class="opp-card" *ngFor="let o of topOpps">
                <img [src]="o.image" [alt]="o.name" class="opp-img">
                <div class="opp-body">
                  <div class="opp-cat">{{ o.category }}</div>
                  <div class="opp-name">{{ o.name }}</div>
                  <div class="opp-score-wrap">
                    <div class="opp-score-track">
                      <div class="opp-score-fill" [style.background]="o.accentColor" [style.width.%]="o.opportunity"></div>
                    </div>
                    <span class="opp-score-label" [style.color]="o.accentColor">{{ o.opportunity }}% chance</span>
                  </div>
                </div>
                <div class="opp-footer">
                  <span class="opp-rec-label">Recommended</span>
                  <span class="opp-rec-action">{{ o.action }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Active Alerts Summary -->
          <div class="alerts-summary">
            <section class="content-panel">
              <div class="panel-header">
                <h2>Active Alerts</h2>
                <a routerLink="/business/alerts" class="view-all">Manage</a>
              </div>
              <div class="alert-list">
                <div class="alert-item" *ngFor="let a of activeAlerts" [ngClass]="a.severity">
                  <div class="al-dot" [ngClass]="a.severity"></div>
                  <div class="al-details">
                    <div class="al-title">{{ a.title }}</div>
                    <div class="al-meta">{{ a.meta }}</div>
                  </div>
                  <span class="al-badge" [ngClass]="a.severity">{{ a.label }}</span>
                </div>
              </div>
              <a routerLink="/business/alerts" class="panel-footer-link">Review All Alerts</a>
            </section>
          </div>
        </div>

      </ng-template>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .overview-page {
      display: flex; flex-direction: column; gap: 28px;
      max-width: 1400px; margin: 0 auto;
    }

    /* ── Welcome Row ── */
    .welcome-row {
      display: flex; align-items: center;
      justify-content: space-between; gap: 24px;
    }
    .welcome-text {
      flex-shrink: 0;
      .welcome-greeting { font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0 0 6px; }
      .welcome-sub { font-size: 13px; color: var(--text-secondary); margin: 0; }
    }
    .stat-cards { display: flex; gap: 12px; flex-shrink: 0; }
    .stat-card {
      background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 12px; padding: 10px 16px;
      display: flex; align-items: center; gap: 12px; min-width: 140px;
      transition: all 0.2s;
      &:hover { transform: translateY(-2px); border-color: var(--accent-blue); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
    }
    .stat-icon {
      width: 32px; height: 32px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      svg { width: 16px; height: 16px; }
      &.blue { background: var(--accent-blue-light); color: var(--accent-blue); }
      &.purple { background: rgba(124,58,237,0.12); color: #8B5CF6; }
      &.red { background: rgba(239,68,68,0.12); color: #EF4444; }
      &.green { background: rgba(16,185,129,0.12); color: #10B981; }
    }
    .stat-info { display: flex; flex-direction: column; gap: 2px; }
    .stat-label { font-size: 10px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-size: 16px; font-weight: 800; color: var(--text-primary); line-height: 1; }

    /* ── Layout ── */
    .dashboard-grid {
      display: grid; grid-template-columns: 1.6fr 1fr; gap: 24px;
      @media (max-width: 1100px) { grid-template-columns: 1fr; }
    }
    .skeleton-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 24px; }

    /* ── Panel Base ── */
    .content-panel {
      background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 24px; padding: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      display: flex; flex-direction: column;
    }
    .panel-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
      .title-wrap { display: flex; align-items: center; gap: 12px; }
      h2 { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0; }
      .view-all { font-size: 13px; font-weight: 600; color: var(--accent-blue); text-decoration: none; &:hover { text-decoration: underline; } }
      .risk-link {
        display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700;
        padding: 4px 12px; border-radius: 20px; text-decoration: none;
        background: rgba(239,68,68,0.1); color: #F87171; border: 1px solid rgba(239,68,68,0.2);
        svg { width: 13px; height: 13px; }
        &:hover { background: rgba(239,68,68,0.2); }
      }
    }
    .live-indicator {
      display: flex; align-items: center; gap: 6px;
      font-size: 10px; font-weight: 800; color: var(--accent-green);
      text-transform: uppercase; background: rgba(16,185,129,0.15);
      padding: 4px 10px; border-radius: 20px;
      .dot { width: 6px; height: 6px; background: var(--accent-green); border-radius: 50%; animation: pulse 2s infinite; }
    }
    .panel-footer-link {
      display: block; margin-top: 20px; text-align: center;
      font-size: 13px; font-weight: 700; color: white;
      text-decoration: none; padding: 10px; background: var(--accent-blue);
      border-radius: 12px; transition: all 0.2s;
      &:hover { background: #2563EB; }
      &.secondary {
        background: transparent; border: 1px solid var(--border);
        color: var(--text-secondary);
        &:hover { background: rgba(255,255,255,0.04); color: var(--text-primary); }
      }
    }

    /* ── Product Table ── */
    .product-table { flex: 1; }
    .product-header, .product-row {
      display: grid; grid-template-columns: 2fr 100px 110px 140px 110px;
      gap: 12px; align-items: center; padding: 0 4px;
    }
    .product-header {
      padding-bottom: 10px;
      span { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
    }
    .product-row {
      padding-top: 12px; padding-bottom: 12px;
      border-top: 1px solid var(--border); transition: background 0.15s;
      &:hover { background: rgba(255,255,255,0.02); border-radius: 12px; }
      &.risk-row { background: rgba(245,158,11,0.02); }
      &.critical-row { background: rgba(239,68,68,0.02); }
    }
    .product-info-container { display: flex; align-items: center; gap: 10px; }
    .product-img { width: 34px; height: 34px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border); flex-shrink: 0; background: #000; }
    .product-dot {
      width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
      &.healthy { background: #10B981; box-shadow: 0 0 8px rgba(16,185,129,0.4); }
      &.risk { background: #F59E0B; box-shadow: 0 0 8px rgba(245,158,11,0.4); }
      &.critical { background: #EF4444; box-shadow: 0 0 8px rgba(239,68,68,0.4); }
    }
    .product-info { display: flex; flex-direction: column; overflow: hidden; }
    .product-name { font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .product-price { font-size: 14px; font-weight: 700; color: var(--text-secondary);
      &.my { color: var(--text-primary); }
      &.comp.lower { color: #F87171; }
    }
    .margin-bar-wrap { display: flex; align-items: center; gap: 8px; }
    .margin-bar-track { flex: 1; height: 6px; background: rgba(255,255,255,0.05); border-radius: 100px; overflow: hidden; }
    .margin-bar-fill {
      height: 100%; border-radius: 100px;
      &.healthy { background: #10B981; }
      &.risk { background: #F59E0B; }
      &.critical { background: #EF4444; }
    }
    .margin-label { font-size: 12px; font-weight: 800; color: var(--text-secondary); white-space: nowrap; }
    .status-badge {
      font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 100px;
      &.healthy { background: rgba(16,185,129,0.12); color: #34D399; }
      &.risk { background: rgba(245,158,11,0.12); color: #FBBF24; }
      &.critical { background: rgba(239,68,68,0.12); color: #F87171; }
    }

    /* ── Market Feed ── */
    .market-feed { display: flex; flex-direction: column; gap: 20px; }
    .mf-item { display: flex; align-items: flex-start; gap: 14px; position: relative; }
    
    .mf-img-wrap { position: relative; width: 44px; height: 44px; flex-shrink: 0; }
    .mf-img { width: 100%; height: 100%; border-radius: 10px; object-fit: cover; border: 1px solid var(--border); }
    .mf-dir-badge {
      position: absolute; bottom: -4px; right: -4px; width: 20px; height: 20px;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      background: var(--card-bg); border: 2px solid var(--card-bg); color: #fff;
      &.up { background: #10B981; } &.down { background: #EF4444; }
      svg { width: 10px; height: 10px; }
    }

    .mf-body { flex: 1; display: flex; flex-direction: column; gap: 4px; padding-top: 2px; }
    .mf-event { font-size: 13px; font-weight: 600; color: var(--text-primary); margin: 0 0 3px; line-height: 1.4; }
    .mf-meta { font-size: 11px; color: var(--text-muted); margin: 0; }
    .mf-right { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
    .mf-change { font-size: 14px; font-weight: 800;
      &.down { color: #34D399; } &.up { color: #F87171; }
    }
    .mf-time { font-size: 11px; color: var(--text-muted); margin-top: 3px; }

    /* ── Insights ── */
    .insights-section {
      background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 16px; padding: 22px 24px;
    }
    .section-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
      .section-title {
        display: flex; align-items: center; gap: 7px;
        font-size: 13px; font-weight: 700; color: var(--text-primary);
        text-transform: uppercase; letter-spacing: 0.06em;
        svg { width: 15px; height: 15px; color: var(--accent-blue); }
      }
      .section-sub { font-size: 12px; color: var(--text-muted); }
      .section-link { margin-left: auto; font-size: 12px; color: var(--accent-blue); font-weight: 600; text-decoration: none; &:hover { text-decoration: underline; } }
    }
    .insights-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .insight-card {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 16px; border-radius: 12px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.02);
      transition: all 0.18s;
      &:hover { transform: translateY(-1px); border-color: var(--accent-blue); }
      &.insight-win { border-left: 3px solid #10B981; }
      &.insight-risk { border-left: 3px solid #EF4444; }
      &.insight-watch { border-left: 3px solid #F59E0B; }
    }
    .insight-icon-wrap {
      width: 36px; height: 36px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      svg { width: 16px; height: 16px; }
      &.icon-win { background: rgba(16,185,129,0.12); svg { color: #10B981; } }
      &.icon-risk { background: rgba(239,68,68,0.12); svg { color: #EF4444; } }
      &.icon-watch { background: rgba(245,158,11,0.12); svg { color: #F59E0B; } }
    }
    .insight-content { flex: 1; min-width: 0;
      .insight-product { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
      .insight-message { font-size: 12px; color: var(--text-secondary); line-height: 1.5; }
    }
    .insight-action {
      flex-shrink: 0;
      .insight-link { font-size: 12px; font-weight: 600; color: var(--accent-blue); text-decoration: none; white-space: nowrap; &:hover { text-decoration: underline; } }
    }

    /* ── Bottom Row ── */
    .bottom-row {
      display: grid; grid-template-columns: 1fr 340px; gap: 24px; align-items: start;
      @media (max-width: 1100px) { grid-template-columns: 1fr; }
    }
    .opp-section {
      background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 16px; padding: 22px 24px;
    }
    .opp-scroll {
      display: flex; gap: 14px; overflow-x: auto; padding-bottom: 4px;
      scrollbar-width: none; &::-webkit-scrollbar { display: none; }
    }
    .opp-card {
      flex-shrink: 0; width: 200px; background: rgba(255,255,255,0.02);
      border: 1px solid var(--border); border-radius: 16px; overflow: hidden;
      transition: all 0.2s;
      &:hover { transform: translateY(-3px); border-color: var(--accent-blue); box-shadow: 0 12px 30px rgba(0,0,0,0.4); }
    }
    .opp-img { width: 100%; height: 110px; object-fit: cover; opacity: 0.85; transition: opacity 0.2s; }
    .opp-card:hover .opp-img { opacity: 1; }
    .opp-body { padding: 12px; }
    .opp-cat { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
    .opp-name { font-size: 13px; font-weight: 600; color: var(--text-primary); margin: 4px 0 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .opp-score-wrap { display: flex; flex-direction: column; gap: 4px; }
    .opp-score-track { height: 5px; background: rgba(255,255,255,0.06); border-radius: 100px; overflow: hidden; }
    .opp-score-fill { height: 100%; border-radius: 100px; }
    .opp-score-label { font-size: 11px; font-weight: 700; }
    .opp-footer { padding: 10px 12px; border-top: 1px solid var(--border); background: rgba(255,255,255,0.01); }
    .opp-rec-label { display: block; font-size: 9px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.06em; margin-bottom: 3px; }
    .opp-rec-action { display: block; font-size: 12px; font-weight: 600; color: var(--accent-blue); }

    /* ── Alerts Summary ── */
    .alerts-summary { display: flex; flex-direction: column; }
    .alert-list { display: flex; flex-direction: column; gap: 10px; flex: 1; }
    .alert-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px; border-radius: 12px;
      border: 1px solid transparent; transition: all 0.15s;
      &:hover { background: rgba(255,255,255,0.03); }
      &.critical { background: rgba(239,68,68,0.04); border-color: rgba(239,68,68,0.1); }
      &.risk { background: rgba(245,158,11,0.03); border-color: rgba(245,158,11,0.1); }
    }
    .al-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
      &.critical { background: #EF4444; box-shadow: 0 0 8px rgba(239,68,68,0.5); }
      &.risk { background: #F59E0B; box-shadow: 0 0 8px rgba(245,158,11,0.5); }
      &.healthy { background: #10B981; }
    }
    .al-details { flex: 1; min-width: 0;
      .al-title { font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .al-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    }
    .al-badge {
      font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 100px; white-space: nowrap;
      &.critical { background: rgba(239,68,68,0.12); color: #F87171; }
      &.risk { background: rgba(245,158,11,0.12); color: #FBBF24; }
      &.healthy { background: rgba(16,185,129,0.12); color: #34D399; }
    }

    /* ── Skeleton ── */
    .skeleton-header { height: 70px; border-radius: 20px; margin-bottom: 8px; }
    .skeleton {
      background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
      background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 24px;
    }

    /* ── Animations ── */
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
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
export class BusinessOverviewComponent implements OnInit {
  authService = inject(AuthService);
  isLoading = true;

  get userName(): string {
    return this.authService.currentUser?.name?.split(' ')[0] || 'there';
  }

  get subtitle(): string {
    const critical = this.products.filter(s => s.status === 'critical').length;
    const risk = this.products.filter(s => s.status === 'risk').length;
    if (critical > 0) return `You have ${critical} critical product${critical > 1 ? 's' : ''} and ${risk} at-risk positions to review today.`;
    if (risk > 0) return `${risk} product${risk > 1 ? 's need' : ' needs'} attention — competitor prices are undercutting your marketplace visibility.`;
    return 'All prices are competitive. Monitor your catalog and stay ahead of market moves.';
  }

  stats: StatCard[] = [
    { icon: '', label: 'Products Tracked', value: 48, displayValue: 0, prefix: '', suffix: '', colorClass: 'blue' },
    { icon: '', label: 'Competitors', value: 7, displayValue: 0, prefix: '', suffix: '', colorClass: 'purple' },
    { icon: '', label: 'Price Alerts', value: 3, displayValue: 0, prefix: '', suffix: '', colorClass: 'red' },
    { icon: '', label: 'Competitiveness', value: 84, displayValue: 0, prefix: '', suffix: '%', colorClass: 'green' },
  ];

  products: ProductRow[] = [
    { name: 'Sony WH-1000XM5', category: 'Audio', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200', yourPrice: 299, lowestComp: 279, margin: 38, status: 'healthy', platform: 'Amazon' },
    { name: 'iPhone 15 Pro 256GB', category: 'Phones', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200', yourPrice: 999, lowestComp: 949, margin: 24, status: 'risk', platform: 'BestBuy' },
    { name: 'Samsung Galaxy S24 Ultra', category: 'Phones', image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=200', yourPrice: 1199, lowestComp: 1149, margin: 19, status: 'risk', platform: 'Walmart' },
    { name: 'iPad Air M2 64GB', category: 'Tablets', image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200', yourPrice: 549, lowestComp: 599, margin: 31, status: 'healthy', platform: 'Amazon' },
    { name: 'Logitech G Pro X 2', category: 'Périphériques', image: 'https://images.unsplash.com/photo-1629429464245-487019807575?w=200', yourPrice: 129, lowestComp: 119, margin: 22, status: 'healthy', platform: 'Amazon' },
  ];

  marketMoves: MarketMove[] = [
    { event: 'Sony dropped WH-1000XM5 by $20', product: 'Sony WH-1000XM5', platform: 'Amazon', change: '−$20', direction: 'down', time: '12 min ago', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200' },
    { event: 'Apple raised AirPods Pro to $279', product: 'AirPods Pro 2nd Gen', platform: 'Apple Store', change: '+$30', direction: 'up', time: '1 hr ago', image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200' },
    { event: 'BestBuy slashed Galaxy S24 Ultra', product: 'Samsung Galaxy S24 Ultra', platform: 'BestBuy', change: '−$100', direction: 'down', time: '2 hr ago', image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=200' },
    { event: 'Walmart raised Pixel 8 Pro pricing', product: 'Google Pixel 8 Pro', platform: 'Walmart', change: '+$50', direction: 'up', time: '3 hr ago', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200' },
    { event: 'Amazon dropped MacBook Air M3', product: 'MacBook Air M3 13"', platform: 'Amazon', change: '−$80', direction: 'down', time: '4 hr ago', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200' },
  ];

  insights: Insight[] = [
    { product: 'Logitech G Pro X 2', message: 'You\'re now $10 above the lowest price. Competitor dropped to $119. Review your dynamic pricing rule.', type: 'watch', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', link: '/business/catalog' },
    { product: 'Sony WH-1000XM5', message: 'You\'re now $20 above the lowest price after Sony\'s drop. Lower to $279 to recapture the #1 position on Amazon.', type: 'watch', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', link: '/business/catalog' },
    { product: 'iPad Air M2', message: 'Your price is $50 above the lowest competitor — but you\'re still #2. Target visibility maintained.', type: 'win', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', link: '/business/catalog' },
    { product: 'MacBook Air M3', message: 'Amazon dropped price by $80. You\'re now overpriced by $65. Update your pricing to stay competitive.', type: 'risk', icon: 'M13 10V3L4 14h7v7l9-11h-7z', link: '/business/competitors' },
  ];

  topOpps: TopOpp[] = [
    { name: 'Sony WH-1000XM5', category: 'Headphones', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300', opportunity: 78, action: 'Lower by $10 → capture #1', accentColor: '#10B981', accentBg: 'rgba(16,185,129,0.12)' },
    { name: 'iPad Air M2', category: 'Tablets', image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300', opportunity: 64, action: 'Bundle with accessories', accentColor: '#7C3AED', accentBg: 'rgba(124,58,237,0.12)' },
    { name: 'Keychron Q1 Max', category: 'Périphériques', image: 'https://images.unsplash.com/photo-1595225442460-394136278fc4?w=300', opportunity: 52, action: 'Set price floor alert', accentColor: '#EF4444', accentBg: 'rgba(239,68,68,0.12)' },
    { name: 'MacBook Air M3', category: 'Laptops', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300', opportunity: 45, action: 'Monitor Amazon — undercut $80', accentColor: '#F59E0B', accentBg: 'rgba(245,158,11,0.12)' },
  ];

  activeAlerts = [
    { title: 'Logitech G Pro X 2 — Watch', meta: 'Comp. undercut by $10 on Amazon', severity: 'risk', label: 'Price Risk' },
    { title: 'iPhone 15 Pro 256GB', meta: 'Comp. undercut by $50 on BestBuy', severity: 'risk', label: 'Price Risk' },
    { title: 'Samsung Galaxy S24 Ultra', meta: 'Market share dropped below 20%', severity: 'risk', label: 'Trend Loss' },
  ];

  ngOnInit() {
    setTimeout(() => {
      this.isLoading = false;
      setTimeout(() => this.animateStats(), 50);
    }, 700);
  }

  animateStats() {
    this.stats.forEach(s => this.countUp(s.value, 1000, v => s.displayValue = v));
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
}
