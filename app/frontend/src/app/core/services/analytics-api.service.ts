import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DealAnalysisRow,
  PriceDropRow,
  CategoryTrendRow,
  PlatformPerformanceRow,
  MarketKpis,
  PlatformCategoryAvgRow,
  ShopperInsightRow,
  ProductCorrelationRow
} from '../models/analytics-api.model';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsApiService {
  private readonly BASE = `${environment.apiUrl}/analytics`;

  constructor(private http: HttpClient) {}

  getDealAnalysis(daysBack?: number): Observable<DealAnalysisRow[]> {
    const params = daysBack ? `?days_back=${daysBack}` : '';
    return this.http.get<DealAnalysisRow[]>(`${this.BASE}/deal-analysis${params}`);
  }

  getPriceDrops(): Observable<PriceDropRow[]> {
    return this.http.get<PriceDropRow[]>(`${this.BASE}/price-drops`);
  }

  getCategoryTrends(daysBack?: number): Observable<CategoryTrendRow[]> {
    const params = daysBack ? `?days_back=${daysBack}` : '';
    return this.http.get<CategoryTrendRow[]>(`${this.BASE}/trends${params}`);
  }

  getFlashDeals(): Observable<DealAnalysisRow[]> {
    return this.http.get<DealAnalysisRow[]>(`${this.BASE}/flash-deals`);
  }

  getTrendingDeals(): Observable<DealAnalysisRow[]> {
    return this.http.get<DealAnalysisRow[]>(`${this.BASE}/trending`);
  }

  getPlatformPerformance(daysBack?: number): Observable<PlatformPerformanceRow[]> {
    const params = daysBack ? `?days_back=${daysBack}` : '';
    return this.http.get<PlatformPerformanceRow[]>(`${this.BASE}/platform-performance${params}`);
  }

  getKpis(daysBack?: number): Observable<MarketKpis[]> {
    const params = daysBack ? `?days_back=${daysBack}` : '';
    return this.http.get<MarketKpis[]>(`${this.BASE}/kpis${params}`);
  }

  getPlatformCategoryAvg(daysBack?: number): Observable<PlatformCategoryAvgRow[]> {
    const params = daysBack ? `?days_back=${daysBack}` : '';
    return this.http.get<PlatformCategoryAvgRow[]>(`${this.BASE}/platform-category-avg${params}`);
  }

  getShopperInsights(): Observable<ShopperInsightRow[]> {
    return this.http.get<ShopperInsightRow[]>(`${this.BASE}/shopper-insights`);
  }

  getProductCorrelation(daysBack?: number): Observable<ProductCorrelationRow[]> {
    const params = daysBack ? `?days_back=${daysBack}` : '';
    return this.http.get<ProductCorrelationRow[]>(`${this.BASE}/product-correlation${params}`);
  }

  getProductDetail(id: string): Observable<DealAnalysisRow[]> {
    return this.http.get<DealAnalysisRow[]>(`${this.BASE}/product-by-id?product_id=${encodeURIComponent(id)}`);
  }

  getProductHistory(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/product-by-id/history?product_id=${encodeURIComponent(id)}`);
  }

  getSimilarProducts(id: string): Observable<DealAnalysisRow[]> {
    return this.http.get<DealAnalysisRow[]>(`${this.BASE}/product-by-id/similar?product_id=${encodeURIComponent(id)}`);
  }

  searchProducts(q: string, category?: string): Observable<DealAnalysisRow[]> {
    let url = `${this.BASE}/search?q=${encodeURIComponent(q)}`;
    if (category) {
      url += `&category=${encodeURIComponent(category)}`;
    }
    return this.http.get<DealAnalysisRow[]>(url);
  }

  getAdvancedStats(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/advanced-stats`);
  }
}
