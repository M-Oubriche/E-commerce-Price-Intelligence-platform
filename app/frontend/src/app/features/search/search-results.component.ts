import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PublicNavbarComponent } from '../../shared/components/public-navbar/public-navbar.component';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { AnalyticsApiService } from '../../core/services/analytics-api.service';

interface Product {
  id: string;
  name: string;
  category: string;
  image: string;
  bestPrice: number;
  bestPlatform: string;
  allTimeLow: number | null;
  platformCount: number;
  dealScore: number;
  isFakeDeal: boolean;
  priceTrend: 'up' | 'down' | 'stable';
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
  selectedPlatforms: string[] = [];
  selectedScoreRange: string = 'Any';
  sortBy = 'Best Match';

  categories: string[] = ['All'];
  platforms: string[] = [];
  
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private analyticsApi = inject(AnalyticsApiService);
  private destroyRef = inject(DestroyRef);

  allProducts: Product[] = [];
  isLoading = true;

  private pendingCategory: string | null = null;

  ngOnInit() {
    this.analyticsApi.getCategoryTrends().pipe(
      catchError(() => of([])),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(rows => {
      if (rows && rows.length > 0) {
        this.categories = ['All', ...rows.map(r => r.product_category)];
      }
      // Re-apply category from URL after categories load (race condition fix)
      if (this.pendingCategory) {
        const found = this.categories.find(c => c.toLowerCase().replace(/ /g, '-') === this.pendingCategory);
        if (found) this.selectedCategory = found;
        this.pendingCategory = null;
        this.applyFilters();
      }
    });

    this.analyticsApi.getPlatformPerformance().pipe(
      catchError(() => of([])),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(rows => {
      if (rows && rows.length > 0) {
        this.platforms = rows.map(r => r.platform);
      }
    });

    this.route.queryParams.subscribe(params => {
      this.query = params['q'] || '';
      this.sortBy = params['sort'] || 'Best Match';
      this.selectedScoreRange = params['score'] || 'Any';
      const catParam = params['category'];
      if (catParam) {
        const found = this.categories.find(c => c.toLowerCase().replace(/ /g, '-') === catParam);
        if (found) {
          this.selectedCategory = found;
        } else {
          // Categories might not be loaded yet — save for retry after they arrive
          this.pendingCategory = catParam;
        }
      } else {
        this.selectedCategory = 'All';
      }
      this.fetchSearchResults();
    });
  }

  fetchSearchResults() {
    this.isLoading = true;
    this.analyticsApi.searchProducts(this.query).subscribe({
      next: (rows) => {
        this.allProducts = rows.map(r => ({
          id: r.product_unified_id,
          name: r.product_name,
          category: r.product_category,
          image: r.product_image_url || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400',
          bestPrice: r.current_price || 0,
          bestPlatform: r.source,
          allTimeLow: r.all_time_low_price,
          platformCount: r.total_platforms_tracked || 1,
          dealScore: r.deal_score,
          isFakeDeal: r.is_fake_deal,
          priceTrend: r.discount_percent && r.discount_percent > 0 ? 'down' : 'stable'
        }));
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  applyFilters() {
    this.filteredResults = this.allProducts.filter(p => {
      const matchesCategory = this.selectedCategory === 'All' || p.category === this.selectedCategory;
      const matchesPrice = p.bestPrice >= this.minPrice && p.bestPrice <= this.maxPrice;
      const matchesScore = this.checkScoreMatch(p.dealScore);
      const matchesPlatform = this.selectedPlatforms.length === 0 || this.selectedPlatforms.includes(p.bestPlatform);
      
      return matchesCategory && matchesPrice && matchesScore && matchesPlatform;
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

  productUrl(id: string): string {
    return '/product/' + encodeURIComponent(id);
  }

  clearFilters() {
    this.minPrice = 0;
    this.maxPrice = 5000;
    this.selectedCategory = 'All';
    this.selectedPlatforms = [];
    this.selectedScoreRange = 'Any';
    this.sortBy = 'Best Match';
    this.router.navigate([], { queryParams: { q: this.query } });
  }

  setCategory(cat: string) {
    this.selectedCategory = cat;
    const catUrl = cat === 'All' ? null : cat.toLowerCase().replace(/ /g, '-');
    this.updateQueryParams({ category: catUrl });
  }

  setSort(sort: string) {
    this.sortBy = sort;
    this.updateQueryParams({ sort: sort === 'Best Match' ? null : sort });
  }

  onSetAlert() {
    if (!this.authService.isLoggedIn()) {
      const returnUrl = encodeURIComponent(this.router.url);
      localStorage.setItem('priceradar_return_url', this.router.url);
      this.router.navigate(['/auth'], { queryParams: { mode: 'signup', returnUrl } });
    }
  }

  togglePlatform(platform: string) {
    const index = this.selectedPlatforms.indexOf(platform);
    if (index === -1) this.selectedPlatforms.push(platform);
    else this.selectedPlatforms.splice(index, 1);
    this.applyFilters();
  }

  setScoreRange(range: string) {
    this.selectedScoreRange = range;
    this.updateQueryParams({ score: range === 'Any' ? null : range });
    this.applyFilters();
  }
}
