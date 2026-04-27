import { Component, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger, state } from '@angular/animations';
import { PublicNavbarComponent } from '../../shared/components/public-navbar/public-navbar.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

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
  store: string;
  dealScore: number;
  upvotes: number;
  isUpvoted: boolean;
  timeAgo: string;
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

  activeTab = 'All';
  tabs = ['All', 'Price Drops', 'Verified Drops', 'Fake Deal Alerts'];
  
  activeCategory = 'All';
  filterCategories = ['All', 'Smartphones', 'Laptops', 'Gaming', 'Audio', 'Monitors', 'Tablets', 'Components'];
  
  sortOption = 'Newest';
  sortOptions = ['Newest', 'Most upvoted', 'Biggest saving', 'Best deal score'];

  showNewDealToast = false;
  itemsToShow = 8;
  isLoading = true;
  private intervalId: any;

  deals: Deal[] = [
    {
      id: '1', type: 'price_drop', isFeatured: true,
      category: 'Gaming', productName: 'PS5 Console',
      headline: 'PS5 Console hits lowest price since launch — grab it now',
      image: 'https://images.unsplash.com/photo-1593118247619-e2d6f056869e?w=600',
      currentPrice: 449, originalPrice: 599,
      savingsAmount: 150, savingsPercent: 25,
      store: 'Amazon', dealScore: 9.4,
      upvotes: 342, isUpvoted: false, timeAgo: '2 hours ago'
    },
    {
      id: '2', type: 'price_drop', isFeatured: false,
      category: 'Smartphones', productName: 'iPhone 15 Pro',
      headline: 'iPhone 15 Pro drops to 6-month low on eBay',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
      currentPrice: 949, originalPrice: 1099,
      savingsAmount: 150, savingsPercent: 14,
      store: 'eBay', dealScore: 8.9,
      upvotes: 218, isUpvoted: false, timeAgo: '3 hours ago'
    },
    {
      id: '3', type: 'fake_deal_exposed', isFeatured: false,
      category: 'Laptops', productName: 'MacBook Pro 14"',
      headline: 'MacBook Pro "40% off" sale is misleading — price unchanged',
      image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400',
      currentPrice: 1899, originalPrice: 1999,
      savingsAmount: 100, savingsPercent: 5,
      store: 'BestBuy', dealScore: 2.1,
      upvotes: 89, isUpvoted: false, timeAgo: '4 hours ago',
      isFakeDeal: true
    },
    {
      id: '4', type: 'price_drop', isFeatured: false,
      category: 'Audio', productName: 'Sony WH-1000XM5',
      headline: 'Found Sony XM5 at incredible price on Newegg — verified',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      currentPrice: 279, originalPrice: 399,
      savingsAmount: 120, savingsPercent: 30,
      store: 'Newegg', dealScore: 9.1,
      upvotes: 156, isUpvoted: false, timeAgo: '5 hours ago'
    },
    {
      id: '5', type: 'price_drop', isFeatured: false,
      category: 'Components', productName: 'RTX 4080 GPU',
      headline: 'RTX 4080 drops $200 — best price in 3 months',
      image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400',
      currentPrice: 899, originalPrice: 1099,
      savingsAmount: 200, savingsPercent: 18,
      store: 'Newegg', dealScore: 8.7,
      upvotes: 203, isUpvoted: false, timeAgo: '6 hours ago'
    },
    {
      id: '6', type: 'price_drop', isFeatured: false,
      category: 'Monitors', productName: 'LG 27" 4K Monitor',
      headline: 'LG 4K Monitor at lowest price ever — limited stock',
      image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400',
      currentPrice: 299, originalPrice: 449,
      savingsAmount: 150, savingsPercent: 33,
      store: 'Amazon', dealScore: 9.2,
      upvotes: 134, isUpvoted: false, timeAgo: '7 hours ago'
    },
    {
      id: '7', type: 'fake_deal_exposed', isFeatured: false,
      category: 'Monitors', productName: 'Samsung 65" QLED TV',
      headline: 'Samsung TV "Black Friday" price is a scam — been same all year',
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=400',
      currentPrice: 1299, originalPrice: 1499,
      savingsAmount: 200, savingsPercent: 13,
      store: 'Samsung', dealScore: 1.8,
      upvotes: 445, isUpvoted: false, timeAgo: '8 hours ago',
      isFakeDeal: true
    },
    {
      id: '8', type: 'price_drop', isFeatured: false,
      category: 'Tablets', productName: 'iPad Pro 12.9"',
      headline: 'iPad Pro 12.9 hits new low — $300 off original price',
      image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400',
      currentPrice: 799, originalPrice: 1099,
      savingsAmount: 300, savingsPercent: 27,
      store: 'Apple', dealScore: 9.0,
      upvotes: 178, isUpvoted: false, timeAgo: '9 hours ago'
    },
    {
      id: '9', type: 'price_drop', isFeatured: false,
      category: 'Périphériques', productName: 'Logitech G Pro X',
      headline: 'The world\'s best esports mouse at an all-time low price',
      image: 'https://images.unsplash.com/photo-1629429464245-487019807575?w=400',
      currentPrice: 129, originalPrice: 159,
      savingsAmount: 30, savingsPercent: 19,
      store: 'Amazon', dealScore: 9.3,
      upvotes: 142, isUpvoted: false, timeAgo: '10 hours ago'
    },
    {
      id: '10', type: 'price_drop', isFeatured: false,
      category: 'Laptops', productName: 'Dell XPS 15',
      headline: 'Dell XPS 15 drops to best price of 2026',
      image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400',
      currentPrice: 1299, originalPrice: 1599,
      savingsAmount: 300, savingsPercent: 19,
      store: 'Dell', dealScore: 8.5,
      upvotes: 167, isUpvoted: false, timeAgo: '11 hours ago'
    },
    {
      id: '11', type: 'price_drop', isFeatured: false,
      category: 'Gaming', productName: 'Xbox Series X',
      headline: 'Xbox Series X bundle deal — best value right now',
      image: 'https://images.unsplash.com/photo-1593118247619-e2d6f056869e?w=400',
      currentPrice: 399, originalPrice: 499,
      savingsAmount: 100, savingsPercent: 20,
      store: 'Walmart', dealScore: 8.1,
      upvotes: 143, isUpvoted: false, timeAgo: '12 hours ago'
    },
    {
      id: '12', type: 'price_drop', isFeatured: false,
      category: 'Smartphones', productName: 'Samsung Galaxy S24',
      headline: 'Galaxy S24 Ultra — massive discount spotted on Amazon',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
      currentPrice: 899, originalPrice: 1199,
      savingsAmount: 300, savingsPercent: 25,
      store: 'Amazon', dealScore: 8.8,
      upvotes: 201, isUpvoted: false, timeAgo: '13 hours ago'
    }
  ];

  trendingItems = [
    { id: '4', name: 'iPhone 15 Pro', category: 'Smartphones', drop: '↓ 14%', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100' },
    { id: '6', name: 'Sony WH-1000XM5', category: 'Audio', drop: '↓ 25%', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100' },
    { id: '5', name: 'RTX 4080 GPU', category: 'Components', drop: '↓ 16%', image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=100' },
    { id: '7', name: 'iPad Air M2', category: 'Tablets', drop: '↓ 8%', image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=100' },
    { id: '1', name: 'PS5 Console', category: 'Gaming', drop: '↓ 25%', image: 'https://images.unsplash.com/photo-1593118247619-e2d6f056869e?w=100' }
  ];

  biggestDrops = [
    { productName: 'PS5 Console', store: 'Amazon', savingsPercent: 25, savingsAmount: 150, image: 'https://images.unsplash.com/photo-1593118247619-e2d6f056869e?w=80' },
    { productName: 'Sony WH-1000XM5', store: 'Newegg', savingsPercent: 30, savingsAmount: 120, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80' },
    { productName: 'iPad Pro 12.9"', store: 'Apple', savingsPercent: 27, savingsAmount: 300, image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=80' },
    { productName: 'RTX 4080 GPU', store: 'Newegg', savingsPercent: 18, savingsAmount: 200, image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=80' },
    { productName: 'LG 27" 4K Monitor', store: 'Amazon', savingsPercent: 33, savingsAmount: 150, image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=80' }
  ];

  browseCategories = [
    { name: 'Smartphones', count: 124 },
    { name: 'Laptops', count: 86 },
    { name: 'Gaming', count: 215 },
    { name: 'Audio', count: 94 },
    { name: 'Monitors', count: 42 },
    { name: 'Tablets', count: 58 },
    { name: 'Components', count: 112 },
    { name: 'Périphériques', count: 35 },
  ];

  ngOnInit() {
    // Initial load skeleton
    setTimeout(() => this.isLoading = false, 500);

    if (isPlatformBrowser(this.platformId)) {
      this.intervalId = setInterval(() => {
        const newDeal: Deal = {
          id: Date.now().toString(),
          type: 'price_drop',
          category: 'Smartphones',
          productName: 'Samsung Galaxy S24',
          headline: 'Samsung Galaxy S24 drops to new low on Amazon',
          image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
          currentPrice: 699,
          originalPrice: 849,
          savingsAmount: 150,
          savingsPercent: 18,
          store: 'Amazon',
          dealScore: 8.7,
          upvotes: 1,
          isUpvoted: false,
          timeAgo: 'Just now',
          isFeatured: false,
          isNew: true
        };
        this.deals.splice(1, 0, newDeal); // Insert after featured
        this.showNewDealToast = true;
        setTimeout(() => this.showNewDealToast = false, 3000);
        setTimeout(() => newDeal.isNew = false, 3000);
      }, 15000);
    }
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
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
      } else if (this.activeTab === 'Verified Drops') {
        filtered = filtered.filter(d => d.dealScore >= 8.5);
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
      if (this.sortOption === 'Newest') return parseInt(b.id) - parseInt(a.id);
      if (this.sortOption === 'Most upvoted') return b.upvotes - a.upvotes;
      if (this.sortOption === 'Biggest saving') return b.savingsAmount - a.savingsAmount;
      if (this.sortOption === 'Best deal score') return b.dealScore - a.dealScore;
      return 0;
    });
    
    return filtered.slice(0, this.itemsToShow);
  }

  get hasMoreDeals() {
    return this.itemsToShow < this.deals.filter(d => !d.isFeatured).length;
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
