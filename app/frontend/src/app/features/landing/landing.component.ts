import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { CountUpDirective } from '../../shared/directives/count-up.directive';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';
import { Observable } from 'rxjs';

// Chart.js imports
import { 
  Chart, 
  LineController, 
  LineElement, 
  PointElement, 
  LinearScale, 
  Title, 
  CategoryScale, 
  Tooltip, 
  Filler,
  BarController,
  BarElement
} from 'chart.js';

// Register Chart.js models
Chart.register(
  LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip, Filler,
  BarController, BarElement
);

// --- Interfaces for Mock Data ---
interface IFeedEvent {
  product: string; platform: string; dropRaw: string; dropPct: string; time: string;
}

interface IWatchlistRow {
  product: string; platform: string; current: number; target: number; distance: number; trend: number[]; locked: boolean;
}

interface ICompetitorRow {
  competitor: string; product: string; theirPrice: number; yourPrice: number; locked: boolean; position: 'above' | 'below' | 'match';
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, CountUpDirective, ScrollRevealDirective],
  template: `
    <div class="fomo-landing">
      
      <!-- 1. NAVIGATION -->
      <nav class="fomo-nav">
        <div class="nav-container main-grid">
          <div class="brand">
            <span class="logo fw-bold">PulsePrice<span class="text-blue">.</span></span>
          </div>
          <div class="nav-actions">
            <button routerLink="/auth/login" class="btn-text fw-medium">Sign in</button>
            <button routerLink="/auth/signup" class="btn-primary">Get Started &rarr;</button>
          </div>
        </div>
      </nav>

      <!-- 2. HERO WITH LIVE DASHBOARD -->
      <section class="hero-section">
        <div class="main-grid split-hero">
          
          <!-- Hero Copy -->
          <div class="hero-text" appScrollReveal>
            <div class="badge-eyebrow mb-4">Enterprise Price Intelligence</div>
            <h1 class="hero-h1">Market Dominance <br/> at Scale.</h1>
            <p class="hero-lead text-slate mb-8">
              Real-time monitoring and predictive analytics engineered for the professional procurement team and brand operator.
            </p>
            <div class="hero-ctas">
              <button routerLink="/auth/signup" [queryParams]="{role: 'Client'}" class="btn-primary btn-lg">For Clients</button>
              <button routerLink="/auth/signup" [queryParams]="{role: 'Entrepreneur'}" class="btn-outline btn-lg">For Entrepreneurs</button>
            </div>
            
            <div class="social-proof mt-10">
              <div class="proof-stat">
                <span class="fw-bold text-charcoal">4,200+</span> 
                <span class="text-xs text-slate uppercase">Companies</span>
              </div>
              <div class="proof-divider"></div>
              <div class="proof-stat">
                <span class="fw-bold text-charcoal">$2.4M+</span> 
                <span class="text-xs text-slate uppercase">Savings Tracked</span>
              </div>
              <div class="proof-divider"></div>
              <div class="proof-stat">
                <span class="fw-bold text-charcoal">48</span> 
                <span class="text-xs text-slate uppercase">Marketplaces</span>
              </div>
            </div>
          </div>

          <!-- Hero Live Dashboard (Chart.js) -->
          <div class="hero-visual" appScrollReveal [delay]="200">
            <div class="dashboard-mock shadow-xl border">
              <div class="dash-header border-b">
                <div class="dash-title fw-bold fs-sm">Market Volatility Index (7D)</div>
                <div class="live-indicator"><span class="pulse-dot"></span> Live Output</div>
              </div>
              
              <!-- Fluctuating KPI Badges -->
              <div class="dash-kpis border-b">
                <div class="kpi-box">
                  <div class="kpi-label">Price Drops (1h)</div>
                  <div class="kpi-val text-blue">{{ liveDrops }}</div>
                </div>
                <div class="kpi-box border-l">
                  <div class="kpi-label">Avg Savings Cap</div>
                  <div class="kpi-val text-green">{{ liveSavingsPct }}%</div>
                </div>
                <div class="kpi-box border-l">
                  <div class="kpi-label">Active Node Alerts</div>
                  <div class="kpi-val">{{ liveAlerts }}</div>
                </div>
              </div>

              <!-- Setup the canvas for Chart.js -->
              <div class="dash-chart-area">
                <canvas #heroChartCanvas></canvas>
              </div>
            </div>
          </div>

        </div>
      </section>

      <!-- 3. LIVE MARKET TICKER (Ungated Marquee) -->
      <div class="ticker-ribbon border-y bg-gray-50">
        <div class="ticker-track">
          <div class="ticker-content font-mono text-sm">
            <span>Sony WH-1000XM5 · Walmart · $398 &rarr; <span class="text-green fw-bold">$328 (-17.6%)</span></span><span class="pipe">///</span>
            <span>Samsung 990 Pro 2TB · Amazon · $189 &rarr; <span class="text-green fw-bold">$149 (-21.2%)</span></span><span class="pipe">///</span>
            <span>NVIDIA RTX 4090 FE · BestBuy · $1699 &rarr; <span class="text-green fw-bold">$1599 (-5.9%)</span></span><span class="pipe">///</span>
            <span>iPad Pro M2 · Target · $899 &rarr; <span class="text-green fw-bold">$799 (-11.1%)</span></span><span class="pipe">///</span>
            <span>Logitech G Pro X · eBay · $129 &rarr; <span class="text-green fw-bold">$99 (-23.3%)</span></span><span class="pipe">///</span>
          </div>
          <!-- Duplicate for seamless loop -->
          <div class="ticker-content font-mono text-sm">
            <span>Sony WH-1000XM5 · Walmart · $398 &rarr; <span class="text-green fw-bold">$328 (-17.6%)</span></span><span class="pipe">///</span>
            <span>Samsung 990 Pro 2TB · Amazon · $189 &rarr; <span class="text-green fw-bold">$149 (-21.2%)</span></span><span class="pipe">///</span>
            <span>NVIDIA RTX 4090 FE · BestBuy · $1699 &rarr; <span class="text-green fw-bold">$1599 (-5.9%)</span></span><span class="pipe">///</span>
            <span>iPad Pro M2 · Target · $899 &rarr; <span class="text-green fw-bold">$799 (-11.1%)</span></span><span class="pipe">///</span>
            <span>Logitech G Pro X · eBay · $129 &rarr; <span class="text-green fw-bold">$99 (-23.3%)</span></span><span class="pipe">///</span>
          </div>
        </div>
      </div>

      <!-- 4. PLATFORM STATISTICS & BAR CHART (Partially Gated) -->
      <section class="py-20 bg-white border-b">
        <div class="main-grid">
          <div class="grid-4 mb-16">
            <div class="stat-block" appScrollReveal>
              <h2 class="fs-4xl fw-bold text-blue" [appCountUp]="24" [precision]="1">0</h2>
              <div class="text-sm fw-bold uppercase tracking-wide text-charcoal">Million Savings</div>
            </div>
            <div class="stat-block" appScrollReveal [delay]="100">
              <h2 class="fs-4xl fw-bold text-blue" [appCountUp]="842">0</h2>
              <div class="text-sm fw-bold uppercase tracking-wide text-charcoal">Thousand Data Points</div>
            </div>
            <div class="stat-block" appScrollReveal [delay]="200">
              <h2 class="fs-4xl fw-bold text-blue" [appCountUp]="48">0</h2>
              <div class="text-sm fw-bold uppercase tracking-wide text-charcoal">Global Markets</div>
            </div>
            <div class="stat-block" appScrollReveal [delay]="300">
              <h2 class="fs-4xl fw-bold text-blue"><span [appCountUp]="42">0</span>ms</h2>
              <div class="text-sm fw-bold uppercase tracking-wide text-charcoal">Avg Response</div>
            </div>
          </div>

          <!-- Gated Bar Chart -->
          <div class="gated-chart-container border rounded bg-white shadow-sm" appScrollReveal>
            <div class="chart-header flex-between p-4 border-b bg-gray-50">
              <h3 class="fw-bold fs-md">Category Volatility Analysis</h3>
              <div class="time-tabs">
                <button class="tab-btn active">7D</button>
                <button class="tab-btn locked" (click)="openGateModal('30-day volatility data')">30D <span class="lock-ico">🔒</span></button>
                <button class="tab-btn locked" (click)="openGateModal('90-day volatility data')">90D <span class="lock-ico">🔒</span></button>
              </div>
            </div>
            <div class="p-6">
              <canvas #volatilityCtx height="80"></canvas>
            </div>
          </div>
        </div>
      </section>

      <!-- 5. FOR CLIENTS: WATCHLIST PREVIEW (Gated) -->
      <section class="py-20 bg-gray-50 border-b">
        <div class="main-grid split-feature">
          <div class="feature-text pr-12" appScrollReveal>
            <div class="badge-eyebrow mb-4">For Clients</div>
            <h2 class="type-h2 mb-4">Smart Watchlists & Real-time Alerts.</h2>
            <p class="text-slate mb-6">
              Procurement teams use PulsePrice to track specific SKUs across the globe. Set target prices and let our nodes notify you the second your buy-zone is hit.
            </p>
            <ul class="check-list mb-8">
              <li>&check; Cross-platform price history comparisons</li>
              <li>&check; Instant target notifications</li>
              <li>&check; API webhook integrations</li>
            </ul>
            <button routerLink="/auth/signup" [queryParams]="{role: 'Client'}" class="btn-primary">Create Watchlist</button>
          </div>
          
          <div class="feature-visual" appScrollReveal [delay]="200">
            <div class="data-table-wrapper border shadow-md bg-white rounded">
              <div class="table-header p-4 border-b bg-charcoal text-white flex-between">
                <div class="fw-bold">My Watchlist</div>
                <button (click)="openGateModal('View All Watchlists')" class="text-xs text-slate hover-white">View All &rarr;</button>
              </div>
              <table class="fomo-table w-100">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Platform</th>
                    <th class="text-right">Current</th>
                    <th class="text-right">Target</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of watchlistRows" 
                      [ngClass]="{'locked-row': row.locked}" 
                      (click)="row.locked ? openGateModal('Unlimited Watchlist Tracking') : null">
                    
                    <ng-container *ngIf="!row.locked; else lockedContent">
                      <td class="fw-medium">{{row.product}}</td>
                      <td class="text-slate text-sm">{{row.platform}}</td>
                      <td class="text-right font-mono">{{row.current | currency}}</td>
                      <td class="text-right font-mono text-green">{{row.target | currency}}</td>
                    </ng-container>

                    <ng-template #lockedContent>
                      <td colspan="4" class="locked-cell">
                        <div class="blur-overlay"></div>
                        <div class="lock-content">
                          <span class="fs-xl mb-1 d-block">🔒</span>
                          <span class="text-xs fw-bold tracking-wide uppercase">Sign in to unlock</span>
                        </div>
                        <!-- Blurred dummy content -->
                        <div class="dummy-flex">
                          <span class="dummy-text w-32"></span>
                          <span class="dummy-text w-16"></span>
                          <span class="dummy-text w-16 text-right"></span>
                          <span class="dummy-text w-16 text-right"></span>
                        </div>
                      </td>
                    </ng-template>
                  </tr>
                </tbody>
              </table>
              <div class="table-footer bg-blue-light p-3 text-center border-t cursor-pointer" (click)="openGateModal('Unlimited Watchlist Tracking')">
                <span class="text-sm fw-medium text-blue">Sign in to track unlimited products and receive instant alerts &rarr;</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 6. FOR ENTREPRENEURS: COMPETITOR INTEL (Gated) -->
      <section class="py-20 bg-white border-b">
        <div class="main-grid split-feature flex-row-reverse">
          <div class="feature-text pl-12" appScrollReveal>
            <div class="badge-eyebrow mb-4">For Entrepreneurs</div>
            <h2 class="type-h2 mb-4">Total Competitor Intelligence.</h2>
            <p class="text-slate mb-6">
              Track rival pricing matrices, visualize your true market positioning, and automate your repricing logic to win the Buy Box without racing to the bottom.
            </p>
            <ul class="check-list mb-8">
              <li>&check; Sub-second competitor tracking</li>
              <li>&check; Visual market positioning matrices</li>
              <li>&check; War room feed & repricing engine</li>
            </ul>
            <button routerLink="/auth/signup" [queryParams]="{role: 'Entrepreneur'}" class="btn-primary">Monitor Competitors</button>
          </div>
          
          <div class="feature-visual" appScrollReveal [delay]="200">
            <div class="data-table-wrapper border shadow-md bg-white rounded">
              <div class="table-header p-4 border-b bg-charcoal text-white flex-between">
                <div class="fw-bold">Rival Radar</div>
                <button (click)="openGateModal('Export Competitor Report')" class="text-xs text-slate hover-white">Export &darr;</button>
              </div>
              <table class="fomo-table w-100">
                <thead>
                  <tr>
                    <th>Competitor</th>
                    <th>Product</th>
                    <th class="text-right">Their Price</th>
                    <th class="text-center">Pos</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of competitorRows" 
                      [ngClass]="{'locked-row': row.locked}" 
                      (click)="row.locked ? openGateModal('Deep Competitor Intelligence') : null">
                    
                    <ng-container *ngIf="!row.locked; else lockedCompContent">
                      <td class="fw-medium">{{row.competitor}}</td>
                      <td class="text-slate text-xs">{{row.product | slice:0:15}}...</td>
                      <td class="text-right font-mono">{{row.theirPrice | currency}}</td>
                      <td class="text-center">
                        <span class="pos-dot" [ngClass]="row.position"></span>
                      </td>
                    </ng-container>

                    <ng-template #lockedCompContent>
                      <td colspan="4" class="locked-cell">
                        <div class="blur-overlay"></div>
                        <div class="lock-content">
                          <span class="fs-xl mb-1 d-block">🔒</span>
                          <span class="text-xs fw-bold tracking-wide uppercase">Unlock Rivals</span>
                        </div>
                        <div class="dummy-flex">
                          <span class="dummy-text w-24"></span>
                          <span class="dummy-text w-24"></span>
                          <span class="dummy-text w-16 text-right"></span>
                          <span class="dummy-text w-8 text-center"></span>
                        </div>
                      </td>
                    </ng-template>
                  </tr>
                </tbody>
              </table>
              <div class="table-footer bg-gray-50 p-3 text-center border-t cursor-pointer" (click)="openGateModal('Automated Repricing')">
                <span class="text-sm fw-medium text-slate">Sign in to monitor all competitors and automate your repricing &rarr;</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 7. LIVE FEED LOG & 8. MARKET INSIGHTS CHART -->
      <section class="py-20 bg-charcoal text-white">
        <div class="main-grid">
          <div class="section-header text-center mb-12" appScrollReveal>
            <h2 class="type-h2 text-white">The Pulse of Commerce</h2>
            <p class="text-gray-400 mt-4 max-w-2xl mx-auto">
              Witness the raw ingestion pipeline in real-time, or deeply analyze global category trends up to a year into the past.
            </p>
          </div>

          <div class="grid-layout-feed-chart">
            
            <!-- Live Event Feed (Auto-scrolling, blurring at bottom) -->
            <div class="feed-column border border-gray-700 rounded bg-gray-900 overflow-hidden relative" appScrollReveal>
              <div class="p-4 border-b border-gray-700 bg-black flex-between">
                <span class="fw-bold fs-sm">Live System Log</span>
                <span class="pulse-dot green"></span>
              </div>
              <div class="feed-container">
                <div class="feed-item" *ngFor="let event of feedEvents; let i = index" [style.opacity]="1 - (i * 0.15)">
                  <div class="flex-between mb-1">
                    <span class="text-xs text-gray-400">{{event.platform}}</span>
                    <span class="text-xs font-mono text-gray-500">{{event.time}}</span>
                  </div>
                  <div class="text-sm fw-medium mb-1">{{event.product}}</div>
                  <div class="font-mono text-xs text-green">{{event.dropRaw}} ({{event.dropPct}})</div>
                </div>
              </div>
              <!-- Bottom gradient blur lock -->
              <div class="feed-fade-lock">
                <button (click)="openGateModal('Live System Feed')" class="btn-primary w-100 shadow-lg">Sign in to see live feed</button>
              </div>
            </div>

            <!-- Heavy Chart (Gated right half) -->
            <div class="chart-column border border-gray-700 rounded bg-gray-900" appScrollReveal [delay]="200">
              <div class="p-4 border-b border-gray-700 bg-black flex-between">
                <span class="fw-bold fs-sm">Global Category Averages</span>
                <div class="time-tabs dark-tabs">
                  <button class="tab-btn active">7D</button>
                  <button class="tab-btn locked" (click)="openGateModal('30-day index history')">30D 🔒</button>
                  <button class="tab-btn locked" (click)="openGateModal('90-day index history')">90D 🔒</button>
                  <button class="tab-btn locked" (click)="openGateModal('1-Year index history')">1Y 🔒</button>
                </div>
              </div>
              <div class="p-6 relative">
                <canvas #insightsCtx height="250"></canvas>
                <!-- Horizontal blur gradient over the right side of the canvas -->
                <div class="chart-fade-lock">
                  <div class="lock-panel bg-charcoal border border-gray-600 rounded p-4 text-center shadow-2xl">
                    <div class="fs-xl mb-2">🔒</div>
                    <div class="fw-bold mb-2">30+ Days of Market Intelligence</div>
                    <button (click)="openGateModal('Full Timeline Analytics')" class="btn-outline text-white border-gray-500 w-100">Sign in to unlock</button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- 9. TESTIMONIALS -->
      <section class="py-24 bg-gray-50 border-b">
        <div class="main-grid">
          <div class="grid-3 gap-8">
            <div class="testimonial-card bg-white p-8 border rounded shadow-sm" appScrollReveal>
              <div class="stars text-blue mb-4">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              <p class="text-charcoal italic mb-6">"PulsePrice completely transformed our procurement cycle. We hit our target margins 14% more frequently since setting up the automated watchlists."</p>
              <div class="author">
                <div class="fw-bold text-sm">Sarah Jenkins</div>
                <div class="text-xs text-slate">Procurement Manager, TechSource</div>
              </div>
            </div>
            <div class="testimonial-card bg-white p-8 border rounded shadow-sm" appScrollReveal [delay]="100">
              <div class="stars text-blue mb-4">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              <p class="text-charcoal italic mb-6">"The competitor intelligence matrix is ruthless. We can finally see exactly when our rivals sell out of stock and instantly adjust our floor pricing to capture margin."</p>
              <div class="author">
                <div class="fw-bold text-sm">Marcus Vance</div>
                <div class="text-xs text-slate">E-Commerce Operator</div>
              </div>
            </div>
            <div class="testimonial-card bg-white p-8 border rounded shadow-sm" appScrollReveal [delay]="200">
              <div class="stars text-blue mb-4">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              <p class="text-charcoal italic mb-6">"As a pricing consultant, I used to build scraping scripts manually. Having an enterprise-grade API that just feeds me clean historical data is worth its weight in gold."</p>
              <div class="author">
                <div class="fw-bold text-sm">Elena Rostova</div>
                <div class="text-xs text-slate">Principal, Apex Retail Strategy</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 10. SPLIT CTA -->
      <section class="split-cta bg-white">
        <div class="main-grid split-grid p-0">
          <div class="cta-half bg-blue-light p-16 text-center border-r border-b">
            <h2 class="type-h2 text-blue mb-4">For Clients & Procurement</h2>
            <p class="text-slate mb-8 max-w-sm mx-auto">Stop overpaying for your inventory. Set target logic and let the nodes monitor the market 24/7.</p>
            <button routerLink="/auth/signup" [queryParams]="{role: 'Client'}" class="btn-primary btn-lg">Deploy Watchlists</button>
          </div>
          <div class="cta-half bg-gray-50 p-16 text-center border-b">
            <h2 class="type-h2 text-charcoal mb-4">For Entrepreneurs & Sellers</h2>
            <p class="text-slate mb-8 max-w-sm mx-auto">Dominate the buy-box. Track your rivals instantly and execute automated repricing strategies.</p>
            <button routerLink="/auth/signup" [queryParams]="{role: 'Entrepreneur'}" class="btn-outline btn-lg border-gray-400">Initialize Radar</button>
          </div>
        </div>
      </section>

      <!-- 11. FOOTER -->
      <footer class="bg-white py-12">
        <div class="main-grid">
          <div class="footer-grid">
            <div class="footer-brand pr-12">
              <span class="logo fw-bold fs-xl mb-4 d-block text-charcoal">PulsePrice<span class="text-blue">.</span></span>
              <p class="text-slate text-sm lh-base max-w-xs">
                Real-time price discovery infrastructure.
              </p>
              <div class="text-slate text-xs mt-8">&copy; 2026 PulsePrice Inc.</div>
            </div>
            <div class="footer-links">
              <h4 class="text-sm fw-bold mb-4 uppercase tracking-wide text-charcoal">Product</h4>
              <ul><li><a>Clients</a></li><li><a>Entrepreneurs</a></li></ul>
            </div>
            <div class="footer-links">
              <h4 class="text-sm fw-bold mb-4 uppercase tracking-wide text-charcoal">Company</h4>
              <ul><li><a>About</a></li><li><a>Careers</a></li><li><a>Contact</a></li></ul>
            </div>
            <div class="footer-links">
              <h4 class="text-sm fw-bold mb-4 uppercase tracking-wide text-charcoal">Legal</h4>
              <ul><li><a>Privacy</a></li><li><a>Terms</a></li><li><a>Status</a></li></ul>
            </div>
          </div>
        </div>
      </footer>

      <!-- UNIVERSAL FOMO LOGIN MODAL -->
      <div class="fomo-modal-backdrop" *ngIf="showModal" [class.active]="showModal">
        <div class="fomo-modal bg-white border rounded shadow-2xl">
          <button class="close-btn text-gray-400 hover-charcoal" (click)="closeModal()">&times;</button>
          
          <div class="p-8">
            <div class="text-center mb-6">
              <div class="lock-circle bg-blue-light text-blue mx-auto mb-4 flex-center rounded-full fs-xl">🔒</div>
              <h3 class="fw-bold fs-xl text-charcoal mb-2">Authentication Required</h3>
              <p class="text-slate text-sm">Sign in to unlock <span class="fw-medium text-charcoal">{{ gateReason }}</span>.</p>
            </div>

            <!-- Role Toggle -->
            <div class="role-toggle bg-gray-100 p-1 rounded flex mb-6">
              <button class="role-btn flex-1 py-2 text-sm fw-medium rounded" [class.active]="modalRole === 'Client'" (click)="modalRole = 'Client'">I am a Client</button>
              <button class="role-btn flex-1 py-2 text-sm fw-medium rounded" [class.active]="modalRole === 'Entrepreneur'" (click)="modalRole = 'Entrepreneur'">I am an Entrepreneur</button>
            </div>

            <form (submit)="$event.preventDefault()">
              <div class="mb-4">
                <label class="block text-xs fw-bold text-slate uppercase tracking-wide mb-1">Business Email</label>
                <input type="email" class="form-input w-100 border p-2 rounded text-sm bg-gray-50" placeholder="name@company.com">
              </div>
              <div class="mb-6">
                <label class="block text-xs fw-bold text-slate uppercase tracking-wide mb-1">Password</label>
                <input type="password" class="form-input w-100 border p-2 rounded text-sm bg-gray-50" placeholder="••••••••">
              </div>
              
              <button routerLink="/auth/login" class="btn-primary w-100 py-3 fw-bold shadow-md mb-4">Continue &rarr;</button>
              <button routerLink="/auth/signup" class="btn-outline w-100 py-2 text-sm border-transparent text-slate hover-charcoal">Create free account</button>
            </form>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    // Base resets and utility integration
    $c-white: #ffffff; $c-black: #000000;
    $c-gray-50: #f9fafb; $c-gray-100: #f3f4f6; $c-gray-200: #e5e7eb; $c-gray-300: #d1d5db; $c-gray-400: #9ca3af; $c-gray-500: #6b7280; $c-gray-600: #4b5563; $c-gray-700: #374151; $c-gray-900: #111827;
    $c-slate: #6b7280; $c-charcoal: #1f2937;
    $c-blue: #2563eb; $c-blue-hover: #1d4ed8; $c-blue-light: #eff6ff;
    $c-green: #10b981; $c-red: #ef4444;

    .fomo-landing {
      font-family: 'Inter', -apple-system, sans-serif;
      background-color: $c-white; color: $c-charcoal;
      -webkit-font-smoothing: antialiased; line-height: 1.5;
    }

    /* TYPOGRAPHY & UTILS */
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    .fw-medium { font-weight: 500; } .fw-bold { font-weight: 600; }
    .text-xs { font-size: 0.75rem; } .text-sm { font-size: 0.875rem; }
    .fs-sm { font-size: 0.875rem; } .fs-md { font-size: 1.125rem; } .fs-xl { font-size: 1.5rem; } .fs-4xl { font-size: 2.25rem; letter-spacing: -1px;}
    .uppercase { text-transform: uppercase; } .tracking-wide { letter-spacing: 0.05em; }
    .text-center { text-align: center; } .text-right { text-align: right; }
    .italic { font-style: italic; } .d-block { display: block; } .block { display: block; }
    
    .text-white { color: $c-white; } .text-charcoal { color: $c-charcoal; } .text-slate { color: $c-slate; } .text-gray-400 { color: $c-gray-400; } .text-gray-500 { color: $c-gray-500; }
    .text-blue { color: $c-blue; } .text-green { color: $c-green; } .text-red { color: $c-red; }
    .bg-white { background: $c-white; } .bg-gray-50 { background: $c-gray-50; } .bg-gray-100 { background: $c-gray-100; } .bg-gray-900 { background: $c-gray-900; }
    .bg-black { background: $c-black; } .bg-blue-light { background: $c-blue-light; } .bg-charcoal { background: $c-charcoal; }
    
    .w-100 { width: 100%; } .h-100 { height: 100%; } .w-16 { width: 4rem; } .w-24 { width: 6rem; } .w-32 { width: 8rem; }
    .max-w-sm { max-width: 24rem; } .max-w-2xl { max-width: 42rem; } .mx-auto { margin-left: auto; margin-right: auto; }
    .cursor-pointer { cursor: pointer; } .relative { position: relative; } .absolute { position: absolute; }
    .overflow-hidden { overflow: hidden; } .overflow-auto { overflow-x: auto; }
    
    .border { border: 1px solid $c-gray-200; } .border-b { border-bottom: 1px solid $c-gray-200; } .border-t { border-top: 1px solid $c-gray-200; } .border-y { border-top: 1px solid $c-gray-200; border-bottom: 1px solid $c-gray-200; } .border-l { border-left: 1px solid $c-gray-200; } .border-r { border-right: 1px solid $c-gray-200; }
    .border-gray-400 { border-color: $c-gray-400; } .border-gray-500 { border-color: $c-gray-500; } .border-gray-600 { border-color: $c-gray-600; } .border-gray-700 { border-color: $c-gray-700; } .border-transparent { border-color: transparent; }
    .rounded { border-radius: 0.5rem; } .rounded-full { border-radius: 9999px; }
    .shadow-sm { box-shadow: 0 1px 2px rgba(0,0,0,0.05); } .shadow-md { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); } .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); } .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); } .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }

    /* LAYOUT GRIDS */
    .main-grid { max-width: 1280px; margin: 0 auto; padding: 0 2rem; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; } .flex-center { display: flex; justify-content: center; align-items: center; } .flex-1 { flex: 1; }
    .flex-row-reverse { flex-direction: row-reverse; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; } .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; }
    @media (max-width: 768px) { .grid-3, .grid-4 { grid-template-columns: 1fr; } .hidden-mobile { display: none !important; } }
    
    /* SPACING */
    .p-0 { padding: 0; } .p-1 { padding: 0.25rem; } .p-2 { padding: 0.5rem; } .p-3 { padding: 0.75rem; } .p-4 { padding: 1rem; } .p-6 { padding: 1.5rem; } .p-8 { padding: 2rem; } .p-16 { padding: 4rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; } .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; } .py-12 { padding-top: 3rem; padding-bottom: 3rem; } .py-20 { padding-top: 5rem; padding-bottom: 5rem; } .py-24 { padding-top: 6rem; padding-bottom: 6rem; }
    .px-10 { padding-left: 2.5rem; padding-right: 2.5rem; } .pr-12 { padding-right: 3rem; } .pl-12 { padding-left: 3rem; }
    .m-0 { margin: 0; } .mb-1 { margin-bottom: 0.25rem; } .mb-2 { margin-bottom: 0.5rem; } .mt-4 { margin-top: 1rem; } .mb-4 { margin-bottom: 1rem; } .mb-6 { margin-bottom: 1.5rem; } .mb-8 { margin-bottom: 2rem; } .mt-8 { margin-top: 2rem; } .mt-10 { margin-top: 2.5rem; } .mb-12 { margin-bottom: 3rem; } .mb-16 { margin-bottom: 4rem; }

    /* BUTTONS */
    button { font-family: inherit; border-radius: 0.375rem; transition: all 0.2s; cursor: pointer; }
    .btn-text { background: none; border: none; color: $c-slate; padding: 0.5rem; &:hover { color: $c-charcoal; } }
    .btn-primary { background: $c-blue; color: $c-white; border: 1px solid transparent; font-weight: 500; padding: 0.5rem 1rem; &:hover { background: $c-blue-hover; } }
    .btn-outline { background: transparent; color: $c-charcoal; border: 1px solid $c-gray-300; font-weight: 500; padding: 0.5rem 1rem; &:hover { background: $c-gray-50; } }
    .btn-lg { padding: 0.75rem 1.5rem; font-size: 1rem; }
    
    /* 1. NAV */
    .fomo-nav { height: 64px; border-bottom: 1px solid $c-gray-200; position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.9); backdrop-filter: blur(8px); display: flex; align-items: center; }
    .fomo-nav .main-grid { display: flex; justify-content: space-between; align-items: center; width: 100%; }
    .fomo-nav .logo { font-size: 1.25rem; letter-spacing: -0.025em; }
    .nav-links { display: flex; gap: 2rem; }
    .nav-link { color: $c-slate; font-size: 0.875rem; font-weight: 500; cursor: pointer; &:hover { color: $c-charcoal; } }
    .nav-actions { display: flex; gap: 1rem; align-items: center; }

    /* 2. HERO */
    .hero-section { padding-top: 6rem; padding-bottom: 4rem; }
    .split-hero { display: grid; grid-template-columns: 1fr 1.1fr; gap: 4rem; align-items: center; }
    @media (max-width: 1024px) { .split-hero { grid-template-columns: 1fr; } }
    
    .badge-eyebrow { display: inline-block; padding: 0.25rem 0.75rem; background: $c-blue-light; color: $c-blue; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 9999px; }
    .hero-h1 { font-size: clamp(3rem, 5vw, 4.5rem); font-weight: 800; line-height: 1.1; letter-spacing: -0.03em; margin-bottom: 1.5rem; }
    .hero-lead { font-size: 1.125rem; line-height: 1.7; max-width: 30rem; }
    .hero-ctas { display: flex; gap: 1rem; }
    
    .social-proof { display: flex; align-items: center; gap: 1.5rem; }
    .proof-stat { display: flex; flex-direction: column; }
    .proof-divider { width: 1px; height: 32px; background: $c-gray-200; }

    /* MOCK DASHBOARD in Hero */
    .dashboard-mock { background: $c-white; border-radius: 0.5rem; overflow: hidden; }
    .dash-header { padding: 1rem; display: flex; justify-content: space-between; align-items: center; background: $c-gray-50; }
    .live-indicator { display: flex; align-items: center; font-size: 0.75rem; font-weight: 600; color: $c-green; text-transform: uppercase; letter-spacing: 0.05em; }
    .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: $c-green; margin-right: 6px; box-shadow: 0 0 8px $c-green; animation: pulse 2s infinite; }
    @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }
    
    .dash-kpis { display: grid; grid-template-columns: repeat(3, 1fr); background: $c-white; }
    .kpi-box { padding: 1rem; text-align: center; }
    .kpi-label { font-size: 0.75rem; color: $c-slate; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-bottom: 0.25rem; }
    .kpi-val { font-size: 1.5rem; font-family: 'JetBrains Mono', monospace; font-weight: 700; }
    .dash-chart-area { padding: 1.5rem; height: 260px; background: $c-white; }

    /* 3. SCROLLING TICKER */
    .ticker-ribbon { height: 48px; display: flex; align-items: center; overflow: hidden; white-space: nowrap; }
    .ticker-track { display: flex; width: max-content; animation: marquee 40s linear infinite; }
    .ticker-content { display: flex; align-items: center; gap: 2rem; padding-right: 2rem; }
    .ticker-content span { color: $c-charcoal; }
    .pipe { color: $c-gray-300 !important; font-weight: 800; }
    @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

    /* 4. TABS & GATED CHARTS */
    .time-tabs { display: flex; background: $c-gray-200; padding: 2px; border-radius: 0.375rem; }
    .dark-tabs { background: $c-gray-700; }
    .tab-btn { background: transparent; border: none; font-size: 0.75rem; font-weight: 600; padding: 4px 12px; border-radius: 0.25rem; color: $c-slate; }
    .dark-tabs .tab-btn { color: $c-gray-400; }
    .tab-btn.active { background: $c-white; color: $c-charcoal; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
    .dark-tabs .tab-btn.active { background: $c-charcoal; color: $c-white; }
    .tab-btn.locked { cursor: pointer; transition: 0.2s; }
    .tab-btn.locked:hover { color: $c-blue; }
    .dark-tabs .tab-btn.locked:hover { color: $c-white; }

    /* 5 & 6. SPLIT FEATURES & TABLES */
    .split-feature { display: grid; grid-template-columns: 1fr 1.2fr; gap: 4rem; align-items: center; }
    @media (max-width: 1024px) { .split-feature { grid-template-columns: 1fr; } .flex-row-reverse { flex-direction: column; } .pr-12, .pl-12 { padding: 0; } }
    .type-h2 { font-size: 2.25rem; font-weight: 800; letter-spacing: -0.025em; line-height: 1.2; margin: 0; }
    .check-list { list-style: none; padding: 0; margin: 0; li { margin-bottom: 0.75rem; color: $c-charcoal; font-weight: 500; font-size: 0.875rem; } }

    /* FOMO Data Tables with Blur Logic */
    .fomo-table { border-collapse: collapse; background: $c-white; }
    .fomo-table th { padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: $c-slate; border-bottom: 1px solid $c-gray-200; background: $c-gray-50; }
    .fomo-table td { padding: 1rem; border-bottom: 1px solid $c-gray-100; font-size: 0.875rem; }
    .fomo-table tbody tr:not(.locked-row):hover { background: $c-gray-50; }
    
    /* Gated Row Styling */
    .locked-row { position: relative; cursor: pointer; }
    .locked-cell { position: relative; padding: 0 !important; border: none !important; height: 53px; }
    .blur-overlay { position: absolute; inset: 0; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); background: rgba(255,255,255,0.4); z-index: 1; transition: 0.2s; }
    .locked-row:hover .blur-overlay { background: rgba(255,255,255,0.2); backdrop-filter: blur(2px); }
    
    .lock-content { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 2; color: $c-slate; transition: 0.2s; }
    .locked-row:hover .lock-content { transform: scale(1.05); color: $c-charcoal; }
    
    .dummy-flex { display: flex; justify-content: space-between; padding: 1rem; opacity: 0.2; }
    .dummy-text { height: 16px; background: $c-gray-400; border-radius: 4px; }
    
    .pos-dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; }
    .pos-dot.above { background: $c-green; } .pos-dot.below { background: $c-red; } .pos-dot.match { background: $c-gray-400; }

    /* 7 & 8. FEED & INSIGHTS GRID */
    .grid-layout-feed-chart { display: grid; grid-template-columns: 300px 1fr; gap: 2rem; }
    @media (max-width: 900px) { .grid-layout-feed-chart { grid-template-columns: 1fr; } }
    
    /* Live Feed Logic */
    .feed-column { height: 400px; display: flex; flex-direction: column; }
    .feed-container { flex: 1; padding: 1rem; overflow: hidden; display: flex; flex-direction: column; gap: 1rem; }
    .feed-item { padding-bottom: 1rem; border-bottom: 1px solid $c-gray-700; transition: transform 0.5s ease-in-out; }
    .feed-item:last-child { border: none; }
    .feed-fade-lock { position: absolute; bottom: 0; left: 0; right: 0; height: 150px; background: linear-gradient(to bottom, transparent, $c-gray-900 80%); display: flex; align-items: flex-end; padding: 1rem; z-index: 10; }

    /* Massive Chart Logic */
    .chart-column { height: 400px; display: flex; flex-direction: column; }
    .chart-fade-lock { position: absolute; top: 0; bottom: 0; right: 0; width: 50%; background: linear-gradient(to right, transparent, rgba(17,24,39,0.95) 40%); z-index: 10; display: flex; align-items: center; justify-content: flex-end; padding: 2rem; }
    .lock-panel { width: 280px; backdrop-filter: blur(8px); }

    /* 9 & 10 SOCIAL PROOF & CTA */
    .split-grid { display: grid; grid-template-columns: 1fr 1fr; }

    /* ALL MIGHTY UNIVERSAL MODAL */
    .fomo-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 9999; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: 0.3s; }
    .fomo-modal-backdrop.active { opacity: 1; pointer-events: auto; }
    .fomo-modal { width: 100%; max-width: 420px; position: relative; transform: translateY(20px); transition: 0.3s; }
    .fomo-modal-backdrop.active .fomo-modal { transform: translateY(0); }
    .close-btn { position: absolute; top: 1rem; right: 1.5rem; background: none; border: none; font-size: 1.5rem; cursor: pointer; }
    .hover-charcoal:hover { color: $c-charcoal; }
    .lock-circle { width: 64px; height: 64px; }
    .role-toggle { border: 1px solid $c-gray-200; }
    .role-btn { background: transparent; border: none; color: $c-slate; transition: 0.2s; cursor: pointer; }
    .role-btn.active { background: $c-white; color: $c-charcoal; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .form-input { outline: none; transition: 0.2s; } .form-input:focus { border-color: $c-blue; box-shadow: 0 0 0 2px $c-blue-light; }
    
    /* 11. FOOTER */
    .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 2rem; }
    @media (max-width: 768px) { .footer-grid { grid-template-columns: 1fr; gap: 3rem; } .footer-brand.pr-12 { padding-right: 0; } }
    .footer-links ul { list-style: none; padding: 0; margin: 0; }
    .footer-links li { margin-bottom: 0.75rem; }
    .footer-links a { color: $c-slate; font-size: 0.875rem; cursor: pointer; transition: color 0.2s; }
    .footer-links a:hover { color: $c-blue; }
  `]
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  // Chart Elements
  @ViewChild('heroChartCanvas') heroChartCanvas!: ElementRef;
  @ViewChild('volatilityCtx') volatilityCtx!: ElementRef;
  @ViewChild('insightsCtx') insightsCtx!: ElementRef;

  heroChartInstance: Chart | null = null;
  volatilityChartInstance: Chart | null = null;
  insightsChartInstance: Chart | null = null;

  // Timers
  private kpiTimer: any;
  private feedTimer: any;
  private isBrowser: boolean;

  // Live KPI State
  liveDrops: number = 241;
  liveSavingsPct: number = 14.2;
  liveAlerts: number = 890;

  // Mock Table Data
  watchlistRows: IWatchlistRow[] = [
    { product: 'Samsung Odyssey G9', platform: 'Amazon', current: 1299.99, target: 1100.00, distance: 15, trend: [], locked: false },
    { product: 'MacBook Pro M3 Max', platform: 'BestBuy', current: 3199.00, target: 2999.00, distance: 6, trend: [], locked: false },
    { product: 'Sony Alpha a7 IV', platform: 'B&H Photo', current: 2498.00, target: 2200.00, distance: 12, trend: [], locked: false },
    { product: 'Locked Asset 1', platform: 'Locked Plattform', current: 0, target: 0, distance: 0, trend: [], locked: true },
    { product: 'Locked Asset 2', platform: 'Locked Plattform', current: 0, target: 0, distance: 0, trend: [], locked: true }
  ];

  competitorRows: ICompetitorRow[] = [
    { competitor: 'TechNova', product: 'Wireless Earbuds X', theirPrice: 129.00, yourPrice: 135.00, position: 'below', locked: false },
    { competitor: 'GadgetZone', product: 'Wireless Earbuds X', theirPrice: 139.00, yourPrice: 135.00, position: 'above', locked: false },
    { competitor: 'AudioPro Supply', product: 'Wireless Earbuds X', theirPrice: 135.00, yourPrice: 135.00, position: 'match', locked: false },
    { competitor: 'Locked Rival 1', product: 'Locked Product', theirPrice: 0, yourPrice: 0, position: 'match', locked: true },
    { competitor: 'Locked Rival 2', product: 'Locked Product', theirPrice: 0, yourPrice: 0, position: 'match', locked: true }
  ];

  // Feed Log State
  feedEvents: IFeedEvent[] = [
    { product: 'MSI GeForce RTX 4080', platform: 'Newegg', dropRaw: '-$50', dropPct: '4.1%', time: 'Just now' },
    { product: 'Apple Watch Series 9', platform: 'Target', dropRaw: '-$30', dropPct: '7.5%', time: '12s ago' },
    { product: 'LG C3 Series 65" OLED', platform: 'BestBuy', dropRaw: '-$200', dropPct: '11.2%', time: '28s ago' },
    { product: 'Dyson V15 Detect', platform: 'Amazon', dropRaw: '-$80', dropPct: '10.6%', time: '41s ago' },
    { product: 'Bose QuietComfort 45', platform: 'Walmart', dropRaw: '-$50', dropPct: '15.2%', time: '59s ago' }
  ];
  
  mockFeedPool: IFeedEvent[] = [
    { product: 'GoPro HERO12 Black', platform: 'B&H Photo', dropRaw: '-$60', dropPct: '15.0%', time: 'Just now' },
    { product: 'Nintendo Switch OLED', platform: 'GameStop', dropRaw: '-$25', dropPct: '7.1%', time: 'Just now' },
    { product: 'Secretlab Titan Evo', platform: 'Direct', dropRaw: '-$40', dropPct: '7.2%', time: 'Just now' },
    { product: 'Garmin Fenix 7', platform: 'REI', dropRaw: '-$100', dropPct: '14.2%', time: 'Just now' },
    { product: 'Keychron Q1 Pro', platform: 'Amazon', dropRaw: '-$20', dropPct: '10.0%', time: 'Just now' }
  ];

  // Global Modal State
  showModal: boolean = false;
  gateReason: string = '';
  modalRole: 'Client' | 'Entrepreneur' = 'Client';


  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.startKpiFluctuations();
      this.startFeedUpdates();
    }
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      setTimeout(() => {
        this.initHeroChart();
        this.initVolatilityChart();
        this.initInsightsChart();
      }, 100); // Slight delay ensures DOM is ready
    }
  }

  ngOnDestroy() {
    if (this.kpiTimer) clearInterval(this.kpiTimer);
    if (this.feedTimer) clearInterval(this.feedTimer);
    
    if (this.heroChartInstance) this.heroChartInstance.destroy();
    if (this.volatilityChartInstance) this.volatilityChartInstance.destroy();
    if (this.insightsChartInstance) this.insightsChartInstance.destroy();
  }

  // --- FOMO Modal Logic ---
  openGateModal(reason: string, defaultRole?: 'Client' | 'Entrepreneur') {
    this.gateReason = reason;
    if (defaultRole) this.modalRole = defaultRole;
    this.showModal = true;
    document.body.style.overflow = 'hidden'; // prevent bg scroll
  }

  closeModal() {
    this.showModal = false;
    document.body.style.overflow = '';
  }

  // --- Live Timer Logic ---
  private startKpiFluctuations() {
    this.kpiTimer = setInterval(() => {
      // Randomly flutter numbers up or down slightly every 4 seconds
      this.liveDrops += Math.floor(Math.random() * 5) - 1; 
      this.liveSavingsPct = +(this.liveSavingsPct + (Math.random() * 0.2 - 0.1)).toFixed(1);
      this.liveAlerts += Math.floor(Math.random() * 7) - 2;
    }, 4000);
  }

  private startFeedUpdates() {
    this.feedTimer = setInterval(() => {
      // Pick a random event from the pool
      const randomEvt = {...this.mockFeedPool[Math.floor(Math.random() * this.mockFeedPool.length)]};
      // Shift array
      this.feedEvents.unshift(randomEvt);
      if (this.feedEvents.length > 6) this.feedEvents.pop();
      // Age existing times
      this.feedEvents.forEach((evt, idx) => {
        if(idx > 0) evt.time = (parseInt(evt.time) || 0) + 8 + 's ago';
      });
    }, 8000);
  }

  // --- Chart.js Initializations ---

  private initHeroChart() {
    if (!this.heroChartCanvas) return;
    const ctx = this.heroChartCanvas.nativeElement.getContext('2d');
    
    const gradient1 = ctx.createLinearGradient(0, 0, 0, 260);
    gradient1.addColorStop(0, 'rgba(37, 99, 235, 0.2)');
    gradient1.addColorStop(1, 'rgba(37, 99, 235, 0)');

    this.heroChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'],
        datasets: [{
          label: 'Tech Hardware Index',
          data: [100, 98, 99, 95, 96, 92, 90],
          borderColor: '#2563eb', // text-blue
          backgroundColor: gradient1,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6
        },
        {
          label: 'Consumer Electronics',
          data: [100, 101, 100, 99, 97, 98, 95],
          borderColor: '#9ca3af', // text-gray-400
          borderWidth: 1.5,
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
        scales: {
          x: { display: false },
          y: { display: false, min: 85, max: 105 }
        },
        animation: { duration: 2000, easing: 'easeOutQuart' }
      }
    });
  }

  private initVolatilityChart() {
    if (!this.volatilityCtx) return;
    const ctx = this.volatilityCtx.nativeElement.getContext('2d');

    this.volatilityChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Processors', 'GPUs', 'Laptops', 'Monitors', 'Audio', 'Storage'],
        datasets: [{
          data: [4.2, 8.5, 2.1, 3.4, 5.8, 6.2],
          backgroundColor: '#eff6ff', // bg-blue-light
          borderColor: '#2563eb',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { display: false }, border: { display: false }, ticks: { display: false } },
          x: { grid: { display: false }, border: { display: false }, ticks: { color: '#6b7280', font: { size: 10 } } }
        }
      }
    });
  }

  private initInsightsChart() {
    if (!this.insightsCtx) return;
    const ctx = this.insightsCtx.nativeElement.getContext('2d');
    
    // Generate 30 days of mock data (left side is realistic, right side dives randomly into blur)
    const labels = Array.from({length: 30}, (_, i) => `Day ${i+1}`);
    let valA=100, valB=100;
    const dataA = labels.map((_,i) => { valA += (Math.random()*4-2); return i<7 ? valA : valA+(Math.random()*15-5); });
    const dataB = labels.map((_,i) => { valB += (Math.random()*3-1.5); return i<7 ? valB : valB+(Math.random()*10-3); });

    this.insightsChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { data: dataA, borderColor: '#10b981', borderWidth: 2, tension: 0.3, pointRadius: 0 },
          { data: dataB, borderColor: '#ef4444', borderWidth: 2, tension: 0.3, pointRadius: 0 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } }, // Tooltips disabled to force modal interaction
        scales: {
          x: { grid: { color: '#374151' }, ticks: { color: '#6b7280', maxTicksLimit: 8 } },
          y: { grid: { color: '#374151' }, ticks: { color: '#6b7280' } }
        }
      }
    });
  }
}
