import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface CompDetail { seller: string; logo: string; price: number; stock: string; shipping: string; diff: number; isYou?: boolean; }

@Component({
  selector: 'app-business-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe, FormsModule],
  template: `
    <div class="prod-page" [@pageEnter]>
      <!-- ── TOP BAR / BREADCRUMB ── -->
      <div class="breadcrumb-row">
        <a routerLink="/business/catalog" class="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          Back to Catalog Tracker
        </a>
        <div class="br-actions">
          <button class="btn btn-primary" (click)="openPriceModal()">
            Update Price
          </button>
        </div>
      </div>

      <!-- ── PRODUCT HERO ── -->
      <div class="prod-hero content-panel animate-in">
        <div class="ph-main">
          <div class="ph-img-wrap">
            <img [src]="product.image" [alt]="product.name" class="ph-img">
            <div class="ph-rank" [class.rank-1]="product.rank === 1">
              <svg *ngIf="product.rank === 1" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Rank #{{ product.rank }}
            </div>
          </div>
          <div class="ph-info">
            <div class="ph-tags">
              <span class="ph-cat">{{ product.category }}</span>
              <span class="status-badge healthy">
                <span class="s-dot"></span> TOP RANKED
              </span>
            </div>
            <h1 class="ph-title">{{ product.name }}</h1>
            
            <div class="ph-stats">
              <div class="stat-card">
                <span class="sc-label">Your Price</span>
                <span class="sc-val my">{{ product.yourPrice | currency }}</span>
              </div>
              <div class="stat-card">
                <span class="sc-label">Lowest Market</span>
                <span class="sc-val comp" [class.danger]="product.lowestComp < product.yourPrice">{{ product.lowestComp | currency }}</span>
              </div>
              <div class="stat-card">
                <span class="sc-label">Stock Status</span>
                <div class="sc-margin">
                  <span class="sc-val" style="color: #10B981">In Stock</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="ph-insight" [ngClass]="product.status">
          <div class="insight-icon">
            <svg *ngIf="product.status === 'healthy'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <svg *ngIf="product.status === 'risk'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <svg *ngIf="product.status === 'critical'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          </div>
          <div class="insight-text">
            <span>Smart Insight</span>
            <h4>{{ product.insightTitle }}</h4>
            <p>{{ product.insightBody }}</p>
            <button class="insight-btn" (click)="showToast('Recommended price applied: $949.00')">Apply Recommended Price</button>
          </div>
        </div>
      </div>

      <!-- ── MAIN CONTENT GRID ── -->
      <div class="main-grid animate-in">
        
        <!-- RIGHT: Pricing Trend (Moved to left and made larger for better readability) -->
        <div class="content-panel trend-panel row-span-2">
          <div class="panel-header">
            <div>
              <h2>30-Day Market Pricing Trend</h2>
              <span class="panel-sub">Compare your pricing volatility against the market baseline.</span>
            </div>
            <div class="chart-legend">
              <div class="leg-item"><span class="leg-dot my"></span> Your Price</div>
              <div class="leg-item"><span class="leg-dot mkt"></span> Lowest Competitor</div>
            </div>
          </div>

          <!-- ENHANCED CHART -->
          <div class="chart-container">
            <div class="chart-canvas-wrap">
              <canvas #trendChart></canvas>
            </div>
          </div>

          <div class="stats-grid mt-4">
            <div class="sg-card">
              <span class="sg-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px; color:var(--text-muted)">
                   <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </span>
              <div class="sg-data">
                <span class="sg-lbl">Volatility</span>
                <span class="sg-val">Low</span>
              </div>
            </div>
             <div class="sg-card">
              <span class="sg-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px; color:var(--accent-blue)">
                  <circle cx="12" cy="8" r="7"></circle>
                  <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                </svg>
              </span>
              <div class="sg-data">
                <span class="sg-lbl">Price Rank</span>
                <span class="sg-val">#{{ product.rank }}</span>
              </div>
            </div>
            <div class="sg-card">
              <span class="sg-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px; color:#10B981">
                  <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                  <line x1="2" y1="10" x2="22" y2="10"></line>
                </svg>
              </span>
              <div class="sg-data">
                <span class="sg-lbl">Market Visibility</span>
                <span class="sg-val">84%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Competitor Leaderboard -->
        <div class="content-panel comp-panel">
          <div class="panel-header">
            <div>
              <h2>Current Offers</h2>
              <span class="panel-sub">Real-time marketplace snapshot.</span>
            </div>
            <span class="live-indicator"><span class="dot"></span> Live</span>
          </div>

          <div class="comp-list">
            <div class="comp-header">
              <span>Seller</span>
              <span class="right">Price</span>
              <span class="right">Diff</span>
            </div>
            
            <div class="comp-row" *ngFor="let c of sortedCompetitors; let i = index" [class.is-you]="c.isYou">
              <div class="cr-rank">#{{ i + 1 }}</div>
              <div class="cr-seller">
                <div class="cr-logo" [style.background]="c.isYou ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)'">
                  <svg *ngIf="c.isYou" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  <span *ngIf="!c.isYou">{{ c.seller.charAt(0) }}</span>
                </div>
                <div class="cr-info">
                  <span class="crs-name">{{ c.isYou ? 'You' : c.seller }}</span>
                  <span class="crs-meta" [class.in-stock]="c.stock === 'In Stock'" [class.out-stock]="c.stock !== 'In Stock'">{{ c.stock }}</span>
                </div>
              </div>
              <div class="cr-price right">
                {{ c.price | currency }}
                <span class="shipping">{{ c.shipping }}</span>
              </div>
              <div class="cr-diff right" [ngClass]="getDiffClass(c.diff)">
                <span class="diff-val">{{ c.diff === 0 ? 'Match' : (c.diff > 0 ? '+' : '') + (c.diff | currency) }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Toast Notification -->
      <div class="toast-notification" [class.show]="toastActive">
        <div class="toast-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div class="toast-content">{{ toastMessage }}</div>
      </div>

      <!-- Update Price Drawer -->
      <div class="drawer-overlay" *ngIf="showPriceModal" (click)="closePriceModal()" [@pageEnter]></div>
      
      <aside class="price-drawer" *ngIf="showPriceModal" [@drawerSlide]>
        <header class="drawer-header">
          <div class="header-left">
            <div class="icon-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <div>
              <h3>Update Your Price</h3>
              <p>Adjust your market position and real-time margin.</p>
            </div>
          </div>
          <button class="close-btn" (click)="closePriceModal()">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <div class="drawer-body">
          <div class="input-section">
            <label class="section-label">NEW LISTING PRICE</label>
            <div class="field-wrap">
              <span class="field-icon">💰</span>
              <input type="number" [(ngModel)]="newPrice" class="drawer-input" placeholder="0.00">
              <div class="currency-label">USD</div>
            </div>
          </div>

          <div class="drawer-divider"></div>

          <!-- Price Impact Analysis -->
          <div class="impact-card">
            <label class="section-label">REAL-TIME IMPACT</label>
            
            <div class="impact-grid">
              <div class="impact-item">
                <span class="impact-lbl">New Market Position</span>
                <span class="impact-val" [class.positive]="calculateNewGap() <= 0">{{ calculateNewGap() <= 0 ? 'Leader' : 'follower' }}</span>
              </div>
              <div class="impact-item">
                <span class="impact-lbl">Market Gap</span>
                <span class="impact-val" [ngClass]="getNewGapClass()">{{ calculateNewGap() | currency }}</span>
              </div>
            </div>

            <p class="impact-note" *ngIf="newPrice <= product.lowestComp">
              ✨ This price will lead the market.
            </p>
          </div>

          <div class="drawer-footer">
            <div class="security-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              <span>Changes reflect instantly across all channels.</span>
            </div>
            <button class="btn-save" (click)="saveNewPrice()">
              Confirm & Publish New Price
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>
        </div>
      </aside>

    </div>
  `,
  styles: [`
    :host { display: block; }
    
    .prod-page { display: flex; flex-direction: column; gap: 24px; max-width: 1400px; margin: 0 auto; }
    
    /* ── Utilities ── */
    .back-link { display: flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: 13px; font-weight: 600; text-decoration: none; transition: color 0.15s; svg { width: 16px; height: 16px; } &:hover { color: var(--text-primary); } }
    .btn { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: none; outline: none; }
    .btn svg { width: 16px; height: 16px; }
    .btn-primary { background: var(--accent-blue); color: white; box-shadow: 0 4px 12px rgba(59,130,246,0.25); &:hover { background: #2563EB; box-shadow: 0 6px 16px rgba(59,130,246,0.35); transform: translateY(-1px); } }
    .btn-secondary { background: var(--card-bg); color: var(--text-primary); border: 1px solid var(--border); &:hover { background: rgba(255,255,255,0.05); } }

    .breadcrumb-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .br-actions { display: flex; gap: 12px; }

    /* ── Panels ── */
    .content-panel { background: var(--card-bg); border: 1px solid var(--border); border-radius: 20px; box-shadow: 0 4px 24px rgba(0,0,0,0.15); }
    .panel-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .panel-header h2 { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .panel-sub { font-size: 12px; color: var(--text-muted); }

    /* ── Hero section ── */
    .prod-hero { display: flex; overflow: hidden; align-items: stretch; background: var(--card-bg); }
    .ph-main { flex: 1.5; padding: 32px; display: flex; gap: 32px; align-items: center; position: relative; }
    
    .ph-img-wrap { position: relative; width: 140px; height: 140px; flex-shrink: 0; background: #fff; border-radius: 20px; padding: 10px; box-shadow: inset 0 0 0 1px var(--border); display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .ph-img { width: 100%; height: 100%; object-fit: contain; border-radius: 12px; }
    .ph-rank { position: absolute; top: -1px; left: -1px; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); font-size: 10px; font-weight: 800; padding: 6px 14px; border-radius: 0 0 20px 0; border-right: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--text-primary); display: flex; align-items: center; gap: 4px; svg { width: 12px; } &.rank-1 { background: linear-gradient(135deg, #10B981, #059669); border-color: transparent; color: white; box-shadow: 2px 2px 12px rgba(16,185,129,0.4); } }

    .ph-info { flex: 1; display: flex; flex-direction: column; }
    .ph-tags { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
    .ph-cat { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 100px; border: 1px solid var(--border); }
    
    .status-badge { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 4px 12px; border-radius: 100px; letter-spacing: 0.05em; &.healthy { background: rgba(16,185,129,0.1); color: #34D399; } &.risk { background: rgba(245,158,11,0.1); color: #FBBF24; } &.critical { background: rgba(239,68,68,0.1); color: #F87171; } .s-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; } }

    .ph-title { font-size: 26px; font-weight: 800; color: var(--text-primary); margin: 0 0 24px; letter-spacing: -0.01em; line-height: 1.2; }

    .ph-stats { display: flex; gap: 32px; background: rgba(0,0,0,0.15); padding: 16px 24px; border-radius: 16px; border: 1px solid var(--border); width: max-content; }
    .stat-card { display: flex; flex-direction: column; gap: 6px; position: relative; }
    .stat-card:not(:last-child)::after { content: ''; position: absolute; right: -16px; top: 10%; height: 80%; width: 1px; background: var(--border); }
    .sc-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
    .sc-val { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
    .sc-val.my { color: var(--text-primary); }
    .sc-val.comp { color: var(--text-secondary); &.danger { color: #F87171; } }
    .sc-margin { display: flex; align-items: center; gap: 12px; }
    .margin-bar { width: 80px; height: 6px; background: rgba(255,255,255,0.08); border-radius: 100px; overflow: hidden; .mb-fill { height: 100%; border-radius: 100px; } }

    .ph-insight { flex: 0.8; display: flex; flex-direction: column; justify-content: center; gap: 16px; padding: 32px; border-left: 1px solid var(--border); background: linear-gradient(135deg, rgba(239,68,68,0.02), rgba(239,68,68,0.06));
      &.healthy { background: linear-gradient(135deg, rgba(16,185,129,0.03), rgba(16,185,129,0.01)); .insight-icon { background: rgba(16,185,129,0.15); color: #10B981; } .insight-btn { background: #10B981; color: #fff; box-shadow: 0 4px 12px rgba(16,185,129,0.3); } }
      &.risk { background: linear-gradient(135deg, rgba(245,158,11,0.03), rgba(245,158,11,0.01)); .insight-icon { background: rgba(245,158,11,0.15); color: #F59E0B; } .insight-btn { background: #F59E0B; color: #fff; box-shadow: 0 4px 12px rgba(245,158,11,0.3); } }
      &.critical { .insight-icon { background: rgba(239,68,68,0.15); color: #EF4444; } .insight-btn { background: #EF4444; color: #fff; box-shadow: 0 4px 12px rgba(239,68,68,0.3); } }
    }
    .insight-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; svg { width: 22px; height: 22px; } }
    .insight-text { display: flex; flex-direction: column; gap: 6px; span { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 4px; } h4 { font-size: 16px; font-weight: 700; margin: 0; color: var(--text-primary); } p { font-size: 13px; color: var(--text-secondary); margin: 0 0 12px; line-height: 1.6; } }
    .insight-btn { padding: 10px 16px; border-radius: 10px; border: none; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; width: max-content; &:hover { filter: brightness(1.1); transform: translateY(-1px); } }

    /* ── Details Grid ── */
    .main-grid { display: grid; grid-template-columns: 3fr 2fr; gap: 24px; align-items: start; }
    
    .trend-panel, .comp-panel { padding: 32px; }
    
    /* Chart Styles */
    .chart-container { margin-top: 16px; height: 320px; width: 100%; position: relative; }
    .chart-canvas-wrap { width: 100%; height: 100%; background: rgba(0,0,0,0.15); border-radius: 12px; border: 1px solid var(--border); padding: 20px; position: relative; }

    .chart-legend { display: flex; gap: 16px; font-size: 11px; font-weight: 600; color: var(--text-muted); padding-top: 4px; }
    .leg-item { display: flex; align-items: center; gap: 8px; }
    .leg-dot { width: 10px; height: 10px; border-radius: 50%; &.my { background: #3B82F6; box-shadow: 0 0 8px rgba(59,130,246,0.6); } &.mkt { background: #10B981; } }
    
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .sg-card { background: rgba(255,255,255,0.02); border: 1px solid var(--border); padding: 16px; border-radius: 16px; display: flex; align-items: center; gap: 16px; transition: background 0.2s; &:hover { background: rgba(255,255,255,0.04); } }
    .sg-icon { font-size: 16px; width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; }
    .sg-data { display: flex; flex-direction: column; gap: 4px; }
    .sg-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
    .sg-val { font-size: 16px; font-weight: 800; color: var(--text-primary); }

    /* Competitor List */
    .comp-list { display: flex; flex-direction: column; margin-top: 16px; }
    .comp-header { display: flex; padding: 0 16px 12px; border-bottom: 1px solid var(--border); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); span { flex: 1; } span.right { text-align: right; flex: 0 0 80px; } }
    
    .comp-row { display: flex; align-items: center; padding: 16px; border-bottom: 1px solid var(--border); transition: background 0.15s; &:last-child { border-bottom: none; } &:hover { background: rgba(255,255,255,0.02); } &.is-you { background: rgba(59,130,246,0.08); border-radius: 12px; border-bottom-color: transparent; } }
    .cr-rank { width: 28px; font-size: 13px; font-weight: 800; color: var(--text-muted); }
    
    .cr-seller { flex: 1; display: flex; align-items: center; gap: 12px; }
    .cr-logo { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; color: white; border: 1px solid rgba(255,255,255,0.1); }
    .cr-info { display: flex; flex-direction: column; gap: 4px; }
    .crs-name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
    .crs-meta { font-size: 11px; font-weight: 600; &.in-stock { color: #10B981; } &.out-stock { color: #EF4444; } }
    
    .cr-price { flex: 0 0 80px; display: flex; flex-direction: column; text-align: right; gap: 4px; font-size: 15px; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; .shipping { font-size: 10px; font-weight: 500; color: var(--text-muted); } }
    .cr-diff { flex: 0 0 80px; text-align: right; display: flex; align-items: center; justify-content: flex-end; }
    .diff-val { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .cr-diff.positive .diff-val { background: rgba(16,185,129,0.15); color: #10B981; }
    .cr-diff.negative .diff-val { background: rgba(239,68,68,0.15); color: #EF4444; }
    .cr-diff.neutral .diff-val { background: rgba(255,255,255,0.08); color: var(--text-secondary); }

    .live-indicator { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; color: var(--accent-blue); text-transform: uppercase; letter-spacing: 0.05em; background: rgba(59,130,246,0.15); padding: 4px 10px; border-radius: 20px; .dot { width: 6px; height: 6px; background: var(--accent-blue); border-radius: 50%; animation: pulse 2s infinite; } }

    /* Toast */
    .toast-notification { position: fixed; bottom: 32px; right: 32px; background: #fff; border-radius: 12px; padding: 14px 20px; display: flex; align-items: center; gap: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); transform: translateY(100px); opacity: 0; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); z-index: 1000; }
    .toast-notification.show { transform: translateY(0); opacity: 1; }
    .toast-icon { width: 24px; height: 24px; border-radius: 50%; background: #10B981; display: flex; align-items: center; justify-content: center; color: #fff; svg { width: 14px; } }
    .toast-content { font-size: 14px; font-weight: 700; color: #111; letter-spacing: -0.01em; }

    /* Drawer Design */
    .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(12px); z-index: 2000; }
    .price-drawer { 
      position: fixed; top: 0; right: 0; bottom: 0; 
      width: 480px; background: var(--bg-card, #0a0a0c); border-left: 1px solid var(--border);
      z-index: 2001; display: flex; flex-direction: column;
      box-shadow: -20px 0 60px rgba(0,0,0,0.5);
    }
    .drawer-header {
      padding: 40px; border-bottom: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: flex-start;
      background: linear-gradient(135deg, rgba(59,130,246,0.05) 0%, transparent 100%);
    }
    .header-left { display: flex; align-items: center; gap: 20px; }
    .icon-circle { width: 48px; height: 48px; border-radius: 14px; background: var(--accent-blue); color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 16px rgba(59,130,246,0.3); svg { width: 22px; } }
    .drawer-header h3 { font-size: 20px; font-weight: 850; color: var(--text-primary); margin: 0; letter-spacing: -0.03em; }
    .drawer-header p { font-size: 13px; color: var(--text-muted); margin: 6px 0 0; }
    .close-btn { width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--border); background: rgba(255,255,255,0.03); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; &:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); } svg { width: 18px; } }

    .drawer-body { padding: 40px; display: flex; flex-direction: column; gap: 32px; overflow-y: auto; }
    .section-label { font-size: 11px; font-weight: 850; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px; }
    .field-wrap { position: relative; }
    .field-icon { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); font-size: 18px; }
    .drawer-input {
      width: 100%; height: 56px; background: rgba(255,255,255,0.03); border: 1px solid var(--border);
      border-radius: 16px; padding: 0 60px 0 54px; color: var(--text-primary); font-size: 18px; font-weight: 700;
      transition: all 0.3s;
      &:focus { background: rgba(59,130,246,0.02); border-color: var(--accent-blue); box-shadow: 0 0 0 4px rgba(59,130,246,0.1); outline: none; }
    }
    .currency-label { position: absolute; right: 18px; top: 50%; transform: translateY(-50%); font-size: 12px; font-weight: 800; color: var(--text-muted); }

    .drawer-divider { height: 1px; background: var(--border); }

    /* Impact Card */
    .impact-card { background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 20px; padding: 24px; animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .impact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .impact-item { display: flex; flex-direction: column; gap: 6px; }
    .impact-lbl { font-size: 12px; color: var(--text-muted); font-weight: 600; }
    .impact-val { font-size: 20px; font-weight: 850; letter-spacing: -0.02em; &.negative { color: #EF4444; } &.positive { color: #10B981; } }
    .impact-bar-wrap { height: 6px; background: rgba(255,255,255,0.06); border-radius: 100px; overflow: hidden; margin-bottom: 16px; }
    .impact-bar-fill { height: 100%; border-radius: 100px; transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    .impact-note { font-size: 12px; font-weight: 700; color: #34D399; margin: 0; display: flex; align-items: center; gap: 6px; }

    .drawer-footer { margin-top: auto; display: flex; flex-direction: column; gap: 20px; }
    .security-note { display: flex; gap: 10px; font-size: 12px; color: var(--text-muted); align-items: center; background: rgba(255,255,255,0.03); padding: 12px 16px; border-radius: 12px; svg { width: 14px; } }
    .btn-save {
      width: 100%; height: 60px; background: var(--accent-blue); color: white; border: none; border-radius: 18px;
      font-size: 16px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px;
      box-shadow: 0 10px 20px rgba(59,130,246,0.3); transition: all 0.3s;
      &:hover { transform: translateY(-2px); box-shadow: 0 15px 30px rgba(59,130,246,0.4); background: #2563EB; }
      svg { width: 20px; transition: transform 0.2s; }
      &:hover svg { transform: translateX(4px); }
    }
  `],
  animations: [
    trigger('pageEnter', [
      transition(':enter', [
        query('.animate-in', [
          style({ opacity: 0, transform: 'translateY(15px)' }),
          stagger(100, [
            animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('drawerSlide', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('400ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateX(100%)' }))
      ])
    ])
  ]
})
export class BusinessProductDetailComponent implements OnInit, AfterViewInit {
  route = inject(ActivatedRoute);
  
  @ViewChild('trendChart', { static: false }) chartRef!: ElementRef;
  chartInstance: any;

  toastActive = false;
  toastMessage = '';
  toastTimeout: any;

  showPriceModal = false;
  newPrice: number = 0;

  product = {
    id: '2', name: 'iPhone 15 Pro 256GB Titanium', category: 'Smartphones', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
    yourPrice: 999, lowestComp: 949, margin: 24, status: 'risk', rank: 2,
    insightTitle: 'Action Required: Price Match', insightBody: 'BestBuy has undercut your price by $50. Drop to $949 to secure the Buy Box. This will reduce your margin to 19%.',
    yourHistory: [1049, 1049, 1049, 1029, 999, 999, 999, 999, 999, 999],
    marketHistory: [1029, 1029, 1019, 1019, 999, 989, 969, 949, 949, 949]
  };

  competitors: CompDetail[] = [
    { seller: 'BestBuy', logo: 'B', price: 949, stock: 'In Stock', shipping: 'Free Next Day', diff: -50, isYou: false },
    { seller: 'PulsePrice', logo: 'P', price: 999, stock: 'In Stock', shipping: 'Free Standard', diff: 0, isYou: true },
    { seller: 'Amazon', logo: 'A', price: 1049, stock: 'Low Stock', shipping: 'Free 2-Day', diff: 50, isYou: false },
    { seller: 'Target', logo: 'T', price: 1099, stock: 'Out of Stock', shipping: 'Pick Up', diff: 100, isYou: false },
    { seller: 'Walmart', logo: 'W', price: 1099, stock: 'In Stock', shipping: '$5.99 Ship', diff: 100, isYou: false },
  ];

  sortedCompetitors = this.competitors.sort((a,b) => a.price - b.price);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {});
  }

  ngAfterViewInit() {
    this.initChart();
  }

  initChart() {
    if (!this.chartRef) return;
    const ctx = this.chartRef.nativeElement.getContext('2d');
    
    // Create Gradients
    const myGradient = ctx.createLinearGradient(0, 0, 0, 400);
    myGradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    myGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
    
    const mktGradient = ctx.createLinearGradient(0, 0, 0, 400);
    mktGradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
    mktGradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

    const labels = ['Mar 1', 'Mar 4', 'Mar 8', 'Mar 12', 'Mar 15', 'Mar 18', 'Mar 21', 'Mar 25', 'Mar 28', 'Today'];

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Your Price',
            data: this.product.yourHistory,
            borderColor: '#3B82F6',
            backgroundColor: myGradient,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#3B82F6',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7
          },
          {
            label: 'Market Low',
            data: this.product.marketHistory,
            borderColor: '#10B981',
            backgroundColor: mktGradient,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#10B981',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0,0,0,0.8)',
            titleFont: { size: 13, family: 'Inter' },
            bodyFont: { size: 14, weight: 'bold', family: 'Inter' },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                if (context.parsed.y !== null) {
                  label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)', display: false },
            ticks: { color: '#8b949e', font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            border: { dash: [4, 4] },
            ticks: {
              color: '#8b949e', 
              font: { family: 'Inter', size: 11 },
              callback: (value) => '$' + value
            },
            suggestedMin: 900,
            suggestedMax: 1060
          }
        }
      }
    });
  }

  getMarginColor(): string {
    if (this.product.status === 'healthy') return '#10B981';
    if (this.product.status === 'risk') return '#F59E0B';
    return '#EF4444';
  }

  getDiffClass(diff: number): string {
    if (diff === 0) return 'neutral';
    return diff < 0 ? 'negative' : 'positive';
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    this.toastActive = true;
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastActive = false;
    }, 3000);
  }

  openPriceModal() {
    this.newPrice = this.product.yourPrice;
    this.showPriceModal = true;
  }

  closePriceModal() {
    this.showPriceModal = false;
  }

  saveNewPrice() {
    if (this.newPrice && this.newPrice > 0) {
      this.product.yourPrice = this.newPrice;
      
      // Update the chart history dynamically to reflect the drop immediately
      this.product.yourHistory[this.product.yourHistory.length - 1] = this.newPrice;
      if (this.chartInstance) {
        this.chartInstance.update();
      }

      // Update competitor table "You" label price
      const youIdx = this.sortedCompetitors.findIndex(c => c.isYou);
      if (youIdx > -1) {
        this.sortedCompetitors[youIdx].price = this.newPrice;
        // Recalculate diffs based on lowest
        const lowestExceptYou = Math.min(...this.sortedCompetitors.filter(c => !c.isYou).map(c => c.price));
        this.sortedCompetitors.forEach(c => c.diff = c.price - lowestExceptYou);
        this.sortedCompetitors.sort((a,b) => a.price - b.price);
      }

      this.showToast(`Price successfully updated to $${this.newPrice.toFixed(2)}`);
      this.closePriceModal();
    }
  }

  calculateNewMargin(): number {
    if (!this.newPrice) return 0;
    // Mock calculation: Your cost is roughly 750
    const cost = 750;
    const margin = ((this.newPrice - cost) / this.newPrice) * 100;
    return Math.max(0, Math.round(margin * 10) / 10);
  }

  calculateNewGap(): number {
    return this.newPrice - this.product.lowestComp;
  }

  getNewMarginColor(): string {
    const margin = this.calculateNewMargin();
    if (margin >= 20) return '#10B981';
    if (margin >= 10) return '#F59E0B';
    return '#EF4444';
  }

  getNewGapClass(): string {
    const gap = this.calculateNewGap();
    if (gap === 0) return 'neutral';
    return gap > 0 ? 'negative' : 'positive';
  }
}
