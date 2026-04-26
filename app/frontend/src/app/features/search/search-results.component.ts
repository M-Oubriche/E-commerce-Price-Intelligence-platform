import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PublicNavbarComponent } from '../../shared/components/public-navbar/public-navbar.component';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';
import { AuthService } from '../../core/services/auth.service';
import { PLATFORM_PRODUCT_LIBRARY } from '../../core/constants/product-library';

interface Product {
  id: string;
  name: string;
  category: string;
  image: string;
  bestPrice: number;
  bestStore: string;
  highestPrice: number;
  storeCount: number;
  dealScore: number;
  isFakeDeal: boolean;
  priceTrend: 'up' | 'down' | 'stable';
  priceHistory7d: number[];
}

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, PublicNavbarComponent],
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.scss'],
  animations: [
    trigger('staggerFade', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(50, [
            animate('400ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class SearchResultsComponent implements OnInit {
  query = '';
  filteredResults: Product[] = [];
  
  minPrice = 0;
  maxPrice = 5000;
  selectedCategory = 'All';
  selectedStores: string[] = [];
  selectedScoreRange: string = 'Any';
  inStockOnly = false;
  freeShipping = false;
  sortBy = 'Best Match';

  categories = ['All', 'Smartphones', 'Laptops', 'Monitors', 'Headphones', 'Périphériques', 'Gaming', 'Tablets', 'Components'];
  stores = ['Amazon', 'eBay', 'AliExpress', 'Jumia', 'Walmart', 'BestBuy', 'Newegg'];
  
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  allProducts: Product[] = [
    { id: '1', name: 'iPhone 15 Pro', category: 'Smartphones', bestPrice: 949, bestStore: 'eBay', highestPrice: 1099, storeCount: 12, dealScore: 9.4, isFakeDeal: false, priceTrend: 'down', priceHistory7d: [999, 980, 980, 970, 960, 950, 949], image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400' },
    { id: '2', name: 'MacBook Pro 16"', category: 'Laptops', bestPrice: 2299, bestStore: 'Amazon', highestPrice: 2499, storeCount: 8, dealScore: 8.1, isFakeDeal: false, priceTrend: 'stable', priceHistory7d: [2299, 2299, 2299, 2299, 2299, 2299, 2299], image: 'https://images.unsplash.com/photo-1517336712461-4e1a7759533a?w=400' },
    { id: '3', name: 'Sony WH-1000XM5', category: 'Headphones', bestPrice: 328, bestStore: 'BestBuy', highestPrice: 399, storeCount: 15, dealScore: 9.8, isFakeDeal: false, priceTrend: 'down', priceHistory7d: [380, 370, 360, 350, 340, 330, 328], image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' },
    { id: '4', name: 'Samsung S95C OLED TV', category: 'Monitors', bestPrice: 1899, bestStore: 'Amazon', highestPrice: 2299, storeCount: 6, dealScore: 4.2, isFakeDeal: true, priceTrend: 'up', priceHistory7d: [1799, 1850, 1850, 1899, 1899, 1899, 1899], image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=400' },
    { id: '5', name: 'PlayStation 5', category: 'Gaming', bestPrice: 449, bestStore: 'Walmart', highestPrice: 499, storeCount: 10, dealScore: 7.5, isFakeDeal: false, priceTrend: 'down', priceHistory7d: [499, 499, 480, 470, 460, 450, 449], image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400' },
    ...PLATFORM_PRODUCT_LIBRARY.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      bestPrice: p.defaultPrice,
      bestStore: 'Marketplace',
      highestPrice: p.defaultPrice * 1.1,
      storeCount: 1,
      dealScore: 9.0,
      isFakeDeal: false,
      priceTrend: 'stable' as const,
      priceHistory7d: [p.defaultPrice, p.defaultPrice, p.defaultPrice, p.defaultPrice, p.defaultPrice, p.defaultPrice, p.defaultPrice],
      image: p.image
    }))
  ];

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.query = params['q'] || '';
      this.sortBy = params['sort'] || 'Best Match';
      const catParam = params['category'];
      if (catParam) {
        this.selectedCategory = this.categories.find(c => c.toLowerCase().replace(/ /g, '-') === catParam) || 'All';
      } else {
        this.selectedCategory = 'All';
      }
      this.applyFilters();
    });
  }

  applyFilters() {
    this.filteredResults = this.allProducts.filter(p => {
      const matchesQuery = p.name.toLowerCase().includes(this.query.toLowerCase()) || 
                           p.category.toLowerCase().includes(this.query.toLowerCase());
      const matchesCategory = this.selectedCategory === 'All' || p.category === this.selectedCategory;
      const matchesPrice = p.bestPrice >= this.minPrice && p.bestPrice <= this.maxPrice;
      const matchesScore = this.checkScoreMatch(p.dealScore);
      const matchesStore = this.selectedStores.length === 0 || this.selectedStores.includes(p.bestStore);
      
      return matchesQuery && matchesCategory && matchesPrice && matchesScore && matchesStore;
    });
    this.sortResults();
  }

  checkScoreMatch(score: number): boolean {
    if (this.selectedScoreRange === 'Any') return true;
    if (this.selectedScoreRange === '8-10' && score >= 8) return true;
    if (this.selectedScoreRange === '6-7' && score >= 6 && score < 8) return true;
    if (this.selectedScoreRange === '4-5' && score >= 4 && score < 6) return true;
    if (this.selectedScoreRange === '1-3' && score < 4) return true;
    return false;
  }

  sortResults() {
    switch (this.sortBy) {
      case 'Lowest Price': this.filteredResults.sort((a, b) => a.bestPrice - b.bestPrice); break;
      case 'Highest Price': this.filteredResults.sort((a, b) => b.bestPrice - a.bestPrice); break;
      case 'Deal Score': this.filteredResults.sort((a, b) => b.dealScore - a.dealScore); break;
      default: break;
    }
  }

  updateQueryParams(updates: any) {
    this.router.navigate([], { queryParams: updates, queryParamsHandling: 'merge' });
  }

  clearFilters() {
    this.router.navigate([], { queryParams: { q: this.query } });
  }

  setCategory(cat: string) {
    const catUrl = cat === 'All' ? null : cat.toLowerCase().replace(/ /g, '-');
    this.updateQueryParams({ category: catUrl });
  }

  setSort(sort: string) {
    this.updateQueryParams({ sort: sort === 'Best Match' ? null : sort });
  }

  onSetAlert() {
    if (!this.authService.isLoggedIn()) {
      const returnUrl = encodeURIComponent(this.router.url);
      localStorage.setItem('priceradar_return_url', this.router.url);
      this.router.navigate(['/auth'], { queryParams: { mode: 'signup', returnUrl } });
    }
  }

  toggleStore(store: string) {
    const index = this.selectedStores.indexOf(store);
    if (index === -1) this.selectedStores.push(store);
    else this.selectedStores.splice(index, 1);
    this.applyFilters();
  }

  setScoreRange(range: string) {
    this.selectedScoreRange = range;
    this.applyFilters();
  }
}
