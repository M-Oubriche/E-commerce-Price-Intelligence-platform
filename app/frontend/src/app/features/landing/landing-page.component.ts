import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, Pipe, PipeTransform } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';
import { CountUpDirective } from '../../shared/directives/count-up.directive';
import { PublicNavbarComponent } from '../../shared/components/public-navbar/public-navbar.component';
import { PriceTickerComponent } from '../../shared/components/price-ticker/price-ticker.component';
import { AnalyticsApiService } from '../../core/services/analytics-api.service';
import { Subject, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

@Pipe({ name: 'safeHtml', standalone: true })
export class SafeHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  transform(value: string): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(value); }
}

interface Product {
  id: string; name: string; category: string; image: string;
  currentPrice: number; oldPrice: number; discount: number;
  store: string; isLowestEver: boolean; rating: number; reviews: number;
}

interface FlashDeal extends Product { stockPercent: number; }

interface HeroDeal {
  id: string; name: string; category: string; image: string;
  currentPrice: number; oldPrice: number; discount: number; isLowestEver?: boolean;
}

interface Category { name: string; icon: string; link: string; count: string; }
interface Step { title: string; description: string; icon: string; }
interface PriceDrop { name: string; drop: string; store: string; time: string; icon: string; }
interface ProductSuggestion { id: string; name: string; category: string; image: string; bestPrice: number; store: string; }
interface CategorySuggestion { name: string; icon: string; slug: string; }
interface Testimonial { name: string; role: string; quote: string; savings?: string; }

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ScrollRevealDirective, CountUpDirective, SafeHtmlPipe, PublicNavbarComponent, PriceTickerComponent],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss']
})
export class LandingPageComponent implements OnInit, OnDestroy {

  promoBannerVisible = true;
  private isBrowser: boolean;
  private searchSub: any;

  searchQuery = '';
  isFocused = false;
  suggestions: any[] = [];
  productSuggestions: ProductSuggestion[] = [];
  categorySuggestions: CategorySuggestion[] = [];
  popularSearches: string[] = [];
  private searchSubject = new Subject<string>();
  private allCategorySuggestions: CategorySuggestion[] = [
    { name: 'GPU', icon: 'monitor', slug: 'gpu' },
    { name: 'CPU', icon: 'cpu', slug: 'cpu' },
    { name: 'RAM', icon: 'memory', slug: 'ram' },
    { name: 'SSD', icon: 'storage', slug: 'ssd' },
    { name: 'Keyboards', icon: 'keyboard', slug: 'keyboard' },
    { name: 'Mice', icon: 'mouse', slug: 'mouse' },
    { name: 'Laptops', icon: 'laptop', slug: 'laptop' },
  ];

  liveDrops: PriceDrop[] = [];
  categories: Category[] = [];
  heroSideDeals: HeroDeal[] = [];
  flashDeals: FlashDeal[] = [];
  products: Product[] = [];
  featuredDeal: HeroDeal | null = null;
  historyExample: any = null;

  steps: Step[] = [
    { title: 'Search any device', description: 'Type the model name, brand, or category you are looking for.', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
    { title: 'Compare across 200+ stores', description: 'See live prices and full 30-day price history charts instantly.', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { title: 'Buy or set a price alert', description: 'Grab the best deal now or get notified when prices drop further.', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  ];

  testimonials: Testimonial[] = [
    {
      name: 'Lena M.',
      role: 'Freelance Designer, Paris',
      quote: 'I set a price alert for the MacBook Air M3 and got notified the same day Amazon dropped it by $100. Bought it instantly. This tool is insane.',
      savings: '$100'
    },
    {
      name: 'Carlos R.',
      role: 'Gaming Enthusiast, Madrid',
      quote: 'Used to manually check 5 different sites for PS5 deals. PulsePrice showed me the price was actually cheaper on eBay — something I never would have found.',
      savings: '$40'
    },
    {
      name: 'Amira T.',
      role: 'Tech Lead, Berlin',
      quote: 'The 30-day price history feature is a game changer. I could immediately see the "sale" on BestBuy was just them inflating the price the week before. Saved me from a fake deal.',
      savings: '$89'
    },
  ];

  constructor(
    private authService: AuthService, 
    private router: Router, 
    private analyticsApi: AnalyticsApiService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      this.fetchData();
    }

    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => {
        if (!q || q.length < 2) {
          this.productSuggestions = [];
          this.categorySuggestions = [];
          this.suggestions = [];
          return of([]);
        }
        return this.analyticsApi.searchProducts(q).pipe(
          catchError(() => of([]))
        );
      })
    ).subscribe(results => {
      const q = this.searchQuery.toLowerCase().trim();
      this.productSuggestions = results.map(r => ({
        id: r.product_unified_id,
        name: r.product_name,
        category: r.product_category,
        image: r.product_image_url || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200',
        bestPrice: r.current_price || 0,
        store: r.source
      })).slice(0, 4);
      this.categorySuggestions = this.allCategorySuggestions.filter(c => c.name.toLowerCase().includes(q)).slice(0, 2);
      this.suggestions = [...this.productSuggestions, ...this.categorySuggestions];
    });
  }

