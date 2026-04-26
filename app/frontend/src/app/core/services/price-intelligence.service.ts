import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { 
  ILiveTickerFeed, 
  IHotDealToday, 
  IMarketShare, 
  IDailyPriceSummary,
  IProductMarketStats,
  IStatisticalInsight
} from '../models/market-intelligence.model';

@Injectable({
  providedIn: 'root'
})
export class PriceIntelligenceService {

  getLiveTickerFeed(): Observable<ILiveTickerFeed[]> {
    return of([
      { productId: 'p1', shortName: 'RTX 4090', platform: 'Amazon', currentPrice: 1599.00, previousClose: 1649.00, changePct: -3.03, changeDirection: 'DOWN', refreshedAt: new Date().toISOString(), displayOrder: 1 },
      { productId: 'p2', shortName: 'MacBook M3', platform: 'BestBuy', currentPrice: 1299.00, previousClose: 1299.00, changePct: 0, changeDirection: 'FLAT', refreshedAt: new Date().toISOString(), displayOrder: 2 },
      { productId: 'p3', shortName: 'Sony XM5', platform: 'Walmart', currentPrice: 328.00, previousClose: 398.00, changePct: -17.59, changeDirection: 'DOWN', refreshedAt: new Date().toISOString(), displayOrder: 3 },
      { productId: 'p4', shortName: 'Ryzen 7800X3D', platform: 'eBay', currentPrice: 349.00, previousClose: 339.00, changePct: 2.95, changeDirection: 'UP', refreshedAt: new Date().toISOString(), displayOrder: 4 },
    ]);
  }

  getHotDealsToday(): Observable<IHotDealToday[]> {
    return of([
      { productId: 'p3', productName: 'Sony WH-1000XM5', brand: 'Sony', emojiIcon: '🎧', platform: 'Walmart', currentPrice: 328.00, referencePrice: 398.00, dropAbs: 70.00, dropPct: 17.6, rank: 1, computedAt: new Date().toISOString() },
      { productId: 'p5', productName: 'Samsung 990 Pro 2TB', brand: 'Samsung', emojiIcon: '💾', platform: 'Amazon', currentPrice: 149.00, referencePrice: 189.00, dropAbs: 40.00, dropPct: 21.2, rank: 2, computedAt: new Date().toISOString() },
      { productId: 'p1', productName: 'NVIDIA RTX 4090 FE', brand: 'NVIDIA', emojiIcon: '🎮', platform: 'Amazon', currentPrice: 1599.00, referencePrice: 1699.00, dropAbs: 100.00, dropPct: 5.9, rank: 3, computedAt: new Date().toISOString() },
      { productId: 'p6', productName: 'iPad Pro M2', brand: 'Apple', emojiIcon: '📱', platform: 'BestBuy', currentPrice: 799.00, referencePrice: 899.00, dropAbs: 100.00, dropPct: 11.1, rank: 4, computedAt: new Date().toISOString() },
      { productId: 'p7', productName: 'Logitech G Pro X', brand: 'Logitech', emojiIcon: '🖱️', platform: 'eBay', currentPrice: 99.00, referencePrice: 129.00, dropAbs: 30.00, dropPct: 23.3, rank: 5, computedAt: new Date().toISOString() },
    ]);
  }

  getMarketShare(category: string = 'all'): Observable<IMarketShare[]> {
    return of([
      { computedDate: new Date().toISOString(), category, platform: 'Amazon', listingCount: 1200, sharePct: 45, avgPrice: 450 },
      { computedDate: new Date().toISOString(), category, platform: 'BestBuy', listingCount: 650, sharePct: 25, avgPrice: 520 },
      { computedDate: new Date().toISOString(), category, platform: 'eBay', listingCount: 500, sharePct: 20, avgPrice: 380 },
      { computedDate: new Date().toISOString(), category, platform: 'Walmart', listingCount: 250, sharePct: 10, avgPrice: 410 },
    ]);
  }

  getProductStats(productId: string): Observable<IProductMarketStats> {
    return of({
      productId,
      platform: 'Amazon',
      computedAt: new Date().toISOString(),
      avgPrice30d: 1620.00,
      minPrice30d: 1590.00,
      maxPrice30d: 1699.00,
      allTimeLow: 1499.00,
      allTimeHigh: 1840.00,
      priceTrend7dPct: -2.5,
      sparklineValues: [1650, 1640, 1630, 1635, 1610, 1600, 1599],
      dropFromPeakPct: 13.1
    });
  }

  getDailyPriceSummary(productId: string, days: number = 30): Observable<IDailyPriceSummary[]> {
    // Mock 30 days of data
    const summary: IDailyPriceSummary[] = [];
    const now = new Date();
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      summary.push({
        productId,
        platform: 'Aggregated',
        date: date.toISOString(),
        openPrice: 1600 - i,
        closePrice: 1599 - i,
        minPrice: 1590 - i,
        maxPrice: 1610 - i,
        avgPrice: 1600 - i,
        changeVsYesterdayAbs: -1,
        changeVsYesterdayPct: -0.06
      });
    }
    return of(summary);
  }

  getStatisticalInsights(): Observable<IStatisticalInsight[]> {
    return of([
      {
        metric: 'Price Variance Across Retailers',
        method: 'ANOVA',
        pValue: 0.001,
        confidenceInterval: [0.05, 0.12],
        significance: 'HIGH',
        verdict: 'Statistically significant price disparity detected across Amazon and BestBuy nodes.'
      },
      {
        metric: '7D Trend Validity',
        method: 'T-TEST',
        pValue: 0.042,
        confidenceInterval: [0.02, 0.08],
        significance: 'MEDIUM',
        verdict: 'Current downward trend in Gaming category is confirmed with 95% confidence.'
      }
    ]);
  }
}
