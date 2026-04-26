import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, Inject, PLATFORM_ID, HostListener, Pipe, PipeTransform } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import { AuthService, User } from '../../core/services/auth.service';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';
import { CountUpDirective } from '../../shared/directives/count-up.directive';
import { PublicNavbarComponent } from '../../shared/components/public-navbar/public-navbar.component';
import { Observable } from 'rxjs';
import { PLATFORM_PRODUCT_LIBRARY } from '../../core/constants/product-library';

@Pipe({ name: 'safeHtml', standalone: true })
export class SafeHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(value);
  }
}

interface Feature {
  title: string;
  description: string;
  icon: string;
}

interface Step {
  title: string;
  description: string;
}

interface Category {
  name: string;
  image: string;
  link: string;
}

interface Testimonial {
  rating: number;
  quote: string;
  author: string;
  role: string;
  initials: string;
  productImage: string;
}

interface FAQ {
  question: string;
  answer: string;
  isOpen: boolean;
}

interface BusinessFeature {
  title: string;
  description: string;
}

interface Stat {
  value: number;
  label: string;
  suffix: string;
}

interface FloatingIcon {
  svg: string;
  viewBox: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  color: string;
}

interface ProductSuggestion {
  id: string;
  name: string;
  category: string;
  image: string;
  bestPrice: number;
}

