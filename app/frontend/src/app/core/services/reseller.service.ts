import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { AuthService } from './auth.service';

export interface SellerProduct {
  id: string;
  product_id?: string;
  product_name: string;
  emoji_icon?: string;
  category?: string;
  my_price: number;
  price_when_added: number;
  cached_lowest_comp_price?: number;
  cached_market_visibility_pct?: number;
  min_price_floor?: number;
  max_price_ceiling?: number;
  platform?: string;
  status: 'active' | 'paused' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface PriceHistory {
  id: string;
  seller_product_id: string;
  old_price: number;
  new_price: number;
  recorded_at: string;
}

export interface PriceAlert {
  id: string;
  seller_product_id?: string;
  trigger_mode: string;
  target_margin_pct?: number;
  threshold_value?: number;
  threshold_type: 'ABSOLUTE' | 'PERCENT';
  priority: 'High' | 'Medium' | 'Low';
  risk_level?: string;
  is_active: boolean;
  last_triggered_at?: string;
  created_at: string;
}

export interface TrackedCompetitor {
  id: string;
  seller_id: string;
  seller_name: string;
  domain?: string;
  platform?: string;
  aggressiveness: 'High' | 'Medium' | 'Low';
  aggressiveness_description?: string;
  competitiveness: number;
  competitiveness_trend: number;
  spark_color: string;
  last_enriched_at?: string;
  is_active: boolean;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class ResellerService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly BASE_URL = `${environment.apiUrl}/reseller`;

  private handleRequest<T>(requestFn: () => Observable<T>): Observable<T> {
    return requestFn().pipe(
      catchError(err => this.authService.handleHttpError(err, requestFn()))
    );
  }

  // --- Products ---

  getProducts(): Observable<SellerProduct[]> {
    return this.handleRequest(() => this.http.get<ApiResponse<SellerProduct[]>>(`${this.BASE_URL}/products`))
      .pipe(map(res => res.data));
  }

  createProduct(product: Partial<SellerProduct>): Observable<SellerProduct> {
    return this.handleRequest(() => this.http.post<ApiResponse<SellerProduct>>(`${this.BASE_URL}/products`, product))
      .pipe(map(res => res.data));
  }

  updateProduct(id: string, updates: Partial<SellerProduct>): Observable<SellerProduct> {
    return this.handleRequest(() => this.http.patch<ApiResponse<SellerProduct>>(`${this.BASE_URL}/products/${id}`, updates))
      .pipe(map(res => res.data));
  }

  deleteProduct(id: string): Observable<void> {
    return this.handleRequest(() => this.http.delete<void>(`${this.BASE_URL}/products/${id}`));
  }

  getProductHistory(id: string): Observable<PriceHistory[]> {
    return this.handleRequest(() => this.http.get<ApiResponse<PriceHistory[]>>(`${this.BASE_URL}/products/${id}/history`))
      .pipe(map(res => res.data));
  }

  // --- Alerts ---

  getAlerts(): Observable<PriceAlert[]> {
    return this.handleRequest(() => this.http.get<ApiResponse<PriceAlert[]>>(`${this.BASE_URL}/alerts`))
      .pipe(map(res => res.data));
  }

  createAlert(alert: Partial<PriceAlert>): Observable<PriceAlert> {
    return this.handleRequest(() => this.http.post<ApiResponse<PriceAlert>>(`${this.BASE_URL}/alerts`, alert))
      .pipe(map(res => res.data));
  }

  updateAlert(id: string, updates: Partial<PriceAlert>): Observable<PriceAlert> {
    return this.handleRequest(() => this.http.patch<ApiResponse<PriceAlert>>(`${this.BASE_URL}/alerts/${id}`, updates))
      .pipe(map(res => res.data));
  }

  deleteAlert(id: string): Observable<void> {
    return this.handleRequest(() => this.http.delete<void>(`${this.BASE_URL}/alerts/${id}`));
  }

  // --- Competitors ---

  getCompetitors(): Observable<TrackedCompetitor[]> {
    return this.handleRequest(() => this.http.get<ApiResponse<TrackedCompetitor[]>>(`${this.BASE_URL}/competitors`))
      .pipe(map(res => res.data));
  }

  createCompetitor(competitor: Partial<TrackedCompetitor>): Observable<TrackedCompetitor> {
    return this.handleRequest(() => this.http.post<ApiResponse<TrackedCompetitor>>(`${this.BASE_URL}/competitors`, competitor))
      .pipe(map(res => res.data));
  }

  deleteCompetitor(id: string): Observable<void> {
    return this.handleRequest(() => this.http.delete<void>(`${this.BASE_URL}/competitors/${id}`));
  }
}
