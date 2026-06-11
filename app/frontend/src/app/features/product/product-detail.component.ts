import { Component, OnInit, OnDestroy, AfterViewInit, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PublicNavbarComponent } from '../../shared/components/public-navbar/public-navbar.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { AnalyticsApiService } from '../../core/services/analytics-api.service';
import { WatchlistService } from '../../core/services/watchlist.service';
import { ResellerService, SellerProduct } from '../../core/services/reseller.service';
import { ActivityLogsService } from '../../core/services/activity-logs.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicNavbarComponent, FormsModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ProductDetailComponent implements OnInit, OnDestroy, AfterViewInit {
  productId = '';
  product: any = {
    name: '', brand: null, category: '', dealScore: 0, isFakeDeal: false,
    description: '', image: '', images: [], platformCount: 0, platforms: [], bestPrice: 0, currentPrice: 0, bestPlatform: '',
    priceChange: 0, specs: []
  };
  activeTab = '1W';
  showAlertModal = false;
  showAlertForm = false;
  alertSet = false;
  isTracking = false;
  isLoggedIn = false;
  isReseller = false;
  showResellerPriceForm = false;
  resellerPrice: number | null = null;
  catalogProductId: string | null = null;
  catalogProducts: SellerProduct[] = [];

  authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);
  private analyticsApi = inject(AnalyticsApiService);
  private watchlistService = inject(WatchlistService);
  private resellerService = inject(ResellerService);
  private activityLogsService = inject(ActivityLogsService);

  historyTabs = [
    { label: '1W', requiresAuth: false },
    { label: '1M', requiresAuth: true },
    { label: '3M', requiresAuth: true },
    { label: '6M', requiresAuth: true },
    { label: '1Y', requiresAuth: true }
  ];

  currentChartData: any[] = [];
  fullHistoryData: any[] = [];
  similarProducts: any[] = [];
  isLoading = true;

  scoreFactors = [
    { label: 'Price vs history', score: 8.5, description: 'Currently 15% below the 90-day average price', color: '#10B981' },
    { label: 'Availability', score: 7.5, description: 'In stock at 6 of 8 tracked platforms', color: '#F59E0B' }
  ];

  suggestedAlertPrice = 0;
  alertTargetPrice = 0;

  @ViewChild('priceChart') priceChartCanvas!: ElementRef<HTMLCanvasElement>;
  private chartInstance: Chart<'line'> | null = null;
  private watchlistItemId: string | null = null;

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      this.isReseller = user?.role === 'RESELLER';
      if (this.isLoggedIn && !this.isReseller && this.productId) this.loadWatchlistStatus();
      if (this.isReseller) this.loadCatalogStatus();
    });

    this.route.params.subscribe(params => {
      this.productId = params['id'] ? decodeURIComponent(params['id']) : '';
      this.isTracking = false;
      this.alertSet = false;
      this.watchlistItemId = null;
      this.showAlertForm = false;
      this.showResellerPriceForm = false;
      this.catalogProductId = null;
      this.resellerPrice = null;
      this.fetchProductData();
      if (this.isLoggedIn && !this.isReseller && this.productId) this.loadWatchlistStatus();
      if (this.isReseller) this.loadCatalogStatus();
    });
  }

  private loadWatchlistStatus() {
    this.watchlistService.getWatchlist().pipe(catchError(() => of([]))).subscribe(items => {
      const match = (items as any[]).find((i: any) => i.product_id === this.productId);
      if (match) {
        this.watchlistItemId = match.id;
        this.isTracking = true;
        if (match.shopper_alerts && match.shopper_alerts.length > 0) {
          this.alertSet = true;
          this.alertTargetPrice = match.shopper_alerts[0].target_value;
        } else {
          this.alertSet = false;
          this.alertTargetPrice = 0;
        }
      } else {
        this.isTracking = false;
        this.alertSet = false;
        this.watchlistItemId = null;
      }
    });
  }

  private loadCatalogStatus() {
    this.resellerService.getProducts().pipe(catchError(() => of([]))).subscribe(prods => {
      this.catalogProducts = prods;
      const normalized = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
      const name = normalized(this.product.name);
      const words = name.split(/\s+/).filter(w => w.length > 2);
      const scored = prods.map(cp => {
        const cpName = normalized(cp.product_name);
        const matches = words.filter(w => cpName.includes(w)).length;
        const score = words.length > 0 ? matches / words.length : (cpName === name ? 1 : 0);
        const exactBonus = cpName === name ? 10 : 0;
        return { product: cp, score: score + exactBonus };
      });
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];
      if (best && best.score >= 0.5) {
        this.catalogProductId = best.product.id;
        this.isTracking = true;
      }
    });
  }

  private fetchProductData() {
    this.isLoading = true;

    forkJoin({
      details: this.analyticsApi.getProductDetail(this.productId).pipe(catchError(() => of([]))),
      history: this.analyticsApi.getProductHistory(this.productId).pipe(catchError(() => of([]))),
      similar: this.analyticsApi.getSimilarProducts(this.productId).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ details, history, similar }) => {
        if (details && details.length > 0) {
          const d = details[0];
          this.product = {
            id: d.product_unified_id,
            name: d.product_name,
            brand: this.extractBrand(d.product_name),
            category: d.product_category,
            dealScore: d.deal_score,
            isFakeDeal: d.is_fake_deal,
            description: this.buildDescription(d),
            image: d.product_image_url || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
            images: [d.product_image_url || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800'],
            platformCount: d.total_platforms_tracked || 1,
            bestPrice: d.current_price,
            currentPrice: d.current_price,
            bestPlatform: d.source,
            bestPlatformUrl: d.source_url || '#',
            priceChange: d.current_price && d.avg_price_30d ? d.current_price - d.avg_price_30d : 0,
            lastUpdated: d.last_updated,
            totalPlatforms: d.total_platforms || d.total_platforms_tracked || 1,
            specs: [
              { label: 'Category', value: d.product_category },
              { label: 'Best Platform', value: d.source }
            ],
            platforms: details.map((p: any) => ({
              name: p.source,
              price: p.current_price,
              inStock: p.in_stock ?? true,
              vsLastWeek: p.current_price && p.avg_price_30d ? Math.round(p.current_price - p.avg_price_30d) : 0,
              url: p.source_url || '#'
            }))
          };

          // Update Score Factors Dynamically
          const totalTracked = d.total_platforms_tracked || 1;
          const availabilityScore = Math.min(10, totalTracked * 3);

          this.scoreFactors = [
            { 
              label: 'Price vs history', 
              score: d.deal_score, 
              description: d.discount_percent && d.discount_percent > 0 
                ? `Currently ${d.discount_percent}% below the 30-day average price.`
                : d.is_fake_deal ? 'Price spike detected recently. Not a genuine discount.' : 'Price is currently stable compared to historical average.',
              color: this.getScoreColor(d.deal_score)
            },
            { 
              label: 'Availability', 
              score: availabilityScore,
              description: `Tracked across ${totalTracked} platforms.`, 
              color: this.getScoreColor(availabilityScore)
            }
          ];
        } else {
          this.toastService.show('Product not found.', 'error');
          this.isLoading = false;
          return;
        }

        if (history.length > 0) {
          this.fullHistoryData = history.map(h => ({
            rawDate: new Date(h.date),
            date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            price: h.price
          }));
          this.updateChartData();
        }

        if (similar.length > 0) {
          this.similarProducts = similar.map(s => ({
            id: s.product_unified_id,
            name: s.product_name,
            bestPrice: s.current_price,
            image: s.product_image_url || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200',
            dealScore: s.deal_score,
            category: s.product_category,
            platform: s.source
          }));
        }

        this.suggestedAlertPrice = Math.round(this.product.bestPrice * 0.9);
        this.alertTargetPrice = this.suggestedAlertPrice;
        this.isLoading = false;
        this.saveToRecentlyViewed();
      },
      error: () => {
        this.isLoading = false;
        this.toastService.show('Failed to load product details.', 'error');
      }
    });
  }

  selectImage(img: string) { this.product.image = img; }
  
  selectTab(tab: any) { 
    this.activeTab = tab.label; 
    this.updateChartData();
  }

  private updateChartData() {
    if (this.isTabLocked) {
      this.currentChartData = this.fullHistoryData.slice(-7); // Show limited view if locked
      return;
    }

    const now = new Date();
    let cutoff = new Date();

    switch (this.activeTab) {
      case '1W': cutoff.setDate(now.getDate() - 7); break;
      case '1M': cutoff.setMonth(now.getMonth() - 1); break;
      case '3M': cutoff.setMonth(now.getMonth() - 3); break;
      case '6M': cutoff.setMonth(now.getMonth() - 6); break;
      case '1Y': cutoff.setFullYear(now.getFullYear() - 1); break;
      default: cutoff.setDate(now.getDate() - 7);
    }

    this.currentChartData = this.fullHistoryData.filter(d => d.rawDate >= cutoff);
    
    // If we have no data for the period (scrapers just started), show everything we have
    if (this.currentChartData.length < 2) {
      this.currentChartData = this.fullHistoryData;
    }

    this.renderChart();
  }

  getScoreColor(score?: number): string {
    const s = score !== undefined ? score : this.product.dealScore;
    if (s >= 8) return '#10B981';
    if (s >= 5) return '#F59E0B';
    return '#EF4444';
  }

  get scoreLabel(): string {
    if (this.product.dealScore >= 8) return 'Great deal';
    if (this.product.dealScore >= 5) return 'Fair deal';
    return 'Poor deal';
  }

  get scoreCategory(): string {
    if (this.product.dealScore >= 8) return 'great';
    if (this.product.dealScore >= 5) return 'good';
    return 'poor';
  }

  get scoreDashArray(): string {
    return `${2 * Math.PI * 50}`;
  }

  get scoreDashOffset(): string {
    const circumference = 2 * Math.PI * 50;
    return `${circumference - (this.product.dealScore / 10) * circumference}`;
  }

  get chartLowest(): number {
    if (this.currentChartData.length === 0) return 0;
    return Math.min(...this.currentChartData.map((p: any) => p.price));
  }

  get chartHighest(): number {
    if (this.currentChartData.length === 0) return 0;
    return Math.max(...this.currentChartData.map((p: any) => p.price));
  }

  get chartAverage(): number {
    if (this.currentChartData.length === 0) return 0;
    const sum = this.currentChartData.reduce((a: number, p: any) => a + p.price, 0);
    return sum / this.currentChartData.length;
  }

  get isTabLocked(): boolean {
    const tab = this.historyTabs.find((t: any) => t.label === this.activeTab);
    return !!(tab?.requiresAuth && !this.isLoggedIn);
  }

  relativeTime(dateStr: string): string {
    if (!dateStr) return 'recently';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  private extractBrand(name: string): string | null {
    const knownBrands = ['Apple', 'Samsung', 'Sony', 'LG', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'Microsoft', 'Google', 'Amazon', 'Logitech', 'Razer', 'Corsair', 'SteelSeries', 'HyperX', 'Keychron', 'Bose', 'JBL', 'Sennheiser', 'Nintendo', 'Xbox', 'PlayStation', 'MSI', 'Gigabyte', 'AMD', 'Intel', 'NVIDIA'];
    const first = name.split(' ')[0];
    return knownBrands.includes(first) ? first : null;
  }

  private buildDescription(d: any): string {
    const parts: string[] = [];
    if (d.avg_price_30d && d.current_price) {
      const diff = d.current_price - d.avg_price_30d;
      if (diff < 0) {
        parts.push(`Currently $${Math.abs(diff).toFixed(2)} below the 30-day average`);
      } else if (diff > 0) {
        parts.push(`Currently $${diff.toFixed(2)} above the 30-day average`);
      }
    }
    if (d.all_time_low_price && d.current_price) {
      if (d.current_price <= d.all_time_low_price) {
        parts.push('at an all-time low price');
      } else {
        parts.push(`all-time low was $${d.all_time_low_price.toFixed(2)}`);
      }
    }
    if (d.discount_percent && d.discount_percent > 0) {
      parts.push(`${d.discount_percent}% below recent average`);
    }
    if (parts.length > 0) {
      return parts.join('. ') + '.';
    }
    return `Tracked on ${d.source || 'multiple platforms'} with a deal score of ${d.deal_score || 'N/A'}.`;
  }

  private saveToRecentlyViewed() {
    this.activityLogsService.logProductView(this.productId, {
      name: this.product.name,
      category: this.product.category,
      image: this.product.image,
      currentPrice: this.product.bestPrice,
      platform: this.product.bestPlatform,
      dealScore: this.product.dealScore,
    }).pipe(catchError(() => of(null))).subscribe();
  }

  createAlert() {
    if (!this.isLoggedIn) {
      this.router.navigate(['/auth'], { queryParams: { mode: 'signup', returnUrl: this.currentUrl } });
      return;
    }
    if (this.isReseller) {
      if (!this.catalogProductId) {
        this.toastService.show('Track this product in your catalog first to set an alert.');
        return;
      }
      this.resellerService.createAlert({
        seller_product_id: this.catalogProductId,
        trigger_mode: 'PRICE_UNDERCUT_BY',
        threshold_value: this.alertTargetPrice || this.product.bestPrice,
        threshold_type: 'ABSOLUTE',
        priority: 'MEDIUM'
      }).pipe(catchError(err => {
        this.toastService.show(err.error?.detail || 'Failed to create alert.');
        return of(null);
      })).subscribe(res => {
        if (res) {
          this.alertSet = true;
          this.showAlertForm = false;
          this.toastService.show(`Alert set on "${this.product.name}"`);
        }
      });
      return;
    }
    if (!this.alertTargetPrice || this.alertTargetPrice <= 0) {
      this.toastService.show('Please enter a valid target price greater than 0.');
      return;
    }
    this.watchlistService.addToWatchlist({
      product_id: this.productId,
      product_name: this.product.name,
      target_price: this.alertTargetPrice,
      original_price: this.product.bestPrice,
      platform: this.product.bestPlatform,
      alert_condition: 'BELOW_TARGET',
    }).pipe(catchError(err => {
      this.toastService.show(err.error?.detail || 'Failed to create alert. Please try again.');
      return of(null);
    })).subscribe(res => {
      if (res) {
        this.watchlistItemId = (res as any).id;
        this.alertSet = true;
        this.showAlertForm = false;
        this.isTracking = true;
        this.toastService.show(`Price alert set for $${Number(this.alertTargetPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}!`);
      }
    });
  }

  toggleTrack() {
    if (!this.isLoggedIn) {
      this.router.navigate(['/auth'], { queryParams: { mode: 'signup', returnUrl: this.currentUrl } });
      return;
    }
    if (this.isReseller) {
      if (this.catalogProductId) {
        this.router.navigate(['/reseller/catalog', this.catalogProductId]);
        return;
      }
      this.showResellerPriceForm = !this.showResellerPriceForm;
      this.resellerPrice = this.product.bestPrice;
      return;
    }
    if (this.isTracking) {
      if (!this.watchlistItemId) return;
      this.watchlistService.removeFromWatchlist(this.watchlistItemId).pipe(catchError(() => of(null))).subscribe(() => {
        this.isTracking = false;
        this.alertSet = false;
        this.watchlistItemId = null;
        this.toastService.show('Product removed from tracking');
      });
    } else {
      this.watchlistService.addToWatchlist({
        product_id: this.productId,
        product_name: this.product.name,
        target_price: this.alertTargetPrice || this.product.bestPrice,
        original_price: this.product.bestPrice,
        platform: this.product.bestPlatform,
        alert_condition: 'BELOW_TARGET',
      }).pipe(catchError(() => of(null))).subscribe(res => {
        if (res) {
          this.watchlistItemId = (res as any).id;
          this.isTracking = true;
          this.toastService.show('Product added to tracking');
        }
      });
    }
  }

  addToCatalog() {
    if (!this.resellerPrice || this.resellerPrice <= 0) return;
    this.resellerService.createProduct({
      product_name: this.product.name,
      category: this.product.category,
      my_price: this.resellerPrice,
      price_when_added: this.resellerPrice,
      platform: this.product.bestPlatform
    }).pipe(catchError(err => {
      this.toastService.show(err.error?.detail || 'Failed to add product.');
      return of(null);
    })).subscribe(res => {
      if (res) {
        this.catalogProductId = res.id;
        this.isTracking = true;
        this.showResellerPriceForm = false;
        this.toastService.show(`"${this.product.name}" added to your catalog`);
      }
    });
  }

  get currentUrl(): string {
    return this.router.url;
  }

  ngAfterViewInit() {
    if (this.currentChartData.length > 0) this.renderChart();
  }

  ngOnDestroy() {
    this.chartInstance?.destroy();
  }

  private renderChart() {
    if (!this.priceChartCanvas) return;
    const ctx = this.priceChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chartInstance?.destroy();

    const isLight = document.documentElement.classList.contains('light-mode');
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-blue')?.trim() || '#3B82F6';
    const textColor = isLight ? '#64748B' : 'rgba(255,255,255,0.77)';
    const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
    const pointCount = this.currentChartData.length;

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.currentChartData.map(p => p.date),
        datasets: [{
          data: this.currentChartData.map(p => p.price),
          borderColor: accent,
          backgroundColor: accent + '15',
          borderWidth: 2,
          pointBackgroundColor: accent,
          pointBorderColor: isLight ? '#ffffff' : '#1a1f2e',
          pointBorderWidth: 2,
          pointRadius: pointCount < 3 ? 5 : 0,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isLight ? '#ffffff' : '#1E293B',
            titleColor: textColor,
            bodyColor: isLight ? '#1E293B' : '#ffffff',
            borderColor: gridColor,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 6,
            displayColors: false,
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 11 } }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { size: 11 },
              callback: (v) => '$' + Number(v).toLocaleString('en-US')
            }
          }
        },
        interaction: { intersect: false, mode: 'index' }
      }
    });
  }
}
