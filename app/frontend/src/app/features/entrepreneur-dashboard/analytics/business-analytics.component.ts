import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, QueryList, ViewChildren } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERFACES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface KPI {
  label: string;
  value: string;
  delta: string;
  isPositive: boolean;
  color: string;
  trend: number[];
}

interface PlatformStat {
  name: string;
  logo: string;
  items: number;
  avgPrice: number;
  visibilityScore: number;
  marketShare: number;
  trend: number[];
}

interface Product {
  name: string;
  popularityScore: number;
  visibility: number;
  image: string;
  history: number[];
}

interface Insight {
  type: 'win' | 'risk' | 'watch';
  title: string;
  message: string;
  product?: string;
  timeAgo: string;
}

interface CompetitorRank {
  name: string;
  score: number;
  visibilityScore: number;
  avgPrice: number;
  skus: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

@Component({
  selector: 'app-business-analytics',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DecimalPipe, RouterModule],
  animations: [
    trigger('drawerSlide', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('400ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateX(100%)' }))
      ])
    ]),
    trigger('pageEnter', [
      transition(':enter', [
        query('.animate-in', [
          style({ opacity: 0, transform: 'translateY(15px)' }),
          stagger(100, [
            animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ],
  template: `
    <div class="analytics-page">
      <!-- 1. PAGE HEADER -->
      <section class="page-top">
        <div class="header-main">
          <h1>Analytics Overview</h1>
          <p class="description">Enterprise market intelligence and cross-platform performance metrics.</p>
        </div>
        <div class="global-actions">

           <div class="segmented-control">
               <button *ngFor="let range of dateRanges" 
                       [class.active]="activeRange === range"
                       (click)="onRangeChange(range)">
                 {{ range }}
               </button>
           </div>
            <button class="export-btn-premium" (click)="downloadReport()">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
               <span>{{ isGeneratingReport ? 'Generating...' : 'Download Report' }}</span>
            </button>
        </div>
      </section>

      <!-- NEW: VIEW TABS -->
      <div class="main-view-tabs">
        <button class="view-tab" [class.active]="activeTab === 'market'" (click)="setTab('market')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
          Market Intelligence
        </button>
        <button class="view-tab" [class.active]="activeTab === 'products'" (click)="setTab('products')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Products & Categories
        </button>
      </div>

      <!-- 2. KPI HERO BANNER -->
      <section class="kpi-banner-wrap" [class.d-none]="activeTab !== 'market'">
        <div class="kpi-grid-refined">
          <div class="kpi-box-refined" *ngFor="let kpi of kpis">
             <div class="top-row">
                <span class="label-heading">{{ kpi.label }}</span>
                <span class="delta-badge" [style.color]="kpi.color" [style.background-color]="kpi.color + '15'">
                  {{ kpi.delta }}
                </span>
             </div>
             <div class="value-main-row">
                <h2 class="tabular-nums">{{ kpi.value }}</h2>
             </div>
             <div class="footer-row">
                <span class="comparison-text" [style.color]="kpi.isPositive ? 'var(--success)' : 'var(--danger)'">
                  {{ kpi.delta }} vs last period
                </span>
                <div class="mini-spark-container">
                   <canvas #sparklineCanvas></canvas>
                </div>
             </div>
          </div>
        </div>
      </section>

      <!-- 3.1 DESCRIPTIVE STATS & BAR CHART (PRODUCTS TAB) -->
      <section class="analysis-layout-grid" [class.d-none]="activeTab !== 'products'" style="grid-template-columns: 1fr 1fr;">
        <!-- Avg Price by Category & Platform Chart -->
        <div class="panel-card chart-hero-panel">
          <div class="panel-header">
             <div class="title-meta-stack">
                <h3>Average Price by Category & Platform</h3>
                <p class="subtitle-muted">Which platform is cheapest per category?</p>
             </div>
          </div>
          <div class="panel-body chart-height-fixed professional-chart-wrap" style="height: 420px;">
             <canvas #groupedBarCanvas></canvas>
          </div>
        </div>

        <!-- Descriptive Statistics Table -->
        <div class="panel-card category-side-panel">
           <div class="panel-header">
              <div class="title-meta-stack">
                 <h3>Descriptive Statistics by Category</h3>
                 <p class="subtitle-muted">Last 30 days across all platforms</p>
              </div>
           </div>
           <div class="table-container-scroll" style="margin-top: 10px;">
              <table class="data-table-premium ttest-table compact-table">
                 <thead>
                    <tr>
                       <th class="l-align">CATEGORY</th>
                       <th>MEAN</th>
                       <th>MEDIAN</th>
                       <th>STD DEV</th>
                       <th>MIN</th>
                       <th>MAX</th>
                    </tr>
                 </thead>
                 <tbody>
                    <tr *ngFor="let stat of descriptiveStats">
                       <td class="l-align"><strong>{{ stat.category }}</strong></td>
                       <td class="tabular-nums">{{ stat.mean | currency:'USD':'symbol':'1.0-0' }}</td>
                       <td class="tabular-nums">{{ stat.median | currency:'USD':'symbol':'1.0-0' }}</td>
                       <td class="tabular-nums font-weight-700" [style.color]="getStdDevColor(stat.stdDev)">{{ stat.stdDev | currency:'USD':'symbol':'1.0-0' }}</td>
                       <td class="tabular-nums font-weight-700" style="color: var(--success)">{{ stat.min | currency:'USD':'symbol':'1.0-0' }}</td>
                       <td class="tabular-nums font-weight-700" style="color: var(--danger)">{{ stat.max | currency:'USD':'symbol':'1.0-0' }}</td>
                    </tr>
                 </tbody>
              </table>
           </div>
        </div>
      </section>

      <!-- 3.2 REGRESSION & CORRELATION (PRODUCTS TAB) -->
      <section class="analysis-layout-grid" [class.d-none]="activeTab !== 'products'" style="margin-top: 24px; grid-template-columns: 1.8fr 1fr;">
        <!-- Regression Scatter -->
        <div class="panel-card chart-hero-panel">
          <div class="panel-header">
             <div class="title-meta-stack">
                <h3>Scatter Plot with Regression Line: Product Rating vs. Price (USD)</h3>
             </div>
          </div>
          <div class="panel-body chart-height-fixed professional-chart-wrap" style="height: 380px;">
             <canvas #scatterRegressionCanvas></canvas>
             <div class="r2-annotation">
               <strong>R² annotation on chart:</strong>
               <span>Rating explains 18% of price variation</span>
             </div>
          </div>
        </div>

        <!-- Correlation Matrix Products -->
        <div class="panel-card category-side-panel">
           <div class="panel-header">
              <div class="title-meta-stack">
                 <h3>Correlation Matrix</h3>
                 <p class="subtitle-muted">Pearson r — price vs rating vs reviews</p>
              </div>
           </div>
           <div class="panel-body" style="display:flex; justify-content:center; align-items:center; height: 100%; min-height: 300px;">
              <div class="prod-correlation-grid">
                 <!-- Header Row -->
                 <div class="header-cell"></div>
                 <div class="header-cell" *ngFor="let label of prodCorrelationLabels">{{ label }}</div>

                 <!-- Data Rows -->
                 <ng-container *ngFor="let row of prodCorrelationData; let i = index">
                    <div class="header-cell side">{{ prodCorrelationLabels[i] }}</div>
                    <div class="data-cell" *ngFor="let val of row" 
                         [style.background-color]="getProdCorrelationBg(val)"
                         [style.color]="getProdCorrelationText(val)">
                       {{ val > 0 ? (val === 1 ? '1.00' : (val | number:'1.2-2')) : (val | number:'1.2-2') }}
                    </div>
                 </ng-container>
              </div>
           </div>
        </div>
      </section>

      <!-- 4. MARKET LEADERBOARD -->
      <section class="panel-card full-span-card" [class.d-none]="activeTab !== 'market'">
        <div class="panel-header space-between-center">
           <div class="stacked-title">
              <h3>Market Leaderboard</h3>
              <p class="subtitle-muted">Competitor strength scoring based on win-rate and pricing.</p>
           </div>
           <span class="time-label">LATEST 7D</span>
        </div>
        <div class="panel-body">
           <div class="competitors-tiles-row">
              <div class="comp-tile-premium" *ngFor="let r of competitorRanks; let i = index" [class.leader-gold-top]="i === 0">
                 <div class="dim-rank-bg">#{{ i+1 }}</div>
                 <div class="comp-top-info">
                    <div class="comp-avatar">{{ r.name.charAt(0) }}</div>
                    <span class="comp-brand-name">{{ r.name }}</span>
                 </div>
                 <div class="comp-score-big">
                    <div class="score-group">
                       <span class="val-num-bold">{{ r.score }}</span>
                       <span class="trend-indicator" [style.color]="r.trend === 'up' ? 'var(--success)' : (r.trend === 'down' ? 'var(--danger)' : 'var(--text-muted)')">
                          {{ r.trend === 'up' ? '↑' : (r.trend === 'down' ? '↓' : '→') }}
                       </span>
                    </div>
                    <span class="score-cap">Competitiveness</span>
                 </div>
                 <div class="comp-stats-grid">
                    <div class="m-stat">
                       <span class="m-label">VISIBILITY</span>
                       <span class="m-value">{{ r.visibilityScore }}%</span>
                    </div>
                    <div class="m-sep"></div>
                    <div class="m-stat">
                       <span class="m-label">AVG PRICE</span>
                       <span class="m-value">{{ r.avgPrice | currency }}</span>
                    </div>
                 </div>
                 <div class="comp-foot-progress">
                    <div class="bar-track"><div class="bar-fill" [style.width.%]="(r.score / 1000) * 100" [style.background-color]="r.color"></div></div>
                 </div>
              </div>
           </div>
        </div>
      </section>

      <!-- 4.1 PRICE GAP HEATMAP -->
      <section class="panel-card full-span-card" [class.d-none]="activeTab !== 'market'">
        <div class="panel-header">
          <div class="stacked-title">
            <h3>Price Gap Heatmap — Vendor vs Each Competitor</h3>
            <p class="subtitle-muted">Detailed price disparity across categories and platforms.</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="heatmap-table-container">
            <table class="heatmap-table">
              <thead>
                <tr>
                  <th class="sticky-col">Category</th>
                  <th *ngFor="let comp of priceGapHeatmap.competitors">{{ comp }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let cat of priceGapHeatmap.categories">
                  <td class="sticky-col cat-name-cell">{{ cat.name }}</td>
                  <td *ngFor="let gap of cat.gaps; let i = index">
                    <div class="heatmap-cell" [style.background-color]="getHeatmapColor(gap)">
                      <div class="heat-dot" [style.background-color]="getHeatmapDotColor(gap)" [style.color]="getHeatmapDotColor(gap)"></div>
                      <span class="gap-val" [style.color]="getHeatmapTextColor(gap)">{{ gap > 0 ? '+' : '' }}{{ gap | currency }}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="heatmap-legend">
            <div class="legend-entry">
              <span class="heat-dot" style="background-color: #5B9D70; color: #5B9D70;"></span>
              <span>Sage = vendor is cheaper</span>
            </div>
            <div class="legend-entry">
              <span class="heat-dot" style="background-color: #D86A58; color: #D86A58;"></span>
              <span>Terracotta = competitor is cheaper</span>
            </div>
            <div class="legend-entry">
              <span class="heat-dot" style="background-color: rgba(168, 162, 158, 0.6); color: rgba(168, 162, 158, 0.6);"></span>
              <span>Neutral = price parity</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 4.2 CATEGORY-LEVEL T-TEST -->
      <section class="panel-card full-span-card" [class.d-none]="activeTab !== 'market'">
        <div class="panel-header">
          <div class="stacked-title">
            <h3>Category-Level t-test Results</h3>
            <p class="subtitle-muted">Statistical significance of price differences vs market average.</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="table-container-scroll">
            <table class="data-table-premium ttest-table">
              <thead>
                <tr>
                  <th class="l-align">Category</th>
                  <th>My avg price</th>
                  <th>Market avg</th>
                  <th>Gap</th>
                  <th>p-value</th>
                  <th>Verdict</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let res of ttestResults">
                  <td class="l-align"><strong>{{ res.category }}</strong></td>
                  <td class="tabular-nums">{{ res.myPrice | currency }}</td>
                  <td class="tabular-nums">{{ res.marketPrice | currency }}</td>
                  <td class="tabular-nums" [style.color]="res.gap > 0 ? 'var(--danger)' : 'var(--success)'">
                    {{ res.gap > 0 ? '+' : '' }}{{ res.gap | currency }}
                  </td>
                  <td class="tabular-nums font-weight-700">{{ res.pValue }}</td>
                  <td>
                    <div class="verdict-pill" [class.sig]="res.significant" [class.expensive]="res.expensive">
                      <svg *ngIf="res.significant" class="v-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      <svg *ngIf="!res.significant" class="v-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      <span>{{ res.verdict }}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- 5. STATISTICAL CORRELATION -->
      <section class="panel-card full-span-card" [class.d-none]="activeTab !== 'market'">
         <div class="panel-header">
            <h3>Diagnostic Correlation Matrix</h3>
         </div>
         <div class="panel-body">
            <div class="correlation-view-split">
               <!-- HEATMAP -->
               <div class="heatmap-section">
                  <div class="section-title-box">
                     <h4>Metric Interdependence</h4>
                     <p>Quantifying how metrics drive performance</p>
                  </div>
                  <div class="heatmap-grid-display">
                     <div class="matrix-top-labels">
                        <div class="corner-pad"></div>
                        <span class="top-label" *ngFor="let label of productLabels">{{ label }}</span>
                     </div>
                     <div class="matrix-row-entry" *ngFor="let row of correlationData; let i = index">
                        <span class="side-label">{{ productLabels[i] }}</span>
                        <div class="cell-strip">
                           <div class="matrix-heat-cell" *ngFor="let val of row" 
                                [style.background-color]="getCorrelationColor(val)">
                              {{ val }}
                           </div>
                        </div>
                     </div>
                  </div>
                  <div class="heatmap-key-scale">
                     <span class="key-txt">Negative</span>
                     <div class="key-gradient"></div>
                     <span class="key-txt">Positive</span>
                  </div>
               </div>

               <!-- INSIGHTS -->
               <div class="insights-summary-section">
                  <div class="section-title-box">
                     <h4>Strategic Implications</h4>
                     <p>Extracted patterns for catalog optimization</p>
                  </div>
                  <div class="insights-list-vertical">
                     <div class="insight-row-modern" *ngFor="let insight of correlationInsights">
                        <div class="status-dot-lrg" [style.background-color]="insight.color"></div>
                        <div class="insight-meta-stack">
                           <span class="insight-heading-bold">{{ insight.label }}</span>
                           <span class="insight-detail-txt">{{ insight.explanation }}</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      <!-- 6. MARKETPLACE TABLE -->
      <section class="panel-card full-span-card" [class.d-none]="activeTab !== 'market'">
         <div class="panel-header">
            <h3>Channel Performance Analysis</h3>
         </div>
         <div class="table-container-scroll">
            <table class="data-table-premium">
               <thead>
                  <tr>
                     <th class="l-align">Channel</th>
                     <th>Catalog</th>
                     <th>Avg Unit Price</th>
                     <th>Visibility</th>
                     <th>Market Share</th>
                     <th>Volatility</th>
                  </tr>
               </thead>
               <tbody>
                  <tr *ngFor="let p of platformStats">
                     <td class="l-align">
                        <div class="channel-identity">
                           <div class="channel-avatar-box">{{ p.name.charAt(0) }}</div>
                           <span class="channel-name-bold">{{ p.name }}</span>
                        </div>
                     </td>
                     <td class="tabular-nums">{{ p.items }} Items</td>
                     <td class="tabular-nums font-weight-700">{{ p.avgPrice | currency }}</td>
                     <td>
                        <div class="win-chance-row">
                           <div class="chance-track-base"><div class="chance-fill-active" [style.width.%]="p.visibilityScore" [style.background-color]="getScoreColorByValue(p.visibilityScore)"></div></div>
                           <span class="tabular-nums txt-tiny">{{ p.visibilityScore }}%</span>
                        </div>
                     </td>
                     <td>
                        <div class="share-distribution-row">
                           <div class="distribution-track-wide">
                              <div class="distribution-fill-wide" [style.width.%]="p.marketShare" [style.background-color]="getPlatformColor(p.name)"></div>
                           </div>
                           <span class="tabular-nums txt-tiny">{{ p.marketShare }}%</span>
                        </div>
                     </td>
                     <td>
                        <div class="spark-table-wrap">
                           <canvas class="canvas-spark-table" #tableTrendCanvas></canvas>
                        </div>
                     </td>
                  </tr>
               </tbody>
            </table>
         </div>
      </section>

      <!-- 7. STATISTICAL SIGNIFICANCE (PRODUCTS TAB) -->
      <section class="panel-card full-span-card" style="margin-top: 24px;" [class.d-none]="activeTab !== 'products'">
         <div class="panel-header">
            <div class="stats-header-group">
               <div class="stats-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 6l-9.5 9.5-5-5L1 18"></path><path d="M17 6h6v6"></path></svg></div>
               <h3>Statistical Significance & Reliability</h3>
            </div>
         </div>
         <div class="panel-body" style="padding: 24px;">
            <div class="stats-feed-vertical">
               <div class="stats-card-insight" *ngFor="let insight of insights" [style.border-left-color]="getInsightColor(insight.type)">
                  <div class="stats-card-meta-top">
                     <span class="stats-title-txt-bold">{{ insight.title }}</span>
                     <span class="stats-time-label-muted">{{ insight.timeAgo }}</span>
                  </div>
                  <p class="stats-detail-txt-muted">{{ insight.message }}</p>
                  <div class="stats-action-footer">
                     <button class="btn-action-outline" (click)="showStatsDetail(insight)">View Detailed Stats</button>
                  </div>
               </div>
            </div>
         </div>
      </section>

      <div class="drawer-overlay" *ngIf="showStatsModal" (click)="closeStatsModal()" [@pageEnter]></div>
      
      <aside class="stats-drawer" *ngIf="showStatsModal" [@drawerSlide]>
        <header class="drawer-header">
          <div class="header-left">
            <div class="icon-circle" [style.background-color]="getInsightColor(selectedInsight?.type || '')">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93"></path>
               </svg>
            </div>
            <div>
              <h3>{{ selectedInsight?.title }}</h3>
              <p>Analytical Data Analysis & Significance</p>
            </div>
          </div>
          <button class="close-btn" (click)="closeStatsModal()">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <div class="drawer-body">
          <div class="stats-premium-grid">
            <div class="stats-summary-hero-modern">
              <div class="hero-metric-pill" [style.border-left-color]="getInsightColor(selectedInsight?.type || '')">
                <span class="m-label">CONFIDENCE</span>
                <span class="m-val">98.4%</span>
              </div>
              <div class="hero-metric-pill" [style.border-left-color]="getInsightColor(selectedInsight?.type || '')">
                <span class="m-label">P-VALUE</span>
                <span class="m-val">0.0042</span>
              </div>
              <div class="hero-metric-pill" [style.border-left-color]="getInsightColor(selectedInsight?.type || '')">
                <span class="m-label">STABILITY</span>
                <span class="m-val">HIGH</span>
              </div>
            </div>

            <div class="detail-content-block-refined">
              <p class="stats-description-lrg">
                {{ selectedInsight?.message }}
              </p>
              
              <div class="variance-chart-container">
                <div class="chart-header-row">
                  <span class="c-title">Variance Distribution</span>
                </div>
                <canvas class="modal-variance-canvas" #modalVarianceCanvas></canvas>
              </div>

              <div class="stats-methodology-box">
                <div class="method-item">
                  <span class="meth-icon">∫</span>
                  <div class="meth-text">
                    <strong>ANOVA Variance</strong>
                    <span>Cross-platform price delta analysis</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="drawer-footer">
          <div class="security-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <span>Analysis computed in real-time based on selected date range.</span>
          </div>
          <button class="btn-save" (click)="closeStatsModal()">
            Close Analysis
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .d-none { display: none !important; }
    .analytics-page {
      --bg: var(--main-bg);
      --card-bg: var(--panel-bg);
      --border: rgba(255, 255, 255, 0.08); /* Making borders clearer in white as requested */
      --text-main: var(--text-primary);
      --text-muted: var(--text-secondary);
      --accent: var(--accent-blue);
      --h-green: #10b981;
      --h-red: #e11d48;
      display: block;
      width: 100%;
      background: var(--bg);
    }

    .analytics-page {
      padding: 32px;
      display: flex;
      flex-direction: column;
      gap: 32px;
      max-width: 1600px;
      margin: 0 auto;
    }

    /* VIEW TABS */
    .main-view-tabs { display: flex; gap: 32px; border-bottom: 1px solid var(--border); margin-bottom: -12px; padding-bottom: 0px; }
    .view-tab {
      background: none; border: none; font-size: 15px; font-weight: 600; color: var(--text-muted); cursor: pointer; padding: 0 0 16px 0; position: relative; transition: all 0.2s; display: flex; align-items: center; gap: 8px;
    }
    .view-tab svg { width: 18px; opacity: 0.7; }
    .view-tab:hover { color: var(--text-main); }
    .view-tab.active { color: var(--accent); }
    .view-tab.active svg { opacity: 1; }
    .view-tab.active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 3px; background: var(--accent); border-radius: 3px 3px 0 0; }

    /* STANDARDIZED PANEL STYLES - Matching Overview Page */
    .panel-card { 
      background: var(--card-bg); 
      border: 1px solid var(--border); 
      border-radius: 20px; 
      display: flex; 
      flex-direction: column; 
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    }
    .panel-header { 
      padding: 24px 32px; 
      border-bottom: 1px solid var(--border); 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
    }
    .panel-header h3 { font-size: 16px; font-weight: 700; color: var(--text-main); margin: 0; }
    .panel-body { padding: 32px; }

    /* PAGE HEADER */
    .page-top { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 24px; }
    .header-main h1 { font-size: 24px; font-weight: 800; color: var(--text-main); margin: 0 0 8px 0; letter-spacing: -0.02em; }
    .description { color: var(--text-muted); font-size: 15px; font-weight: 500; margin: 0; }

    .segmented-control { background: rgba(0,0,0,0.06); border-radius: 10px; padding: 4px; display: flex; gap: 2px; }
    :host-context(html:not(.light-mode)) .segmented-control { background: rgba(255,255,255,0.04); }
    .segmented-control button { border: none; background: transparent; color: var(--text-muted); padding: 8px 16px; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; }
    .segmented-control button.active { background: var(--card-bg); color: var(--text-main); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

    .export-btn-premium { background: var(--accent); border: none; color: white; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); }
    .export-btn-premium:hover { opacity: 0.9; transform: translateY(-1px); }
    .global-actions { display: flex; gap: 20px; align-items: center; }

    /* KPI HERO BANNER */
    .kpi-banner-wrap { width: 100%; }
    .kpi-grid-refined { 
       display: grid; 
       grid-template-columns: repeat(5, 1fr); 
       gap: 16px; 
    }
    .kpi-grid-refined.market-grid {
       grid-template-columns: repeat(3, 1fr);
       max-width: 900px;
    }
    .kpi-box-refined { 
       background: var(--card-bg); 
       border: 1px solid var(--border);
       padding: 24px; 
       border-radius: 20px;
       display: flex; 
       flex-direction: column; 
       gap: 16px; 
       transition: 0.2s; 
       box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .kpi-box-refined:hover { transform: translateY(-3px); border-color: var(--accent); }
    .kpi-box-refined .top-row { display: flex; justify-content: space-between; align-items: center; min-height: 24px; }
    .label-heading { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
    .delta-badge { font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 6px; white-space: nowrap; }
    .value-main-row h2 { font-size: 28px; font-weight: 800; margin: 0; color: var(--text-main); letter-spacing: -0.03em; }
    .footer-row { display: flex; justify-content: space-between; align-items: center; }
    .comparison-text { font-size: 11px; font-weight: 600; }
    .mini-spark-container { width: 50px; height: 18px; position: relative; }

    /* PRICE PERFORMANCE ENHANCEMENTS */
    .title-meta-stack { display: flex; flex-direction: column; gap: 12px; }
    .chart-summary-badges { display: flex; gap: 16px; align-items: center; }
    .s-badge { display: flex; flex-direction: column; gap: 2px; padding: 4px 16px; border-radius: 8px; border-left: 3px solid transparent; background: rgba(0,0,0,0.02); }
    :host-context(html:not(.light-mode)) .s-badge { background: rgba(255,255,255,0.03); }
    .performance-badge { border-left-color: var(--accent); }
    .s-badge.visibility { border-left-color: var(--success); }
    .s-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .s-val { font-size: 15px; font-weight: 800; color: var(--text-main); }
    .professional-chart-wrap { position: relative; padding-top: 10px; }
    .panel-footer-legend { display: flex; gap: 24px; padding: 16px 32px; border-top: 1px solid var(--border); background: rgba(0,0,0,0.1); }
    .legend-pill { display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 700; color: var(--text-main); }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .legend-line { width: 24px; height: 2px; border-radius: 1px; display: inline-block; }

    /* ANALYSIS LAYOUT GRID */
    .analysis-layout-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
    .view-mode-pill { display: flex; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: rgba(0,0,0,0.1); padding: 3px; gap: 2px; }
    .view-mode-pill button { border: none; background: transparent; color: var(--text-muted); padding: 6px 14px; font-size: 11px; font-weight: 700; cursor: pointer; transition: 0.2s; border-radius: 7px; }
    .view-mode-pill button.p-active { background: var(--accent); color: white; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3); }
    .chart-height-fixed { position: relative; height: 380px; }

    .donut-hero-container { position: relative; height: 180px; display: flex; justify-content: center; margin-bottom: 32px; }
    .donut-center-meta { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); text-align: center; }
    .center-val { display: block; font-size: 26px; font-weight: 900; color: var(--text-main); line-height: 1; }
    .center-sub { font-size: 10px; font-weight: 800; color: var(--text-muted); letter-spacing: 0.1em; margin-top: 4px; display: block; }

    .category-legend-stack { display: flex; flex-direction: column; gap: 10px; }
    .legend-item-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-radius: 10px; background: rgba(0,0,0,0.02); }
    :host-context(html:not(.light-mode)) .legend-item-row { background: rgba(255,255,255,0.03); }
    .legend-key { display: flex; align-items: center; gap: 12px; font-size: 13px; font-weight: 600; color: var(--text-main); }
    .legend-color-dot { width: 8px; height: 8px; border-radius: 50%; }
    .legend-val { font-weight: 800; color: var(--text-main); font-size: 14px; }

    /* MARKET LEADERBOARD */
    .full-span-card { width: 100%; }
    .competitors-tiles-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
    .comp-tile-premium { 
       background: rgba(0,0,0,0.01); 
       border: 1px solid var(--border); 
       border-radius: 16px; 
       padding: 24px; 
       position: relative; 
       overflow: hidden; 
       display: flex;
       flex-direction: column;
       gap: 20px;
       transition: 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .comp-tile-premium:hover { transform: translateY(-4px); border-color: var(--accent); box-shadow: 0 12px 32px rgba(0,0,0,0.05); }
    .leader-gold-top { border-top: 3px solid #fbbf24; }
    .dim-rank-bg { 
       position: absolute; 
       right: -10px; 
       top: -10px; 
       font-size: 90px; 
       font-weight: 900; 
       opacity: 0.05; 
       pointer-events: none;
       line-height: 1;
       color: var(--text-main);
    }
    .comp-top-info { display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; }
    .comp-avatar { 
       width: 44px; height: 44px; 
       background: var(--border); 
       border-radius: 10px; 
       display: flex; align-items: center; justify-content: center;
       font-weight: 900; color: var(--text-main);
    }
    .comp-brand-name { font-weight: 800; font-size: 15px; color: var(--text-main); }
    .comp-score-big { display: flex; flex-direction: column; position: relative; z-index: 1; }
    .score-group { display: flex; align-items: center; gap: 8px; }
    .val-num-bold { font-size: 36px; font-weight: 900; color: var(--text-main); letter-spacing: -0.04em; }
    .trend-indicator { font-size: 20px; font-weight: 700; }
    .score-cap { font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .comp-stats-grid { display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 1; padding: 12px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
    .m-stat { display: flex; flex-direction: column; }
    .m-label { font-size: 9px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; }
    .m-value { font-size: 13px; font-weight: 700; color: var(--text-main); margin-top: 2px; }
    .m-sep { width: 1px; height: 20px; background: var(--border); }
    .comp-foot-progress { margin-top: 4px; position: relative; z-index: 1; }
    .bar-track { width: 100%; height: 5px; background: var(--border); border-radius: 10px; overflow: hidden; }
    .bar-fill { height: 100%; transition: width 0.6s ease-out; }

    .r2-annotation { position: absolute; top: 24px; right: 24px; text-align: left; background: rgba(0,0,0,0.6); backdrop-filter: blur(12px); padding: 18px 22px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.2); color: white; font-size: 13px; z-index: 10; pointer-events: none; }
    :host-context(html.light-mode) .r2-annotation { background: rgba(255,255,255,0.95); color: #1e293b; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 12px 35px rgba(0,0,0,0.08); }
    .r2-annotation strong { font-weight: 800; display:block; margin-bottom: 8px; font-size: 14px; }
    
    .prod-correlation-grid { display: grid; grid-template-columns: 80px 1fr 1fr 1fr; gap: 10px; width: 100%; max-width: 440px; align-items: center; justify-content: center; margin-bottom: 40px; }
    .header-cell { font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; text-align: center; align-self: flex-end; padding-bottom: 6px; letter-spacing: 0.05em; }
    .header-cell.side { text-align: left; align-self: center; padding-bottom: 0; padding-right: 12px; font-size: 12px; }
    .data-cell { height: 68px; border-radius: 12px; display: flex; justify-content: center; align-items: center; font-size: 16px; font-weight: 800; transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: default; }
    .data-cell:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }

    /* STATISTICAL CORRELATION */
    .correlation-view-split { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
    .section-title-box { margin-bottom: 32px; }
    .section-title-box h4 { font-size: 15px; font-weight: 700; color: var(--text-main); margin: 0; }
    .section-title-box p { font-size: 13px; color: var(--text-muted); margin: 6px 0 0 0; }
    
    .heatmap-grid-display { display: flex; flex-direction: column; gap: 6px; }
    .matrix-top-labels { display: flex; gap: 6px; margin-bottom: 8px; }
    .corner-pad { width: 60px; }
    .top-label { width: 56px; font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; text-align: center; }
    .matrix-row-entry { display: flex; align-items: center; gap: 6px; }
    .side-label { width: 60px; font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; text-align: right; margin-right: 8px; }
    .cell-strip { display: flex; gap: 6px; }
    .matrix-heat-cell { 
       width: 56px; height: 56px; 
       border-radius: 8px; 
       display: flex; align-items: center; justify-content: center; 
       font-size: 15px; font-weight: 800; color: white; cursor: default; 
    }
    .heatmap-key-scale { display: flex; align-items: center; gap: 16px; margin-top: 24px; padding: 0 10px; }
    .key-txt { font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; }
    .key-gradient { flex: 1; height: 8px; border-radius: 4px; background: linear-gradient(90deg, #EF4444, rgba(255,255,255,0.05), #3B82F6); }

    .insights-list-vertical { display: flex; flex-direction: column; gap: 12px; }
    .insight-row-modern { display: flex; align-items: flex-start; gap: 20px; padding: 18px 24px; border-radius: 12px; background: rgba(0,0,0,0.02); transition: 0.2s; }
    :host-context(html:not(.light-mode)) .insight-row-modern { background: rgba(255,255,255,0.02); }
    .insight-row-modern:hover { transform: translateX(8px); }
    .status-dot-lrg { width: 10px; height: 10px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; box-shadow: 0 0 8px rgba(0,0,0,0.1); }
    .insight-meta-stack { display: flex; flex-direction: column; }
    .insight-heading-bold { font-size: 14px; font-weight: 700; color: var(--text-main); }
    .insight-detail-txt { font-size: 13px; color: var(--text-muted); margin-top: 6px; line-height: 1.5; }

    /* TABLE ANALYSIS */
    .table-container-scroll { width: 100%; border-radius: 0 0 16px 16px; overflow: hidden; overflow-x: auto; }
    .data-table-premium { width: 100%; border-collapse: collapse; white-space: nowrap; }
    .data-table-premium th { text-align: right; font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.12em; padding: 18px 32px; border-bottom: 2px solid var(--border); background: rgba(0,0,0,0.01); }
    .data-table-premium td { padding: 20px 32px; border-bottom: 1px solid var(--border); text-align: right; color: var(--text-main); font-size: 14px; font-weight: 600; }
    .data-table-premium tr:hover td { background: rgba(0,0,0,0.01); }
    :host-context(html:not(.light-mode)) .data-table-premium tr:hover td { background: rgba(255,255,255,0.02); }
    .compact-table th { padding: 14px 16px; font-size: 10px; }
    .compact-table td { padding: 14px 16px; font-size: 13px; }
    .l-align { text-align: left !important; }
    .channel-identity { display: flex; align-items: center; gap: 14px; }
    .channel-avatar-box { width: 44px; height: 44px; background: var(--border); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 900; color: var(--accent); }
    .channel-name-bold { font-weight: 800; font-size: 15px; }
    .win-chance-row { display: flex; justify-content: flex-end; align-items: center; gap: 12px; }
    .chance-track-base { width: 80px; height: 6px; background: var(--border); border-radius: 10px; overflow: hidden; }
    .chance-fill-active { height: 100%; }
    .share-distribution-row { display: flex; align-items: center; gap: 14px; justify-content: flex-end; }
    .distribution-track-wide { width: 140px; height: 8px; background: var(--border); border-radius: 10px; overflow: hidden; }
    .distribution-fill-wide { height: 100%; border-radius: 10px; transition: 1s cubic-bezier(0.16, 1, 0.3, 1); }
    .spark-table-wrap { position: relative; width: 80px; height: 32px; float: right; }
    .canvas-spark-table { width: 80px; height: 32px; }

    /* VELOCITY LEADERS */
    .velocity-stack-compact { display: flex; flex-direction: column; }
    .product-row-velocity { display: flex; align-items: center; gap: 20px; padding: 18px 32px; border-bottom: 1px solid var(--border); transition: 0.2s; }
    .product-row-velocity:hover { background: rgba(0,0,0,0.01); }
    .velocity-rank-pill { width: 28px; height: 28px; font-size: 13px; font-weight: 900; color: var(--text-muted); opacity: 0.4; }
    .product-char-avatar { width: 44px; height: 44px; background: var(--border); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--text-main); flex-shrink: 0; }
    .product-info-column { flex: 1; display: flex; flex-direction: column; text-align: left; }
    .p-name-main { font-size: 14px; font-weight: 700; color: var(--text-main); line-height: 1.3; }
    .p-cat-sub { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 4px; }
    .product-stats-group-end { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; margin-left: auto; }
    .p-rev-val { font-weight: 800; font-size: 16px; color: var(--text-main); }
    .p-mgn-pill-label { font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 12px; }
    .p-mgn-pill-label.high { background: rgba(16, 185, 129, 0.1); color: #10B981; }
    .p-mgn-pill-label.mid { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
    .p-mgn-pill-label.low { background: rgba(239, 68, 68, 0.1); color: #EF4444; }
    .p-spark-wrap-end { width: 100px; height: 36px; position: relative; margin-left: 20px; }
    .canvas-spark-sku { width: 100px; height: 36px; }

    /* STATISTICAL SIGNIFICANCE */
    .two-column-bottom-section { display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px; }
    .stats-ico { width: 22px; height: 22px; color: var(--accent); }
    .stats-header-group { display: flex; align-items: center; gap: 14px; }
    .stats-feed-vertical { display: flex; flex-direction: column; gap: 1px; background: var(--border); margin: -1px; }
    .stats-card-insight { background: var(--card-bg); padding: 24px 32px; border-left: 4px solid transparent; transition: 0.2s; }
    .stats-card-insight:hover { background: rgba(37, 99, 235, 0.02); }
    .stats-card-meta-top { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .stats-title-txt-bold { font-weight: 800; font-size: 15px; color: var(--text-main); }
    .stats-time-label-muted { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
    .stats-detail-txt-muted { font-size: 13px; line-height: 1.7; color: var(--text-muted); margin: 0 0 20px 0; }
    .btn-action-outline { background: transparent; border: 1px solid var(--border); color: var(--text-main); padding: 8px 18px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; }
    .btn-action-outline:hover { background: var(--text-main); color: var(--card-bg); border-color: var(--text-main); }

    .link-btn-text { background: none; border: none; color: var(--accent); font-size: 14px; font-weight: 700; cursor: pointer; }
    .txt-tiny { font-size: 11px; font-weight: 700; }

    /* DRAWER STYLES */
    .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 2000; }
    :host-context(html:not(.light-mode)) .drawer-overlay { background: rgba(0,0,0,0.7); }

    .stats-drawer { 
      position: fixed; top: 0; right: 0; bottom: 0; 
      width: 500px; background: #0a0a0c; border-left: 1px solid var(--border);
      z-index: 2001; display: flex; flex-direction: column;
      box-shadow: -20px 0 80px rgba(0,0,0,0.6);
    }
    :host-context(html.light-mode) .stats-drawer { background: #ffffff; border-left: 1px solid #e5e7eb; }

    .drawer-header {
      padding: 32px; border-bottom: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: flex-start;
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, transparent 100%);
    }
    :host-context(html.light-mode) .drawer-header { border-bottom: 1px solid #e5e7eb; }
    .header-left { display: flex; align-items: center; gap: 20px; }
    .icon-circle { width: 44px; height: 44px; border-radius: 12px; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 16px rgba(37, 99, 235, 0.2); svg { width: 22px; } }
    .drawer-header h3 { font-size: 20px; font-weight: 800; color: var(--text-main); margin: 0; letter-spacing: -0.02em; }
    .drawer-header p { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin: 4px 0 0; }
    
    .close-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border); background: rgba(255,255,255,0.03); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; &:hover { background: rgba(255,255,255,0.08); color: var(--text-main); } svg { width: 16px; } }

    .drawer-body { padding: 32px; display: flex; flex-direction: column; gap: 24px; overflow-y: auto; flex: 1; }
    .section-label { font-size: 11px; font-weight: 850; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px; }
    
    .stats-premium-grid { display: flex; flex-direction: column; gap: 24px; }
    .stats-summary-hero-modern { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .hero-metric-pill { background: #16161a; border: 1px solid var(--border); border-left: 4px solid var(--accent); padding: 16px; border-radius: 12px; display: flex; flex-direction: column; gap: 4px; }
    :host-context(html.light-mode) .hero-metric-pill { background: #f9fafb; border-color: #e5e7eb; }
    .hero-metric-pill .m-label { font-size: 9px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; }
    .hero-metric-pill .m-val { font-size: 15px; font-weight: 800; color: var(--text-main); }

    .detail-content-block-refined { display: flex; flex-direction: column; gap: 20px; }
    .stats-description-lrg { font-size: 14px; color: var(--text-main); line-height: 1.6; margin: 0; font-weight: 500; }
    
    .variance-chart-container { background: #111114; border: 1px solid var(--border); border-radius: 16px; padding: 20px; position: relative; height: 220px; }
    :host-context(html.light-mode) .variance-chart-container { background: #ffffff; border-color: #e5e7eb; }
    .chart-header-row { margin-bottom: 16px; }
    .c-title { font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .modal-variance-canvas { width: 100% !important; height: 140px !important; }

    .stats-methodology-box { padding: 16px; background: #16161a; border: 1px solid var(--border); border-radius: 12px; }
    :host-context(html.light-mode) .stats-methodology-box { background: #f9fafb; border-color: #e5e7eb; }
    .method-item { display: flex; gap: 14px; align-items: center; }
    .meth-icon { font-size: 20px; color: var(--accent); font-weight: 800; }
    .meth-text { display: flex; flex-direction: column; gap: 2px; }
    .meth-text strong { font-size: 13px; font-weight: 700; color: var(--text-main); }
    .meth-text span { font-size: 11px; color: var(--text-muted); font-weight: 600; }

    .drawer-footer { padding: 32px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 20px; }
    .security-note { display: flex; gap: 10px; font-size: 12px; font-weight: 500; color: var(--text-muted); align-items: center; background: #16161a; padding: 12px 16px; border-radius: 12px; }
    :host-context(html.light-mode) .security-note { background: #f9fafb; border: 1px solid #e5e7eb; }
    .security-note svg { width: 14px; color: var(--accent); }
    
    .btn-save {
      width: 100%; height: 56px; background: var(--accent); color: white; border: none; border-radius: 14px;
      font-size: 15px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px;
      box-shadow: 0 8px 20px rgba(37, 99, 235, 0.2); transition: all 0.3s;
    }
    .btn-save:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(37, 99, 235, 0.3); filter: brightness(1.1); }
    .btn-save svg { width: 18px; transition: transform 0.2s; }
    .btn-save:hover svg { transform: translateX(4px); }

    /* HEATMAP TABLE */
    .heatmap-table-container { width: 100%; overflow-x: auto; margin-bottom: 24px; }
    .heatmap-table { width: 100%; border-collapse: separate; border-spacing: 8px; }
    .heatmap-table th { 
      padding: 16px 12px; 
      font-size: 10px; 
      font-weight: 800; 
      color: var(--text-muted); 
      text-transform: uppercase; 
      text-align: center; 
      letter-spacing: 0.1em;
    }
    .heatmap-table td { min-width: 130px; }
    .sticky-col { 
      position: sticky; 
      left: 0; 
      background: var(--card-bg); 
      z-index: 5; 
      text-align: left !important; 
      width: 120px;
      padding-right: 20px;
      border-right: 1px solid var(--border);
    }
    .cat-name-cell { font-weight: 800; color: var(--text-main); font-size: 13px; text-transform: uppercase; letter-spacing: 0.02em; }
    
    .heatmap-cell {
      height: 60px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 0 16px;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); cursor: default;
      border: 1px solid rgba(255, 255, 255, 0.04);
      background: rgba(0,0,0,0.02);
    }
    .heatmap-cell:hover { 
      transform: translateY(-2px) scale(1.02); 
      box-shadow: 0 12px 24px rgba(0,0,0,0.1), inset 0 0 12px rgba(255, 255, 255, 0.05);
      z-index: 10;
      border-color: rgba(255, 255, 255, 0.1);
    }
    .heat-dot { 
      width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; 
      box-shadow: 0 0 10px currentColor; /* glow effect based on dot color */
    }
    .gap-val { 
      font-size: 15px; font-weight: 800; letter-spacing: -0.02em; 
      /* Clean, modern text without forced white/shadows */
    }
    
    .heatmap-legend { display: flex; gap: 32px; padding: 0 8px; }
    .legend-entry { display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 600; color: var(--text-muted); }

    /* T-TEST RESULTS */
    .ttest-table th { text-align: center; }
    .ttest-table td { text-align: center; }
    .verdict-pill {
      display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 100px; 
      background: rgba(255,255,255,0.05); font-size: 12px; font-weight: 700; color: var(--text-muted);
    }
    .verdict-pill.sig { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .verdict-pill.sig.expensive { background: rgba(225, 29, 72, 0.15); color: #fb7185; }
    .v-icon { width: 14px; height: 14px; }

    @media (max-width: 1400px) { .analysis-layout-grid, .two-column-bottom-section, .correlation-view-split, .competitors-tiles-row { grid-template-columns: 1fr; } .kpi-grid-refined { grid-template-columns: repeat(3, 1fr); } }
  `],
})
export class BusinessAnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('groupedBarCanvas') groupedBarCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('scatterRegressionCanvas') scatterRegressionCanvas!: ElementRef<HTMLCanvasElement>;
  
  @ViewChildren('sparklineCanvas') sparklineCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;
  @ViewChildren('tableTrendCanvas') tableTrendCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;
  @ViewChildren('skuTrendCanvas') skuTrendCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;

  activeTab: 'market' | 'products' = 'market';
  chartInstances: Chart[] = [];
  
  setTab(tab: 'market' | 'products') {
    this.activeTab = tab;
    setTimeout(() => this.initAllCharts(), 50);
  }

  viewMode: 'Price' | 'Stock' | 'Both' = 'Both';
  activeRange = '30D';
  dateRanges = ['7D', '30D', '90D', '12M', 'Custom'];

  kpis: KPI[] = [
    { label: 'Market Visibility', value: '84.2%', delta: '+12.4%', isPositive: true, color: '#3B82F6', trend: [30, 45, 38, 52, 48, 65, 78] },
    { label: 'Price Volatility', value: '12.4%', delta: '-1.8%', isPositive: false, color: '#F59E0B', trend: [40, 38, 39, 35, 36, 34, 34] },
    { label: 'Total Products', value: '487', delta: '+23', isPositive: true, color: '#3B82F6', trend: [400, 410, 425, 430, 450, 470, 487] },
    { label: 'Search Index', value: '742', delta: '+4.2%', isPositive: true, color: '#10B981', trend: [60, 62, 61, 65, 64, 67, 68] },
    { label: 'Market Vol', value: '142', delta: 'High', isPositive: false, color: '#EF4444', trend: [110, 130, 95, 150, 140, 160, 142] }
  ];

  categoryPricing = [
    { category: 'Electronics', avgPrice: 842.00, color: '#2563EB' },
    { category: 'Périphériques', avgPrice: 1240.00, color: '#8B5CF6' },
    { category: 'Audio', avgPrice: 299.00, color: '#10B981' },
    { category: 'Tablets', avgPrice: 650.00, color: '#F59E0B' },
    { category: 'Other', avgPrice: 120.00, color: '#94A3B8' }
  ];

  productLabels = ['Prc', 'Vol', 'Mgn', 'Win', 'Pos'];
  correlationData = [
    [1.0, 0.82, -0.4, 0.95, 0.12],
    [0.82, 1.0, 0.15, 0.76, -0.1],
    [-0.4, 0.15, 1.0, -0.22, 0.05],
    [0.95, 0.76, -0.22, 1.0, -0.3],
    [0.12, -0.1, 0.05, -0.3, 1.0]
  ];

  descriptiveStats = [
    { category: 'GPU', mean: 1641, median: 1599, stdDev: 210, min: 389, max: 2199 },
    { category: 'Laptop', mean: 891, median: 849, stdDev: 143, min: 399, max: 3499 },
    { category: 'Smartphone', mean: 748, median: 729, stdDev: 89, min: 199, max: 1299 },
    { category: 'CPU', mean: 412, median: 389, stdDev: 61, min: 89, max: 749 },
    { category: 'RAM', mean: 94, median: 89, stdDev: 18, min: 34, max: 289 },
    { category: 'SSD', mean: 112, median: 99, stdDev: 12, min: 39, max: 499 }
  ];

  prodCorrelationLabels = ['Price', 'Rating', 'Reviews'];
  prodCorrelationData = [
    [1.00, -0.43, -0.21],
    [-0.43, 1.00, 0.67],
    [-0.21, 0.67, 1.00]
  ];
  
  groupedBarData = {
    labels: ['GPU', 'CPU', 'Laptop', 'Phone', 'RAM', 'SSD'],
    newegg: [1580, 400, 870, 720, 90, 110],
    bestbuy: [1700, 420, 910, 750, 95, 120],
    jumia: [1820, 440, 940, 780, 100, 130] // Data mimicking the visualization
  };

  correlationInsights = [
    { label: 'Price ↔ Volume', explanation: 'Current elasticity suggests price changes influence market share by ~18% in electronics.', color: '#3B82F6' },
    { label: 'Position ↔ Visibility', explanation: 'Maintaining competitive pricing correlates with +12% share of voice on Amazon.', color: '#10B981' },
    { label: 'Volume ↔ Stock', explanation: 'High-visibility SKUs currently operate at 8% higher than average stock availability.', color: '#F87171' },
    { label: 'Visibility ↔ Rank', explanation: 'Organic search rank 1-3 significantly boosts visibility probability by 40%.', color: '#3B82F6' }
  ];

  competitorRanks: CompetitorRank[] = [
    { name: 'BestBuy Global', score: 942, visibilityScore: 74, avgPrice: 842, skus: 124, trend: 'up', color: '#fbbf24' },
    { name: 'Amazon Warehouse', score: 885, visibilityScore: 42, avgPrice: 855, skus: 412, trend: 'stable', color: '#3b82f6' },
    { name: 'Walmart Inc', score: 812, visibilityScore: 61, avgPrice: 838, skus: 288, trend: 'down', color: '#f59e0b' },
    { name: 'ElectroHub Retail', score: 760, visibilityScore: 55, avgPrice: 799, skus: 95, trend: 'up', color: '#64748b' }
  ];

  platformStats: PlatformStat[] = [
    { name: 'BestBuy', logo: '', items: 342, avgPrice: 842.20, visibilityScore: 74, marketShare: 45, trend: [65, 68, 70, 72, 74, 73, 74] },
    { name: 'Amazon', logo: '', items: 412, avgPrice: 855.40, visibilityScore: 42, marketShare: 32, trend: [40, 41, 40, 42, 43, 41, 42] },
    { name: 'Walmart', logo: '', items: 288, avgPrice: 838.00, visibilityScore: 61, marketShare: 23, trend: [58, 59, 60, 61, 60, 62, 61] }
  ];

  topProducts: Product[] = [
    { name: 'Keychron Q1 Max Custom Keyboard', popularityScore: 942, visibility: 24, image: '', history: [40, 42, 45, 43, 48, 52, 55] },
    { name: 'Apple iPad Pro 12.9" M2', popularityScore: 885, visibility: 18, image: '', history: [35, 36, 38, 37, 39, 40, 38] },
    { name: 'Bose Ultra Headphones', popularityScore: 812, visibility: 32, image: '', history: [22, 25, 24, 28, 30, 32, 31] },
    { name: 'Nintendo Switch OLED', popularityScore: 760, visibility: 12, image: '', history: [18, 19, 21, 20, 22, 23, 24] },
    { name: 'Logitech Master 3S', popularityScore: 640, visibility: 45, image: '', history: [12, 14, 15, 17, 18, 19, 20] }
  ];

  insights: Insight[] = [
    { type: 'win', title: 'Market Stability Index', message: 'Current price fluctuations are within 95% confidence intervals, indicating statistically significant stability across major categories.', timeAgo: 'LATEST' },
    { type: 'risk', title: 'Sample Size Variance', message: 'The current SKU overlap on Walmart (p=0.08) is below the significance threshold, suggesting trend data may be speculative this period.', timeAgo: 'LATEST' }
  ];

  priceGapHeatmap = {
    competitors: ['Newegg', 'BestBuy', 'Jumia', 'PC21'],
    categories: [
      { name: 'GPU', gaps: [-89, -12, 45, 110] },
      { name: 'Laptop', gaps: [-23, -180, 67, 12] },
      { name: 'RAM', gaps: [8, 14, 22, 31] },
      { name: 'SSD', gaps: [-15, -8, 18, 24] }
    ]
  };

  ttestResults = [
    { category: 'GPU', myPrice: 1199, marketPrice: 1124, gap: 75, pValue: 0.02, verdict: 'Sig. more expensive', significant: true, expensive: true },
    { category: 'Laptop', myPrice: 1450, marketPrice: 1471, gap: -21, pValue: 0.31, verdict: 'Not significant', significant: false, expensive: false },
    { category: 'RAM', myPrice: 84, marketPrice: 91, gap: -7, pValue: 0.04, verdict: 'Sig. cheaper', significant: true, expensive: false },
    { category: 'SSD', myPrice: 118, marketPrice: 122, gap: -4, pValue: 0.28, verdict: 'Not significant', significant: false, expensive: false }
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {}
  ngAfterViewInit() { Promise.resolve().then(() => this.initAllCharts()); }
  ngOnDestroy() { this.chartInstances.forEach(c => c.destroy()); }

  private initAllCharts() {
    const isLight = document.documentElement.classList.contains('light-mode');
    Chart.defaults.color = isLight ? '#64748B' : 'rgba(255, 255, 255, 0.77)'; 
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 11;
    
    const borderCol = isLight ? '#E2E8F0' : '#1E293B';
    const gridColor = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)';

    this.chartInstances.forEach(c => { try { c.destroy(); } catch(e) {} });
    this.chartInstances = [];

    this.createGroupedBarChart(gridColor);
    this.createScatterRegressionChart(gridColor);
    this.createKpiSparklines();
    this.createTableVisuals('#10B981');
    if (this.showStatsModal) this.createModalChart();
  }

  private createModalChart() {
    if (!this.modalVarianceCanvas) return;
    const ctx = this.modalVarianceCanvas.nativeElement.getContext('2d')!;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-blue') || '#3B82F6';
    
    this.chartInstances.push(new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({length: 40}, (_, i) => i),
        datasets: [{
          data: Array.from({length: 40}, (_, i) => Math.exp(-Math.pow(i - 20, 2) / 40) * 100),
          borderColor: accent,
          borderWidth: 3,
          fill: true,
          backgroundColor: accent + '15',
          tension: 0.4,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } }
      }
    }));
  }

  @ViewChild('modalVarianceCanvas') set modalCanvas(content: ElementRef) {
    if (content) {
      this.modalVarianceCanvas = content;
      // Small timeout to ensure canvas is ready
      setTimeout(() => this.createModalChart(), 50);
    }
  }
  private modalVarianceCanvas!: ElementRef<HTMLCanvasElement>;

  private createGroupedBarChart(gridColor: string) {
    if(!this.groupedBarCanvas) return;
    const ctx = this.groupedBarCanvas.nativeElement.getContext('2d')!;
    this.chartInstances.push(new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.groupedBarData.labels,
        datasets: [
          { label: 'Newegg', data: this.groupedBarData.newegg, backgroundColor: '#628DEC', borderRadius: 4, barPercentage: 0.85, categoryPercentage: 0.75 },
          { label: 'BestBuy', data: this.groupedBarData.bestbuy, backgroundColor: '#E87C53', borderRadius: 4, barPercentage: 0.85, categoryPercentage: 0.75 },
          { label: 'Jumia', data: this.groupedBarData.jumia, backgroundColor: '#60BC78', borderRadius: 4, barPercentage: 0.85, categoryPercentage: 0.75 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, padding: 24, font: { weight: 600 } } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { weight: 600 } } },
          y: { 
            grid: { color: gridColor },
            border: { display: false },
            ticks: { callback: v => '$' + v, font: { weight: 600 } }
          }
        }
      }
    }));
  }

  private createScatterRegressionChart(gridColor: string) {
    if(!this.scatterRegressionCanvas) return;
    const ctx = this.scatterRegressionCanvas.nativeElement.getContext('2d')!;
    
    // Exact fidelity points mimicking the professional image
    const scatterData = [
      {x: 1.0, y: 95}, {x: 1.05, y: 98}, {x: 1.15, y: 118}, {x: 1.2, y: 131}, {x: 1.3, y: 127}, 
      {x: 1.6, y: 88}, {x: 1.85, y: 78}, {x: 1.9, y: 90}, {x: 1.95, y: 115}, {x: 1.95, y: 128}, 
      {x: 2.15, y: 79}, {x: 2.25, y: 122}, {x: 2.35, y: 105}, {x: 2.4, y: 104}, {x: 2.75, y: 119}, 
      {x: 2.75, y: 104}, {x: 2.85, y: 107}, {x: 2.9, y: 78}, {x: 3.3, y: 67}, {x: 3.32, y: 65}, 
      {x: 3.4, y: 88}, {x: 3.42, y: 94}, {x: 3.8, y: 83}, {x: 3.9, y: 100}, {x: 4.1, y: 59}, 
      {x: 4.1, y: 74}, {x: 4.2, y: 63}, {x: 4.3, y: 80}, {x: 4.3, y: 65}, {x: 4.6, y: 75}, 
      {x: 4.8, y: 104}, {x: 4.9, y: 74}
    ];

    const bandBottom = [ {x: 1.0, y: 85}, {x: 5.0, y: 55} ];
    const bandTop = [ {x: 1.0, y: 135}, {x: 5.0, y: 105} ];
    const regressionLine = [ {x: 1.0, y: 110}, {x: 5.0, y: 80} ];

    this.chartInstances.push(new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            type: 'scatter',
            label: 'Products',
            data: scatterData,
            backgroundColor: '#7F93A3',
            borderColor: '#ffffff',
            borderWidth: 1.5,
            pointRadius: 6,
            pointHoverRadius: 8
          },
          {
             type: 'line',
             label: 'Lower CF',
             data: bandBottom,
             borderColor: 'transparent',
             backgroundColor: 'rgba(235, 115, 115, 0.18)',
             borderWidth: 0,
             pointRadius: 0,
             fill: 2,
             tension: 0
          },
          {
             type: 'line',
             label: 'Upper CF',
             data: bandTop,
             borderColor: 'transparent',
             borderWidth: 0,
             pointRadius: 0,
             fill: false,
             tension: 0
          },
          {
            type: 'line',
            label: 'Regression',
            data: regressionLine,
            borderColor: '#F07C7C',
            borderWidth: 3,
            fill: false,
            pointRadius: 0,
            tension: 0
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { 
            type: 'linear', position: 'bottom', min: 1.0, max: 5.0,
            grid: { display: false }, border: { display: false },
            ticks: { stepSize: 1, font: { weight: 600 }, padding: 10 }
          },
          y: { 
            min: 40, max: 160,
            grid: { color: gridColor }, border: { display: false },
            ticks: { stepSize: 20, font: { weight: 600 }, padding: 10 },
            title: { display: true, text: '↑ Price (USD)', color: 'var(--text-muted)', font: { weight: 600 }, padding: 12 }
          }
        }
      }
    }));
  }

  getStdDevColor(val: number) {
    if (val > 150) return 'var(--danger)';
    if (val > 50) return '#F59E0B'; // amber
    return 'var(--success)';
  }

  getProdCorrelationBg(val: number) {
     if (val === 1) return '#1A1A1A'; // very dark
     if (val > 0.5) return '#EAF1FF'; // light blue
     if (val < -0.3) return '#FCEBEB'; // light red
     if (val < 0) return '#FFF8DF'; // light yellow
     return '#ffffff';
  }

  getProdCorrelationText(val: number) {
     const isLight = document.documentElement.classList.contains('light-mode');
     if (val === 1) return '#ffffff';
     if (val > 0.5) return '#2563EB'; // blue text
     if (val < -0.3) return '#DC2626'; // red text
     if (val < 0) return '#D97706'; // amber/yellow text
     return '#000000';
  }

  private createKpiSparklines() {
    this.sparklineCanvases.forEach((c, i) => this.createMiniSpark(c.nativeElement, this.kpis[i].trend, this.kpis[i].color));
  }

  private createTableVisuals(color: string) {
    this.tableTrendCanvases.forEach((c, i) => this.createMiniSpark(c.nativeElement, this.platformStats[i].trend, color));
    this.skuTrendCanvases.forEach((c, i) => this.createMiniSpark(c.nativeElement, this.topProducts[i].history, '#10B981'));
  }

  private createMiniSpark(canvas: HTMLCanvasElement, data: number[], color: string) {
    this.chartInstances.push(new Chart(canvas, {
      type: 'line',
      data: { labels: data.map((_, i) => i), datasets: [{ data,borderColor: color, borderWidth: 2, pointRadius: 0, fill: false, tension: 0.45 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }
    }));
  }

  getCorrelationColor(val: number) {
    if (val === 1) return '#3B82F6';
    if (val >= 0.8) return 'rgba(59, 130, 246, 0.75)';
    if (val >= 0.5) return 'rgba(59, 130, 246, 0.45)';
    if (val >= 0) return 'rgba(148, 163, 184, 0.1)';
    if (val >= -0.3) return 'rgba(239, 68, 68, 0.35)';
    return '#EF4444';
  }

  getPlatformColor(name: string) {
    const n = name.toLowerCase();
    if (n.includes('amazon')) return '#F97316';
    if (n.includes('bestbuy')) return '#2563EB';
    if (n.includes('walmart')) return '#FACC15';
    return '#3B82F6';
  }

  getHeatmapColor(gap: number) {
    const absGap = Math.abs(gap);
    if (gap === 0) return 'rgba(168, 162, 158, 0.08)'; // Warm stone
    
    const maxVal = 150; 
    const ratio = Math.min(absGap / maxVal, 1);
    
    if (gap > 0) {
      // Elegant warm Sage
      return `rgba(91, 157, 112, ${0.08 + ratio * 0.18})`;
    } else {
      // Elegant warm Terracotta
      return `rgba(216, 106, 88, ${0.08 + ratio * 0.18})`;
    }
  }

  getHeatmapTextColor(gap: number) {
    if (gap === 0) return 'var(--text-muted)';
    if (gap > 0) return '#539665'; // Warm Sage
    return '#CE6351'; // Warm Terracotta
  }

  getHeatmapDotColor(gap: number) {
    if (gap === 0) return 'rgba(168, 162, 158, 0.6)';
    if (gap > 0) return '#5B9D70'; // Slightly brighter for the glow dot
    return '#D86A58';
  }

  updateViewMode(mode: 'Price' | 'Stock' | 'Both') { this.viewMode = mode; this.initAllCharts(); }
  
  onRangeChange(range: string) {
    this.activeRange = range;
    // simulating a data re-fetch for the new time window
    this.initAllCharts();
    console.log(`Switched data view to: ${range}`);
  }

  isGeneratingReport = false;
  downloadReport() {
    this.isGeneratingReport = true;
    // simulating a PDF generation/download process
    setTimeout(() => {
       this.isGeneratingReport = false;
       alert('Full High-Resolution Analytics PDF Report has been generated and is downloading.');
    }, 1500);
  }

  getScoreColorByValue(val: number) { return val >= 70 ? '#10B981' : (val >= 50 ? '#F59E0B' : '#EF4444'); }
  getMarginClass(val: number) { return val >= 30 ? 'high' : (val >= 15 ? 'mid' : 'low'); }
  getInsightColor(type: string) { return type === 'win' ? '#10B981' : (type === 'risk' ? '#EF4444' : '#F59E0B'); }

  selectedInsight: Insight | null = null;
  showStatsModal = false;

  showStatsDetail(insight: Insight) {
    this.selectedInsight = insight;
    this.showStatsModal = true;
    console.log('Detailed Stats Modal opened for:', insight);
  }

  closeStatsModal() {
    this.showStatsModal = false;
    this.selectedInsight = null;
  }
}
