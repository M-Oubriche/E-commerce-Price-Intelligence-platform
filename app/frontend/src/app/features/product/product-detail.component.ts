import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PublicNavbarComponent } from '../../shared/components/public-navbar/public-navbar.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { PLATFORM_PRODUCT_LIBRARY } from '../../core/constants/product-library';
import { trigger, transition, style, animate } from '@angular/animations';

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
export class ProductDetailComponent implements OnInit {
  productId = '';
  product: any = {
    name: '', brand: '', category: '', rating: 0, reviewCount: 0, dealScore: 0, isFakeDeal: false,
    description: '', image: '', images: [], storeCount: 0, stores: [], bestPrice: 0, bestStore: '',
    priceChange: 0, specs: []
  };
  activeTab = '1W';
  showAlertModal = false;
  showAlertForm = false;
  alertSet = false;
  isTracking = false;
  isLoggedIn = false;

  authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);

  historyTabs = [
    { label: '1W', requiresAuth: false },
    { label: '1M', requiresAuth: true },
    { label: '3M', requiresAuth: true },
    { label: '6M', requiresAuth: true },
    { label: '1Y', requiresAuth: true }
  ];

  currentChartData = [
    { date: 'Mar 08', price: 999 },
    { date: 'Mar 09', price: 980 },
    { date: 'Mar 10', price: 980 },
    { date: 'Mar 11', price: 970 },
    { date: 'Mar 12', price: 960 },
    { date: 'Mar 13', price: 950 },
    { date: 'Mar 14', price: 854 }
  ];

  similarProducts = [
    { id: '2', name: 'Samsung Galaxy S24 Ultra', bestPrice: 1199, image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=200', dealScore: 8.8, category: 'Smartphones', store: 'Amazon' },
    { id: '3', name: 'Google Pixel 8 Pro', bestPrice: 899, image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=200', dealScore: 9.1, category: 'Smartphones', store: 'BestBuy' },
    { id: '4', name: 'OnePlus 12', bestPrice: 799, image: 'https://images.unsplash.com/photo-1678911820864-e2c567c655d7?w=200', dealScore: 7.5, category: 'Smartphones', store: 'Newegg' },
    { id: '5', name: 'iPhone 14 Pro', bestPrice: 749, image: 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=200', dealScore: 6.4, category: 'Smartphones', store: 'eBay' }
  ];

  scoreFactors = [
    { label: 'Price vs history', score: 8.5, description: 'Currently 15% below the 90-day average price', color: '#10B981' },
    { label: 'Store reliability', score: 9.0, description: 'Amazon has a 98% accuracy rating on our platform', color: '#10B981' },
    { label: 'Availability', score: 7.5, description: 'In stock at 6 of 8 tracked stores', color: '#F59E0B' }
  ];

  suggestedAlertPrice = 0;
  alertTargetPrice = 0;

  ngOnInit() {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.route.params.subscribe(params => {
      this.productId = params['id'];
      
      // Initialize tracking and alert state from service
      if (this.isLoggedIn) {
        this.isTracking = this.authService.isTracked(this.productId);
        this.alertSet = this.authService.alerts.some(a => a.productId === this.productId);
      }

      // Look for product in library
      const libraryProduct = PLATFORM_PRODUCT_LIBRARY.find(p => p.id === this.productId);
      
      if (libraryProduct) {
        this.product = {
          id: libraryProduct.id,
          name: libraryProduct.name,
          brand: libraryProduct.brand || 'Premium Brand',
          category: libraryProduct.category,
          rating: libraryProduct.rating || 4.8,
          reviewCount: 1240,
          dealScore: libraryProduct.dealScore || 9.4,
          isFakeDeal: false,
          description: libraryProduct.description || 'Experience the next generation of electronics with advanced features and premium build quality.',
          image: libraryProduct.image,
          images: [libraryProduct.image, 'https://images.unsplash.com/photo-1592890288564-76628a30a657?w=800', 'https://images.unsplash.com/photo-1556656793-062ff9878258?w=800'],
          storeCount: 8,
          bestPrice: libraryProduct.defaultPrice,
          bestStore: 'Amazon',
          bestStoreUrl: 'https://amazon.com',
          priceChange: -45,
          specs: [
            { label: 'Category', value: libraryProduct.category },
            { label: 'Quality', value: 'Certified' },
            { label: 'Warranty', value: '1 Year' }
          ],
          stores: [
            { name: 'Amazon', shipping: 'Free shipping', inStock: true, price: libraryProduct.defaultPrice, vsLastWeek: -45, url: '#' },
            { name: 'eBay', shipping: 'Free shipping', inStock: true, price: Math.round(libraryProduct.defaultPrice * 1.05), vsLastWeek: -30, url: '#' },
            { name: 'AliExpress', shipping: '$15.00 shipping', inStock: true, price: Math.round(libraryProduct.defaultPrice * 1.02), vsLastWeek: -10, url: '#' },
            { name: 'Walmart', shipping: 'Free shipping', inStock: false, price: Math.round(libraryProduct.defaultPrice * 1.08), vsLastWeek: 12, url: '#' },
            { name: 'BestBuy', shipping: 'Free shipping', inStock: true, price: Math.round(libraryProduct.defaultPrice * 1.1), vsLastWeek: 5, url: '#' }
          ]
        };
      } else {
        // Fallback or Handle Not Found
        this.product.name = 'Product Not Found';
        this.product.description = 'Sorry, we do not currently track this product in our database.';
      }
      
      this.suggestedAlertPrice = Math.round(this.product.bestPrice * 0.9);
      this.alertTargetPrice = this.suggestedAlertPrice;
    });
  }

  selectImage(img: string) { this.product.image = img; }
  selectTab(tab: any) { this.activeTab = tab.label; }

  get scoreColor(): string {
    if (this.product.dealScore >= 8) return '#10B981';
    if (this.product.dealScore >= 5) return '#F59E0B';
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
    return Math.min(...this.currentChartData.map((p: any) => p.price));
  }

  get chartHighest(): number {
    return Math.max(...this.currentChartData.map((p: any) => p.price));
  }

  get chartAverage(): number {
    const sum = this.currentChartData.reduce((a: number, p: any) => a + p.price, 0);
    return Math.round(sum / this.currentChartData.length);
  }

  get isTabLocked(): boolean {
    const tab = this.historyTabs.find((t: any) => t.label === this.activeTab);
    return !!(tab?.requiresAuth && !this.isLoggedIn);
  }

  createAlert() {
    if (!this.isLoggedIn) {
      this.router.navigate(['/auth'], { queryParams: { mode: 'signup', returnUrl: this.currentUrl } });
      return;
    }

    const alert: any = {
      id: Math.random().toString(36).substring(2, 9),
      productId: this.productId,
      conditionType: 'price_below',
      targetValue: this.alertTargetPrice,
      stores: [this.product.bestStore],
      notifyEmail: true,
      notifyApp: true,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    this.authService.addAlert(alert);
    this.alertSet = true;
    this.showAlertForm = false;
    this.isTracking = true;
    this.toastService.show('Price alert set successfully!');
  }

  toggleTrack() {
    if (!this.isLoggedIn) {
      this.router.navigate(['/auth'], { queryParams: { mode: 'signup', returnUrl: this.currentUrl } });
      return;
    }
    this.isTracking = this.authService.toggleTracked(this.productId);
    
    // If tracking was removed, alertSet should also be false because the service removed it
    if (!this.isTracking) {
      this.alertSet = false;
    }
    
    this.toastService.show(this.isTracking ? 'Product tracked' : 'Tracking removed');
  }

  get currentUrl(): string {
    return this.router.url;
  }

  get chartGridLines(): number[] {
    return [30, 60, 90, 120, 150];
  }

  get chartPoints(): any[] {
    const width = 600;
    const height = 180;
    const minPrice = this.chartLowest * 0.95;
    const maxPrice = this.chartHighest * 1.05;
    const priceRange = maxPrice - minPrice;

    return this.currentChartData.map((p, i) => {
      const x = (i / (this.currentChartData.length - 1)) * width;
      const y = height - ((p.price - minPrice) / priceRange) * height;
      return {
        x, y, price: p.price, date: p.date,
        isLowest: p.price === this.chartLowest,
        isHighest: p.price === this.chartHighest
      };
    });
  }

  get chartLinePath(): string {
    const points = this.chartPoints;
    if (points.length === 0) return '';
    return `M ${points[0].x},${points[0].y} ` + points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ');
  }

  get chartAreaPath(): string {
    const points = this.chartPoints;
    if (points.length === 0) return '';
    const linePath = this.chartLinePath;
    return `${linePath} L ${points[points.length - 1].x},180 L ${points[0].x},180 Z`;
  }
}
