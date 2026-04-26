import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

@Component({
  selector: 'app-tracked-products',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="tracked-page" [@pageEnter]>
      <header class="page-header animate-in">
        <div class="header-info">
          <h1>Tracked Products</h1>
          <p>Products you're watching. We alert you the moment prices move.</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" (click)="router.navigate(['/search'])">
            Find products →
          </button>
        </div>
      </header>

      <div class="filter-bar animate-in" *ngIf="trackedProducts.length > 0">
        <button class="filter-pill active">All</button>
        <button class="filter-pill">Price Dropped</button>
        <button class="filter-pill">Price Rising</button>
        <button class="filter-pill">Has Alert</button>
        <button class="filter-pill">No Alert</button>
      </div>

      <div class="products-grid" *ngIf="trackedProducts.length > 0; else emptyState">
        <div class="product-card animate-in" *ngFor="let product of trackedProducts" [routerLink]="['/product', product.id]">
          <div class="card-image">
            <img [src]="product.image" [alt]="product.name">
            <div class="floating-score" [class]="getScoreClass(product.dealScore)">
              {{ product.dealScore }}
            </div>
            <div class="floating-alert" [class.has-alert]="product.hasAlert" [class.no-alert]="!product.hasAlert">
              {{ product.hasAlert ? 'Alert Active' : 'No Alert' }}
            </div>
            <div class="price-change-tag" 
                 *ngIf="product.currentPrice !== product.priceWhenAdded"
                 [class.down]="product.currentPrice < product.priceWhenAdded" 
                 [class.up]="product.currentPrice > product.priceWhenAdded">
              {{ product.currentPrice < product.priceWhenAdded ? '↓' : '↑' }} 
              {{ getAbsChange(product.currentPrice, product.priceWhenAdded) | currency:'USD':'symbol':'1.0-0' }}
            </div>
          </div>

          <div class="card-body">
            <div class="product-category">{{ product.category }}</div>
            <h3 class="product-name">{{ product.name }}</h3>
            
            <div class="price-row">
              <div class="product-price">{{ product.currentPrice | currency }}</div>
              <div class="product-store">at {{ product.store }}</div>
            </div>
          </div>

          <div class="card-footer">
            <a
              class="card-link"
            >
              View deals →
            </a>
            <div class="icon-btns">
              <button
                class="icon-btn"
                [class.bell-active]="product.hasAlert"
                (click)="$event.stopPropagation(); router.navigate(['/dashboard/alerts'], { queryParams: { product: product.id } })"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              </button>
              <button class="icon-btn trash" (click)="$event.stopPropagation()">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ng-template #emptyState>
        <div class="empty-state animate-in">
          <div class="empty-icon">📦</div>
          <h2>No tracked products yet</h2>
          <p>Begin tracking products to see them here and get price drop notifications.</p>
          <button class="btn-primary" (click)="router.navigate(['/search'])">
            Browse electronics →
          </button>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .tracked-page {
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex; align-items: flex-start;
      justify-content: space-between; margin-bottom: 32px;
    }

    h1 { font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 0; letter-spacing: -0.01em; }
    p { font-size: 14px; color: var(--text-secondary); margin: 6px 0 0; }
    .header-actions { display: flex; align-items: center; gap: 12px; }

    .btn-primary {
      height: 40px; padding: 0 20px; background: var(--accent-blue);
      color: white; border: none; border-radius: 10px;
      font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s;
    }
    .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }

    .filter-bar {
      display: flex; gap: 10px; margin-bottom: 32px; flex-wrap: wrap;
    }

    .filter-pill {
      height: 34px; padding: 0 16px; border-radius: 20px;
      font-size: 13px; font-weight: 600; cursor: pointer;
      transition: all 0.2s; border: 1px solid var(--border);
      background: var(--bg-secondary); color: var(--text-secondary);
    }
    .filter-pill:hover { border-color: var(--border-mid); color: var(--text-primary); background: var(--bg-hover); }
    .filter-pill.active { background: var(--accent-blue-light); color: var(--accent-blue); border-color: var(--accent-blue); }

    .products-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;
    }

    .product-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 20px; overflow: hidden;
      box-shadow: var(--shadow-card); transition: all 0.2s ease;
      display: flex; flex-direction: column; cursor: pointer;
    }

    .product-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-hover); border-color: var(--border-mid); }

    .card-image { height: 180px; position: relative; background: var(--bg-primary); }
    .card-image img { width: 100%; height: 100%; object-fit: cover; opacity: 0.85; transition: opacity 0.2s; }
    .product-card:hover .card-image img { opacity: 1; }

    .floating-score {
      position: absolute; top: 12px; left: 12px;
      width: 34px; height: 34px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 800;
      backdrop-filter: blur(8px); border: 1px solid var(--border-mid);
    }
    .score-high { background: var(--accent-green-light); color: var(--accent-green); }
    .score-mid { background: var(--accent-amber-light); color: var(--accent-amber); }
    .score-low { background: var(--accent-red-light); color: var(--accent-red); }

    .floating-alert {
      position: absolute; top: 12px; right: 12px;
      font-size: 10px; font-weight: 700; padding: 4px 10px;
      border-radius: 20px; backdrop-filter: blur(8px);
      text-transform: uppercase; letter-spacing: 0.02em;
    }
    .floating-alert.has-alert { background: var(--accent-blue); color: white; }
    .floating-alert.no-alert { background: var(--bg-elevated); color: var(--text-muted); border: 1px solid var(--border); }

    .price-change-tag {
      position: absolute; bottom: 12px; left: 12px;
      font-size: 11px; font-weight: 700; padding: 4px 10px;
      border-radius: 20px;
    }
    .price-change-tag.down { background: var(--accent-green-light); color: var(--accent-green); }
    .price-change-tag.up { background: var(--accent-red-light); color: var(--accent-red); }

    .card-body { padding: 20px; flex: 1; }

    .product-category {
      font-size: 10px; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--text-muted);
      margin-bottom: 6px; font-weight: 700;
    }

    .product-name {
      font-size: 16px; font-weight: 700; color: var(--text-primary);
      display: -webkit-box; -webkit-line-clamp: 2;
      -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 16px;
      line-height: 1.4; height: 44px;
    }

    .price-row { display: flex; align-items: baseline; gap: 8px; }
    .product-price {
      font-size: 22px; font-weight: 800;
      color: var(--accent-green); font-variant-numeric: tabular-nums;
    }

    .product-store { font-size: 12px; color: var(--text-muted); font-weight: 500; }

    .card-footer {
      padding: 14px 20px; border-top: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
      background: transparent;
    }

    .card-link {
      font-size: 13px; font-weight: 700; color: var(--accent-blue);
      text-decoration: none;
    }
    .card-link:hover { text-decoration: underline; }

    .icon-btns { display: flex; gap: 8px; }

    .icon-btn {
      width: 34px; height: 34px; border-radius: 10px;
      background: var(--bg-secondary); border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.2s; color: var(--text-muted);
    }
    .icon-btn svg { width: 16px; height: 16px; color: currentColor; }
    .icon-btn:hover { border-color: var(--border-mid); background: var(--bg-hover); color: var(--text-primary); }
    .icon-btn.bell-active { color: var(--accent-amber); background: var(--accent-amber-light); border-color: var(--accent-amber); }
    .icon-btn.trash:hover { color: var(--accent-red); background: var(--accent-red-light); border-color: var(--accent-red); }

    .empty-state {
      padding: 80px 20px; text-align: center;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 24px; margin-top: 20px;
    }
    .empty-icon { font-size: 48px; margin-bottom: 20px; }
    .empty-state h2 { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0 0 12px; }
    .empty-state p { color: var(--text-secondary); margin-bottom: 24px; max-width: 400px; margin-left: auto; margin-right: auto; }

    @media (max-width: 900px) {
      .products-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .products-grid { grid-template-columns: 1fr; }
    }
  `]
,
  animations: [
    trigger('pageEnter', [
      transition(':enter', [
        query('.animate-in', [
          style({ opacity: 0, transform: 'translateY(16px)' }),
          stagger(50, [
            animate('280ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class TrackedProductsComponent {
  trackedProducts = [
    { id: '1', name: 'iPhone 15 Pro', category: 'Smartphones', currentPrice: 854, originalPrice: 999, priceWhenAdded: 999, store: 'Amazon', dealScore: 9.4, hasAlert: true, alertTarget: 800, image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', priceHistory: [999,989,979,969,959,899,854] },
    { id: '2', name: 'MacBook Pro 14"', category: 'Laptops', currentPrice: 1879, originalPrice: 1999, priceWhenAdded: 1999, store: 'Newegg', dealScore: 8.7, hasAlert: true, alertTarget: 1800, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400', priceHistory: [1999,1989,1979,1969,1939,1909,1879] },
    { id: '3', name: 'Sony WH-1000XM5', category: 'Audio', currentPrice: 279, originalPrice: 399, priceWhenAdded: 320, store: 'BestBuy', dealScore: 9.1, hasAlert: false, alertTarget: null, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', priceHistory: [320,315,310,305,295,285,279] },
    { id: '4', name: 'PS5 Console', category: 'Gaming', currentPrice: 449, originalPrice: 599, priceWhenAdded: 499, store: 'Amazon', dealScore: 9.4, hasAlert: true, alertTarget: 400, image: 'https://images.unsplash.com/photo-1593118247619-e2d6f056869e?w=400', priceHistory: [499,489,479,469,459,449,449] },
    { id: '5', name: 'iPad Pro 12.9"', category: 'Tablets', currentPrice: 899, originalPrice: 1099, priceWhenAdded: 1099, store: 'Apple', dealScore: 8.2, hasAlert: false, alertTarget: null, image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400', priceHistory: [1099,1089,1079,1050,1020,950,899] },
    { id: '6', name: 'RTX 4080 GPU', category: 'Components', currentPrice: 899, originalPrice: 1099, priceWhenAdded: 950, store: 'Newegg', dealScore: 8.7, hasAlert: true, alertTarget: 850, image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400', priceHistory: [950,940,930,920,910,905,899] }
  ];

  constructor(public router: Router) {}

  getAbsChange(current: number, added: number): number {
    return Math.abs(current - added);
  }

  getScoreClass(score: number): string {
    if (score >= 8) return 'score-high';
    if (score >= 5) return 'score-mid';
    return 'score-low';
  }
}