  private fetchData() {
    forkJoin([
      this.analyticsApi.getDealAnalysis(),
      this.analyticsApi.getPriceDrops(),
      this.analyticsApi.getCategoryTrends(),
      this.analyticsApi.getFlashDeals(),
      this.analyticsApi.getTrendingDeals(),
    ]).subscribe({
      next: ([deals, drops, trends, flashDealsData, trendingData]) => {
        if (deals.length > 0) {
          // Derive popular searches from top product names
          const seen = new Set<string>();
          this.popularSearches = deals
            .map(d => d.product_name?.split(' ').slice(0, 3).join(' ') || '')
            .filter(name => {
              if (seen.has(name) || name.length < 3) return false;
              seen.add(name);
              return true;
            })
            .slice(0, 4);
          // Map featured deal (the absolute best)
          const f = deals[0];
          this.featuredDeal = {
            id: f.product_unified_id,
            name: f.product_name,
            category: f.product_category,
            image: f.product_image_url || 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg',
            currentPrice: f.current_price || 0,
            oldPrice: f.avg_price_30d || f.current_price || 0,
            discount: f.discount_percent || 0,
            isLowestEver: f.current_price && f.all_time_low_price ? f.current_price <= f.all_time_low_price : false
          };

          // Map Hero side deals (take next 4)
          this.heroSideDeals = deals.slice(1, 5).map(d => ({
            id: d.product_unified_id,
            name: d.product_name,
            category: d.product_category,
            image: d.product_image_url || 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400',
            currentPrice: d.current_price || 0,
            oldPrice: d.avg_price_30d || d.current_price || 0,
            discount: d.discount_percent || 0,
            isLowestEver: d.current_price && d.all_time_low_price ? d.current_price <= d.all_time_low_price : false
          }));

          // Map Flash Deals — actual daily price drops
          this.flashDeals = flashDealsData.slice(0, 6).map(d => ({
            id: d.product_unified_id,
            name: d.product_name,
            category: d.product_category,
            image: d.product_image_url || 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400',
            currentPrice: d.current_price || 0,
            oldPrice: d.avg_price_30d || d.current_price || 0,
            discount: d.discount_percent || 0,
            store: d.source,
            isLowestEver: d.current_price && d.all_time_low_price ? d.current_price <= d.all_time_low_price : false,
            rating: d.avg_rating || 0,
            reviews: d.total_reviews || 0,
            stockPercent: d.total_platforms ? Math.round(((d.platforms_in_stock ?? 0) / d.total_platforms) * 100) : 0
          }));

          // Map Trending Products — weighted by deal_score + rating
          this.products = trendingData.map(d => ({
            id: d.product_unified_id,
            name: d.product_name,
            category: d.product_category,
            image: d.product_image_url || 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400',
            currentPrice: d.current_price || 0,
            oldPrice: d.avg_price_30d || d.current_price || 0,
            discount: d.discount_percent || 0,
            store: d.source,
            isLowestEver: d.current_price && d.all_time_low_price ? d.current_price <= d.all_time_low_price : false,
            rating: d.avg_rating || 0,
            reviews: d.total_reviews || 0
          }));

          // Pick a compelling example for the 30-day history section
          const fakeDeal = deals.find(d => d.is_fake_deal);
          const topDeal = deals.find(d => (d.discount_percent || 0) > 20);
          const example = fakeDeal || topDeal || deals[0];
          
          if (example) {
            this.historyExample = {
              name: example.product_name,
              store: example.source,
              currentPrice: example.current_price,
              oldPrice: example.avg_price_30d,
              isFake: example.is_fake_deal,
              isLowestEver: example.current_price && example.all_time_low_price ? example.current_price <= example.all_time_low_price : false
            };
          }
        }

        // Map Live Drops
        if (drops.length > 0) {
          this.liveDrops = drops.slice(0, 10).map(d => ({
            name: d.product_name,
            drop: `$${Math.round(d.absolute_drop_usd)}`,
            store: d.source,
            time: d.latest_date ? this.relativeTime(d.latest_date) : 'Today',
            icon: d.product_category.charAt(0).toUpperCase()
          }));
        }

        // Map Categories
        if (trends.length > 0) {
          this.categories = trends.filter(t => t.product_count > 0).map(t => ({
            name: t.product_category,
            icon: this.getCategoryIcon(t.product_category),
            link: t.product_category.toLowerCase(),
            count: this.formatCount(t.product_count)
          }));
        }
      },
      error: (err) => console.error('Landing API Error:', err)
    });
  }

  private getCategoryIcon(cat: string): string {
    const icons: any = {
      'GPU': 'monitor', 'CPU': 'cpu', 'RAM': 'memory', 'SSD': 'ssd',
      'Laptop': 'laptop', 'Monitor': 'monitor', 'Mouse': 'mouse', 'Keyboard': 'keyboard'
    };
    return icons[cat] || 'package';
  }

  private formatCount(count: number): string {
    if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
    return count.toString();
  }

  ngOnDestroy() {
    if (this.searchSub) this.searchSub.unsubscribe();
  }

  dismissPromoBanner() { this.promoBannerVisible = false; }

  private relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }


  onSearchInput(): void {
    if (!this.searchQuery.trim()) {
      this.productSuggestions = [];
      this.categorySuggestions = [];
      this.suggestions = [];
    }
    this.searchSubject.next(this.searchQuery);
  }

  onSearchSubmit(): void {
    if (!this.searchQuery.trim()) {
      document.querySelector('.hero-search-bar')?.classList.add('shake');
      setTimeout(() => document.querySelector('.hero-search-bar')?.classList.remove('shake'), 500);
      return;
    }
    this.router.navigate(['/search'], { queryParams: { q: this.searchQuery.trim() } });
  }

  selectSuggestion(p: ProductSuggestion): void { this.searchQuery = p.name; this.suggestions = []; this.router.navigate(['/product', p.id]); }
  selectCategory(c: CategorySuggestion): void { this.searchQuery = c.name; this.suggestions = []; this.router.navigate(['/search'], { queryParams: { category: c.slug } }); }
  setQuery(q: string): void { this.searchQuery = q; this.onSearchSubmit(); }
  onBlur(): void { setTimeout(() => { this.isFocused = false; this.suggestions = []; }, 200); }
  clearSearch(): void { this.searchQuery = ''; this.suggestions = []; }
}
