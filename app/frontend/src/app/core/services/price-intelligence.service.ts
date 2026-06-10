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
    return of([]);
  }

  getHotDealsToday(): Observable<IHotDealToday[]> {
    return of([]);
  }

  getMarketShare(category: string = 'all'): Observable<IMarketShare[]> {
    return of([]);
  }

  getProductStats(productId: string): Observable<IProductMarketStats | null> {
    return of(null);
  }

  getDailyPriceSummary(productId: string, days: number = 30): Observable<IDailyPriceSummary[]> {
    return of([]);
  }

  getStatisticalInsights(): Observable<IStatisticalInsight[]> {
    return of([]);
  }
}