interface CategorySuggestion {
  name: string;
  icon: string;
  count: number;
  slug: string;
}

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ScrollRevealDirective, CountUpDirective, SafeHtmlPipe, PublicNavbarComponent],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss'],
  animations: [
    trigger('faqAnimation', [
      state('void', style({ height: '0', opacity: '0', overflow: 'hidden' })),
      state('*', style({ height: '*', opacity: '1' })),
      transition('void <=> *', animate('300ms cubic-bezier(0.4, 0, 0.2, 1)'))
    ]),
    trigger('staggerFade', [
      transition(':enter', [
        query('.stagger-item', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(150, [
            animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class LandingPageComponent implements OnInit, OnDestroy, AfterViewInit {
  floatingIcons: FloatingIcon[] = [];

  features: Feature[] = [
    {
      title: 'Fake Deal Detector',
      description: 'Our system analyzes price history to tell you if that "50% off" is actually a good deal or just marketing fluff. The chart never lies.',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
    },
    {
      title: 'Price Drop Alerts',
      description: 'Set your target price and get instant notifications via email or WhatsApp when it hits your budget.',
      icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
    },
    {
      title: 'Smart Deal Score',
      description: 'Every product gets a score from 1–10 based on price history, availability, and store reliability. Know instantly if now is the right time to buy.',
      icon: 'M13 10V3L4 14h7v7l9-11h-7z'
    }
  ];

  steps: Step[] = [
    { title: 'Search any device', description: 'Enter the model name, brand, or specific specs you are looking for.' },
    { title: 'Compare prices + history', description: 'See real-time prices across all major retailers and how they have trended.' },
    { title: 'Buy smart or set an alert', description: 'Grab the best deal immediately or set a smart alert for future drops.' }
  ];

  categories: Category[] = [
    { name: 'Smartphones', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200', link: 'smartphones' },
    { name: 'Laptops', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200', link: 'laptops' },
    { name: 'Monitors', image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=200', link: 'monitors' },
    { name: 'Headphones', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200', link: 'headphones' },
    { name: 'Périphériques', image: '/home/aya/.gemini/antigravity/brain/62262f9d-2483-46d6-b4ab-3568bc10b454/peripherals_category_image_1775136446458.png', link: 'peripheriques' },
    { name: 'Gaming', image: 'https://images.unsplash.com/photo-1593118247619-e2d6f056869e?w=200', link: 'gaming' },
    { name: 'Tablets', image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200', link: 'tablets' },
    { name: 'Components', image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=200', link: 'components' }
  ];

  testimonials: Testimonial[] = [
    {
      rating: 5,
      quote: 'I saved $120 on a laptop in my first week. The price history chart exposed a fake Black Friday deal immediately.',
      author: 'Youssef M.',
      role: 'Student, Casablanca',
      initials: 'YM',
      productImage: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=120'
    },
    {
      rating: 5,
      quote: 'I track 300 SKUs for my reselling business. PulsePrice replaced 3 tools I was paying for.',
      author: 'Sara K.',
      role: 'Electronics Reseller, Marrakech',
      initials: 'SK',
      productImage: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=120'
    },
    {
      rating: 5,
      quote: 'The price drop alert on my wishlist TV finally fired. Bought it $80 cheaper than launch price.',
      author: 'Ahmed R.',
      role: 'Tech Enthusiast, Tangier',
      initials: 'AR',
      productImage: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=120'
    }
  ];

  faqs: FAQ[] = [
    { question: 'Is PulsePrice really free?', answer: 'Yes, completely free for both shoppers and business users. No credit card, no hidden fees, ever.', isOpen: true },
    { question: 'How often are prices updated?', answer: 'We refresh prices from all stores every 6 hours, so you always have accurate, up-to-date data.', isOpen: false },
    { question: 'Which stores do you track?', answer: 'We currently track 200+ stores including Amazon, eBay, AliExpress, Jumia, Walmart, BestBuy, Newegg, and many more regional retailers.', isOpen: false },
    { question: 'How do price drop alerts work?', answer: 'Set a target price on any product. The moment any tracked store drops to or below that price, we send you an instant email notification.', isOpen: false },
    { question: 'What is the difference between a shopper and a business account?', answer: 'Shopper accounts get personal deal tools — price comparison, alerts, and deal scoring. Business accounts get bulk tracking, competitor scanning, margin alerts, and data export.', isOpen: false }
  ];

  businessFeatures: BusinessFeature[] = [
    { title: 'Bulk Catalog Tracker', description: 'Monitor thousands of SKUs simultaneously across global marketplaces.' },
    { title: 'Competitor Price Scanner', description: 'Get instant alerts when competitors change their pricing strategy.' },
    { title: 'Margin Protection Alerts', description: 'Automated alerts to ensure your resale margins never dip below profitable levels.' }
  ];

  stats: Stat[] = [
    { value: 52400, label: 'Products', suffix: '+' },
    { value: 214, label: 'Stores', suffix: '' },
    { value: 11200, label: 'Users', suffix: '+' }
  ];

  currentUser$: Observable<User | null>;
  typewriterText = '';
  showStoreCards = false;
  
  // Real Search Properties
  searchQuery = '';
  isFocused = false;
  suggestions: any[] = [];
  productSuggestions: ProductSuggestion[] = [];
  categorySuggestions: CategorySuggestion[] = [];
  private searchDebounce: any;

  popularSearches = [
    'Sony WH-1000XM5', 'PS5', 'Samsung Galaxy'
  ];

  private allProducts: any[] = PLATFORM_PRODUCT_LIBRARY;

  private allCategories: CategorySuggestion[] = [
    { name: 'Smartphones', icon: '📱', count: 1200, slug: 'smartphones' },
    { name: 'Laptops', icon: '💻', count: 850, slug: 'laptops' },
    { name: 'Headphones', icon: '🎧', count: 430, slug: 'headphones' },
    { name: 'Gaming', icon: '🎮', count: 620, slug: 'gaming' },
    { name: 'Périphériques', icon: '📷', count: 380, slug: 'peripheriques' },
    { name: 'Monitors', icon: '🖥️', count: 290, slug: 'monitors' },
    { name: 'Tablets', icon: '📟', count: 310, slug: 'tablets' },
    { name: 'Components', icon: '⚙️', count: 540, slug: 'components' },
  ];

  private typewriterInterval: any;
  private isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (this.isBrowser) {
      this.startTypewriter();
      this.initFloatingIcons();
    }
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
    }
  }

  scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Real Search input handler — debounced 250ms
  onSearchInput(): void {
    clearTimeout(this.searchDebounce);
    if (this.searchQuery.trim().length < 1) {
      this.productSuggestions = [];
      this.categorySuggestions = [];
      this.suggestions = [];
      return;
    }
    this.searchDebounce = setTimeout(() => {
      const q = this.searchQuery.toLowerCase().trim();
      this.productSuggestions = this.allProducts
        .filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
        .slice(0, 4);
      this.categorySuggestions = this.allCategories
        .filter(c => c.name.toLowerCase().includes(q))
        .slice(0, 2);
      this.suggestions = [...this.productSuggestions, ...this.categorySuggestions];
    }, 250);
  }

  // Real Search Submit — navigate to search results
  onSearchSubmit(): void {
    if (this.searchQuery.trim().length === 0) {
      // Shake animation on empty submit
      const el = document.querySelector('.hero-search-bar');
      el?.classList.add('shake');
      setTimeout(() => el?.classList.remove('shake'), 500);
      return;
    }
    this.router.navigate(['/search'], {
      queryParams: { q: encodeURIComponent(this.searchQuery.trim()) }
    });
  }

  // Select a product suggestion
  selectSuggestion(product: ProductSuggestion): void {
    this.searchQuery = product.name;
    this.suggestions = [];
    this.router.navigate(['/product', product.id]);
  }

  // Select a category suggestion
  selectCategory(cat: CategorySuggestion): void {
    this.searchQuery = cat.name;
    this.suggestions = [];
    this.router.navigate(['/search'], { queryParams: { category: cat.slug } });
  }

  // Set query from popular tag click
  setQuery(query: string): void {
    this.searchQuery = query;
    this.onSearchSubmit();
  }

  // Blur — delay close so mousedown on suggestion fires first
  onBlur(): void {
    setTimeout(() => {
      this.isFocused = false;
      this.suggestions = [];
    }, 200);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.suggestions = [];
  }

  toggleFaq(faq: FAQ) {
    const currentState = faq.isOpen;
    this.faqs.forEach(f => f.isOpen = false);
    faq.isOpen = !currentState;
  }

  logout() {
    this.authService.logout();
  }

  getDashboardLink(user: User): string {
    return user.type === 'business' ? '/business' : '/dashboard';
  }

  private initFloatingIcons() {
    const devices = [
      { viewBox: '0 0 24 24', paths: '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12" y2="18"/>' },
      { viewBox: '0 0 24 24', paths: '<rect x="2" y="4" width="20" height="14" rx="2"/><path d="M0 22h24M8 18l-1 4M16 18l1 4"/>' },
      { viewBox: '0 0 24 24', paths: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>' },
      { viewBox: '0 0 24 24', paths: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>' },
      { viewBox: '0 0 24 24', paths: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>' },
      { viewBox: '0 0 24 24', paths: '<line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><path d="M17 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/>' },
      { viewBox: '0 0 24 24', paths: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>' },
      { viewBox: '0 0 24 24', paths: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M16 2v4M8 2v4M16 18v4M8 18v4"/><circle cx="12" cy="12" r="3"/>' }
    ];

    const colors = ['#3B82F6', '#7C3AED'];

    this.floatingIcons = Array.from({ length: 14 }, (_, i) => ({
      svg: devices[i % devices.length].paths,
      viewBox: devices[i % devices.length].viewBox,
      x: 5 + (i * 7),
      y: 10 + (i * 8) % 100,
      size: 48 + (i % 3) * 12,
      duration: 18 + (i % 5) * 2,
      delay: -(i * 1.5),
      opacity: 0.12 + (i % 3) * 0.03,
      color: colors[i % colors.length]
    }));
  }

  private startTypewriter() {
    const text = 'iPhone 15 Pro';
    let i = 0;
    this.typewriterText = '';
    this.showStoreCards = false;

    this.typewriterInterval = setInterval(() => {
      this.typewriterText += text.charAt(i);
      i++;
      if (i >= text.length) {
        clearInterval(this.typewriterInterval);
        setTimeout(() => {
          this.showStoreCards = true;
        }, 300);
      }
    }, 100);
  }
}
