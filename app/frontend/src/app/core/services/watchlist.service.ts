import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiResponse } from '../models/api-response.model';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface WatchlistItem {
  id: string;
  product_name: string;
  category: string;
  image_url: string;
  original_price: number;
  current_price: number;
  target_price: number;
  alert_condition: string;
  platform: string;
  shopper_alerts?: ShopperAlert[];
}

export interface ShopperAlert {
  id: string;
  watchlist_item_id: string;
  condition_type: string;
  target_value: number;
  progress_pct: number;
  status: 'active' | 'paused' | 'triggered';
}

@Injectable({
  providedIn: 'root'
})
export class WatchlistService {
  private readonly WATCHLIST_URL = `${environment.apiUrl}/watchlist`;
  private readonly ALERTS_URL = `${environment.apiUrl}/shopper-alerts`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private handleRequest<T>(requestFn: () => Observable<T>): Observable<T> {
    return requestFn().pipe(
      catchError(err => this.authService.handleHttpError(err, requestFn()))
    );
  }

  // --- Watchlist ---

  getWatchlist(): Observable<WatchlistItem[]> {
    return this.handleRequest(() => this.http.get<ApiResponse<WatchlistItem[]>>(this.WATCHLIST_URL))
      .pipe(map(res => res.data));
  }

  addToWatchlist(item: Partial<WatchlistItem>): Observable<WatchlistItem> {
    return this.handleRequest(() => this.http.post<ApiResponse<WatchlistItem>>(this.WATCHLIST_URL, item))
      .pipe(map(res => res.data));
  }

  updateWatchlistItem(id: string, updates: Partial<WatchlistItem>): Observable<WatchlistItem> {
    return this.handleRequest(() => this.http.patch<ApiResponse<WatchlistItem>>(`${this.WATCHLIST_URL}/${id}`, updates))
      .pipe(map(res => res.data));
  }

  removeFromWatchlist(id: string): Observable<void> {
    return this.handleRequest(() => this.http.delete<void>(`${this.WATCHLIST_URL}/${id}`));
  }

  // --- Shopper Alerts ---

  getAlerts(): Observable<ShopperAlert[]> {
    return this.handleRequest(() => this.http.get<ApiResponse<ShopperAlert[]>>(this.ALERTS_URL))
      .pipe(map(res => res.data));
  }

  getAlert(id: string): Observable<ShopperAlert> {
    return this.handleRequest(() => this.http.get<ApiResponse<ShopperAlert>>(`${this.ALERTS_URL}/${id}`))
      .pipe(map(res => res.data));
  }

  pauseAlert(id: string): Observable<ShopperAlert> {
    return this.handleRequest(() => this.http.patch<ApiResponse<ShopperAlert>>(`${this.ALERTS_URL}/${id}/pause`, {}))
      .pipe(map(res => res.data));
  }

  resumeAlert(id: string): Observable<ShopperAlert> {
    return this.handleRequest(() => this.http.patch<ApiResponse<ShopperAlert>>(`${this.ALERTS_URL}/${id}/resume`, {}))
      .pipe(map(res => res.data));
  }
}
