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
import { PLATFORM_PRODUCT_LIBRARY } from '../../core/constants/product-library';

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
interface ProductSuggestion { id: string; name: string; category: string; image: string; bestPrice: number; }
interface CategorySuggestion { name: string; icon: string; count: number; slug: string; }
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
  private countdownInterval: any;
  private searchDebounce: any;

  countdown = { hours: '04', minutes: '22', seconds: '18' };

  searchQuery = '';
  isFocused = false;
  suggestions: any[] = [];
  productSuggestions: ProductSuggestion[] = [];
  categorySuggestions: CategorySuggestion[] = [];
  popularSearches = ['RTX 4090', 'Ryzen 7 7800X3D', 'Logitech G Pro', 'Samsung 990 Pro'];
  private allProducts: any[] = PLATFORM_PRODUCT_LIBRARY;
  private allCategorySuggestions: CategorySuggestion[] = [
    { name: 'GPU', icon: 'monitor', count: 1200, slug: 'gpu' },
    { name: 'CPU', icon: 'cpu', count: 850, slug: 'cpu' },
    { name: 'RAM', icon: 'memory', count: 430, slug: 'ram' },
    { name: 'SSD', icon: 'storage', count: 620, slug: 'ssd' },
    { name: 'Keyboards', icon: 'keyboard', count: 290, slug: 'keyboard' },
    { name: 'Mice', icon: 'mouse', count: 310, slug: 'mouse' },
    { name: 'Laptops', icon: 'laptop', count: 540, slug: 'laptop' },
  ];

  liveDrops: PriceDrop[] = [
    { name: 'RTX 4080 Super 16GB', drop: '$120', store: 'Newegg', time: '2m ago', icon: 'GPU' },
    { name: 'Core i9-14900K', drop: '$45', store: 'Amazon', time: '5m ago', icon: 'CPU' },
    { name: 'Logitech G Pro X Superlight', drop: '$15', store: 'Ultra PC', time: '12m ago', icon: 'Mouse' },
    { name: 'Samsung 990 Pro 2TB', drop: '$30', store: 'Jumia', time: '18m ago', icon: 'SSD' },
    { name: 'Corsair Vengeance DDR5 32GB', drop: '$25', store: 'PC21', time: '25m ago', icon: 'RAM' },
    { name: 'ASUS ROG Swift OLED', drop: '$200', store: 'BestBuy', time: '31m ago', icon: 'Monitor' },
    { name: 'Ryzen 7 7800X3D', drop: '$40', store: 'eBay', time: '38m ago', icon: 'CPU' },
  ];

  categories: Category[] = [
    { name: 'GPU', icon: 'monitor', link: 'gpu', count: '1.2k' },
    { name: 'CPU', icon: 'cpu', link: 'cpu', count: '850' },
    { name: 'RAM', icon: 'memory', link: 'ram', count: '430' },
    { name: 'SSD', icon: 'ssd', link: 'ssd', count: '620' },
    { name: 'Monitors', icon: 'monitor', link: 'monitors', count: '290' },
    { name: 'Keyboards', icon: 'keyboard', link: 'keyboards', count: '310' },
    { name: 'Mice', icon: 'mouse', link: 'mice', count: '540' },
    { name: 'Laptops', icon: 'laptop', link: 'laptops', count: '180' },
    { name: 'PSU', icon: 'power', link: 'psu', count: '220' },
    { name: 'Motherboards', icon: 'motherboard', link: 'motherboards', count: '160' },
  ];

  heroSideDeals: HeroDeal[] = [
    {
      id: 'rtx-4090-strix', name: 'ASUS ROG Strix RTX 4090', category: 'GPU',
      image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400',
      currentPrice: 1599, oldPrice: 1799, discount: 11
    },
    {
      id: 'logitech-g-pro-x', name: 'Logitech G Pro X Superlight 2', category: 'Mouse',
      image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400',
      currentPrice: 129, oldPrice: 159, discount: 19, isLowestEver: true
    },
    {
      id: 'samsung-990-pro', name: 'Samsung 990 Pro 2TB NVMe', category: 'SSD',
      image: 'https://images.unsplash.com/photo-1597872200370-493dee2474a5?w=400',
      currentPrice: 169, oldPrice: 199, discount: 15, isLowestEver: true
    },
    {
      id: 'corsair-vengeance-ddr5', name: 'Corsair Vengeance 32GB DDR5 6000', category: 'RAM',
      image: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=400',
      currentPrice: 109, oldPrice: 139, discount: 21
    },
  ];

  flashDeals: FlashDeal[] = [
    {
      id: 'rtx-4080-super', name: 'NVIDIA RTX 4080 Super 16GB', category: 'GPU',
      image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400',
      currentPrice: 949, oldPrice: 1099, discount: 13, store: 'Ultra PC', isLowestEver: true,
      rating: 4.8, reviews: 1241, stockPercent: 18
    },
    {
      id: 'i9-14900k', name: 'Intel Core i9-14900K 24-Core', category: 'CPU',
      image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400',
      currentPrice: 549, oldPrice: 629, discount: 12, store: 'Newegg', isLowestEver: true,
      rating: 4.8, reviews: 2156, stockPercent: 12
    },
    {
      id: 'samsung-990-pro-4tb', name: 'Samsung 990 Pro 4TB NVMe SSD', category: 'SSD',
      image: 'https://images.unsplash.com/photo-1597872200370-493dee2474a5?w=400',
      currentPrice: 289, oldPrice: 349, discount: 17, store: 'PC21', isLowestEver: true,
      rating: 4.9, reviews: 843, stockPercent: 44
    },
    {
      id: 'corsair-dominator-64gb', name: 'Corsair Dominator Titanium 64GB', category: 'RAM',
      image: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=400',
      currentPrice: 219, oldPrice: 279, discount: 21, store: 'Jumia', isLowestEver: true,
      rating: 4.8, reviews: 312, stockPercent: 35
    },
    {
      id: 'rog-swift-pg27aqdm', name: 'ASUS ROG Swift 27" 1440p OLED', category: 'Monitor',
      image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400',
      currentPrice: 849, oldPrice: 999, discount: 15, store: 'Amazon', isLowestEver: true,
      rating: 4.7, reviews: 562, stockPercent: 22
    },
    {
      id: 'logitech-g915', name: 'Logitech G915 TKL Wireless Mechanical', category: 'Keyboard',
      image: 'https://images.unsplash.com/photo-1595225402772-2f3483df4ed2?w=400',
      currentPrice: 149, oldPrice: 199, discount: 25, store: 'BestBuy', isLowestEver: false,
      rating: 4.7, reviews: 4210, stockPercent: 60
    },
  ];

  products: Product[] = [
    {
      id: 'rtx-4090-strix', name: 'ASUS ROG Strix RTX 4090', category: 'GPU',
      image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400',
      currentPrice: 1599, oldPrice: 1799, discount: 11, store: 'Ultra PC', isLowestEver: true, rating: 4.9, reviews: 1241
    },
    {
      id: 'i9-14900k', name: 'Intel Core i9-14900K', category: 'CPU',
      image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400',
      currentPrice: 549, oldPrice: 629, discount: 12, store: 'Amazon', isLowestEver: true, rating: 4.8, reviews: 2156
    },
    {
      id: 'logitech-g-pro-x', name: 'Logitech G Pro X Superlight 2', category: 'Mouse',
      image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400',
      currentPrice: 129, oldPrice: 159, discount: 19, store: 'Materiel.net', isLowestEver: true, rating: 4.8, reviews: 4210
    },
    {
      id: 'samsung-990-pro', name: 'Samsung 990 Pro 2TB NVMe', category: 'SSD',
      image: 'https://images.unsplash.com/photo-1597872200370-493dee2474a5?w=400',
      currentPrice: 169, oldPrice: 199, discount: 15, store: 'Jumia', isLowestEver: true, rating: 4.9, reviews: 843
    },
    {
      id: 'corsair-vengeance-ddr5', name: 'Corsair Vengeance 32GB DDR5', category: 'RAM',
      image: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=400',
      currentPrice: 109, oldPrice: 139, discount: 21, store: 'BestBuy', isLowestEver: true, rating: 4.8, reviews: 312
    },
    {
      id: 'rog-swift-pg27aqdm', name: 'ASUS ROG Swift OLED 27"', category: 'Monitor',
      image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400',
      currentPrice: 849, oldPrice: 999, discount: 15, store: 'Amazon', isLowestEver: true, rating: 4.7, reviews: 562
    },
    {
      id: 'ryzen-7800x3d', name: 'AMD Ryzen 7 7800X3D', category: 'CPU',
      image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400',
      currentPrice: 349, oldPrice: 449, discount: 22, store: 'Amazon', isLowestEver: true, rating: 4.9, reviews: 5120
    },
    {
      id: 'z790-aorus-elite', name: 'Gigabyte Z790 AORUS Elite AX', category: 'Motherboard',
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
      currentPrice: 239, oldPrice: 289, discount: 17, store: 'Newegg', isLowestEver: false, rating: 4.6, reviews: 890
    },
    {
      id: 'rm1000x', name: 'Corsair RM1000x 80+ Gold PSU', category: 'PSU',
      image: 'https://images.unsplash.com/photo-1587202392411-e1b211fa3f95?w=400',
      currentPrice: 159, oldPrice: 189, discount: 15, store: 'Ultra PC', isLowestEver: false, rating: 4.8, reviews: 1540
    },
    {
      id: 'h9-flow', name: 'NZXT H9 Flow Dual-Chamber', category: 'Case',
      image: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=400',
      currentPrice: 159, oldPrice: 159, discount: 0, store: 'Cdiscount', isLowestEver: false, rating: 4.8, reviews: 2105
    },
    {
      id: 'g915-tkl', name: 'Logitech G915 TKL Wireless', category: 'Keyboard',
      image: 'https://images.unsplash.com/photo-1595225402772-2f3483df4ed2?w=400',
      currentPrice: 149, oldPrice: 199, discount: 25, store: 'BestBuy', isLowestEver: false, rating: 4.7, reviews: 4210
    },
    {
      id: '980-pro-1tb', name: 'Samsung 980 Pro 1TB NVMe', category: 'SSD',
      image: 'https://images.unsplash.com/photo-1597872200370-493dee2474a5?w=400',
      currentPrice: 89, oldPrice: 109, discount: 18, store: 'Jumia', isLowestEver: true, rating: 4.9, reviews: 15672
    },
  ];

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

  constructor(private authService: AuthService, private router: Router, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      this.initCountdown();
    }
  }

  ngOnDestroy() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  dismissPromoBanner() { this.promoBannerVisible = false; }

  private initCountdown() {
    let total = 4 * 3600 + 22 * 60 + 18;
    this.countdownInterval = setInterval(() => {
      total--;
      if (total < 0) total = 24 * 3600;
      this.countdown = {
        hours: String(Math.floor(total / 3600)).padStart(2, '0'),
        minutes: String(Math.floor((total % 3600) / 60)).padStart(2, '0'),
        seconds: String(total % 60).padStart(2, '0'),
      };
    }, 1000);
  }

  onSearchInput(): void {
    clearTimeout(this.searchDebounce);
    if (!this.searchQuery.trim()) { this.suggestions = this.productSuggestions = this.categorySuggestions = []; return; }
    this.searchDebounce = setTimeout(() => {
      const q = this.searchQuery.toLowerCase().trim();
      this.productSuggestions = this.allProducts.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)).slice(0, 4);
      this.categorySuggestions = this.allCategorySuggestions.filter(c => c.name.toLowerCase().includes(q)).slice(0, 2);
      this.suggestions = [...this.productSuggestions, ...this.categorySuggestions];
    }, 250);
  }

  onSearchSubmit(): void {
    if (!this.searchQuery.trim()) {
      document.querySelector('.hero-search-bar')?.classList.add('shake');
      setTimeout(() => document.querySelector('.hero-search-bar')?.classList.remove('shake'), 500);
      return;
    }
    this.router.navigate(['/search'], { queryParams: { q: encodeURIComponent(this.searchQuery.trim()) } });
  }

  selectSuggestion(p: ProductSuggestion): void { this.searchQuery = p.name; this.suggestions = []; this.router.navigate(['/product', p.id]); }
  selectCategory(c: CategorySuggestion): void { this.searchQuery = c.name; this.suggestions = []; this.router.navigate(['/search'], { queryParams: { category: c.slug } }); }
  setQuery(q: string): void { this.searchQuery = q; this.onSearchSubmit(); }
  onBlur(): void { setTimeout(() => { this.isFocused = false; this.suggestions = []; }, 200); }
  clearSearch(): void { this.searchQuery = ''; this.suggestions = []; }
}
