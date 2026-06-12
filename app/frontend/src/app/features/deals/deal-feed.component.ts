import { Component, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger, state } from '@angular/animations';
import { forkJoin } from 'rxjs';
import { PublicNavbarComponent } from '../../shared/components/public-navbar/public-navbar.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { AnalyticsApiService } from '../../core/services/analytics-api.service';

export interface Deal {
  id: string;
  type: 'price_drop' | 'fake_deal_exposed';
  category: string;
  productName: string;
  headline: string;
  image: string;
  currentPrice: number;
  originalPrice: number;
  savingsAmount: number;
  savingsPercent: number;
  platform: string;
  dealScore: number;
  upvotes: number;
  isUpvoted: boolean;
  timeAgo: string;
  timestamp: number;
  isFeatured?: boolean;
  isFakeDeal?: boolean;
  isNew?: boolean;
}

@Component({
  selector: 'app-deal-feed',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicNavbarComponent, FormsModule],
  templateUrl: './deal-feed.component.html',
  styleUrls: ['./deal-feed.component.scss'],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-30px)' }),
        animate('400ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('fade', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ])
    ]),
    trigger('staggerFade', [
      transition(':enter', [
        query('.deal-card', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(60, [
            animate('400ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class DealFeedComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  authService = inject(AuthService);
  private toastService = inject(ToastService);
  private platformId = inject(PLATFORM_ID);
  private analyticsApi = inject(AnalyticsApiService);

  activeTab = 'All';
  tabs = ['All', 'Price Drops', 'Fake Deal Alerts'];
  
  activeCategory = 'All';
  filterCategories = ['All'];
  
  sortOption = 'Newest';
  sortOptions = ['Newest', 'Best deal score'];

  showNewDealToast = false;
  itemsToShow = 8;
  isLoading = true;
  loadError = false;
  dealsCount = 0;
  lastUpdated = '';
  private intervalId: any;

  deals: Deal[] = [];

  trendingItems: { id: string; name: string; category: string; drop: string; image: string | null }[] = [];

  biggestDrops: { productName: string; platform: string; savingsPercent: number; savingsAmount: number; image: string | null }[] = [];

  browseCategories: { name: string; count: number }[] = [];

  ngOnInit() {
    this.fetchData();

    if (isPlatformBrowser(this.platformId)) {
      this.intervalId = setInterval(() => {
        this.analyticsApi.getDealAnalysis().subscribe({
          next: (rows) => {
            const newRows = rows.filter(
              r => !this.deals.some(d => d.id === r.product_unified_id)
            );
            for (const row of newRows) {
              const deal = this.mapDeal(row);
              deal.isNew = true;
              this.deals.splice(1, 0, deal);
              setTimeout(() => deal.isNew = false, 3000);
            }
            if (newRows.length > 0) {
              this._fetchedAt = Date.now();
              this.dealsCount = this.deals.length;
              this.lastUpdated = 'Just now';
              this.showNewDealToast = true;
              setTimeout(() => this.showNewDealToast = false, 3000);
            }
          },
          error: () => {}
        });
      }, 30000);
    }
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private fetchData() {
    forkJoin([
      this.analyticsApi.getDealAnalysis(),
      this.analyticsApi.getPriceDrops(),
      this.analyticsApi.getCategoryTrends(),
    ]).subscribe({
      next: ([dealsData, dropsData, trendsData]) => {
        this.deals = this.mapDeals(dealsData);
        this.biggestDrops = this.mapBiggestDrops(dropsData);
        this.trendingItems = this.mapTrendingItems(dealsData);
        this.filterCategories = ['All', ...new Set(dealsData.map(d => d.product_category))];
        this.browseCategories = trendsData
          .filter(t => t.product_count > 0)
          .map(t => ({ name: t.product_category, count: t.product_count }));

        if (this.deals.length > 0) {
          this.deals[0].isFeatured = true;
        }

        this.dealsCount = dealsData.length;
        this._fetchedAt = Date.now();
        this.lastUpdated = 'Just now';
        this.isLoading = false;
      },
      error: () => {
        this.loadError = true;
        this.isLoading = false;
      }
    });
  }

  private _fetchedAt = 0;

  private mapDeals(rows: import('../../core/models/analytics-api.model').DealAnalysisRow[]): Deal[] {
    return rows.map((r, i) => ({
      ...this.mapDeal(r),
      isFeatured: i === 0,
    }));
  }

  private mapDeal(r: import('../../core/models/analytics-api.model').DealAnalysisRow): Deal {
    const timestamp = r.last_updated ? new Date(r.last_updated).getTime() : Date.now();
    return {
      id: r.product_unified_id || `deal-${timestamp}-${Math.random()}`,
      type: r.is_fake_deal ? 'fake_deal_exposed' as const : 'price_drop' as const,
      category: r.product_category,
      productName: r.product_name,
      headline: r.is_fake_deal
        ? `${r.product_name} — price spike detected, not a real deal`
        : `${r.product_name} dropped — best price spotted on ${r.source}`,
      image: r.product_image_url || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400',
      currentPrice: r.current_price ?? 0,
      originalPrice: r.avg_price_30d ?? r.current_price ?? 0,
      savingsAmount: r.avg_price_30d && r.current_price ? Math.max(0, r.avg_price_30d - r.current_price) : 0,
      savingsPercent: r.discount_percent ?? (r.avg_price_30d && r.current_price
        ? Math.round((1 - r.current_price / r.avg_price_30d) * 100)
        : 0),
      platform: r.source,
      dealScore: r.deal_score,
      upvotes: 0,
      isUpvoted: false,
      timeAgo: this.getTimeAgo(timestamp),
      timestamp: timestamp,
      isFeatured: false,
      isFakeDeal: r.is_fake_deal,
      isNew: false,
    };
  }

  private getTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return Math.floor(hours / 24) + 'd ago';
  }

  private mapBiggestDrops(rows: import('../../core/models/analytics-api.model').PriceDropRow[]) {
    return rows.slice(0, 5).map(r => ({
      productName: r.product_name,
      platform: r.source,
      savingsPercent: r.drop_percentage,
      savingsAmount: r.absolute_drop_usd,
      image: r.product_image_url,
    }));
  }

  private mapTrendingItems(rows: import('../../core/models/analytics-api.model').DealAnalysisRow[]) {
    return [...rows]
      .sort((a, b) => b.deal_score - a.deal_score)
      .slice(0, 5)
      .map(r => ({
        id: r.product_unified_id,
        name: r.product_name,
        category: r.product_category,
        drop: r.discount_percent 
          ? `↓ ${Math.round(r.discount_percent)}%`
          : (r.avg_price_30d && r.current_price
            ? `↓ ${Math.round((1 - r.current_price / r.avg_price_30d) * 100)}%`
            : ''),
        image: r.product_image_url,
      }));
  }

  get featuredDeal(): Deal | undefined {
    return this.deals.find(d => d.isFeatured);
  }

  get displayedDeals(): Deal[] {
    let filtered = this.deals.filter(d => !d.isFeatured);
    
    // Tab filter
    if (this.activeTab !== 'All') {
      if (this.activeTab === 'Price Drops') {
        filtered = filtered.filter(d => d.type === 'price_drop');
      } else if (this.activeTab === 'Fake Deal Alerts') {
        filtered = filtered.filter(d => d.type === 'fake_deal_exposed');
      }
    }

    // Category filter
    if (this.activeCategory !== 'All') {
      filtered = filtered.filter(d => d.category === this.activeCategory);
    }
    
    // Sort
    filtered.sort((a, b) => {
      if (this.sortOption === 'Newest') return b.timestamp - a.timestamp;
      if (this.sortOption === 'Best deal score') return b.dealScore - a.dealScore;
      return 0;
    });
    
    return filtered.slice(0, this.itemsToShow);
  }

  get hasMoreDeals() {
    return this.itemsToShow < this.deals.filter(d => !d.isFeatured).length;
  }

  retryLoad() {
    this.loadError = false;
    this.isLoading = true;
    this.fetchData();
  }

  loadMore() {
    this.isLoading = true;
    setTimeout(() => {
      this.itemsToShow += 4;
      this.isLoading = false;
    }, 400);
  }

  shareDeal(deal: Deal) {
    const url = window.location.origin + '/product/' + deal.id;
    if (navigator.share) {
      navigator.share({ title: deal.headline, text: 'Check out this deal on PulsePrice!', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        this.toastService.show('Link copied to clipboard!', 'success');
      });
    }
  }

  getScoreClass(score: number): string {
    if (score >= 8) return 'score-high';
    if (score >= 5) return 'score-mid';
    return 'score-low';
  }

  getTypeClass(type: string): string {
    switch(type) {
      case 'price_drop': return 'price-drop';
      case 'fake_deal_exposed': return 'fake-deal';
      default: return '';
    }
  }

  getTypeText(type: string): string {
    switch(type) {
      case 'price_drop': return 'PRICE DROP';
      case 'fake_deal_exposed': return 'FAKE DEAL EXPOSED';
      default: return '';
    }
  }
}
