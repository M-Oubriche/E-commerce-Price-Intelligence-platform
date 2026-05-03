import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  private handleRequest<T>(request: Observable<T>): Observable<T> {
    return request.pipe(
      catchError(err => this.authService.handleHttpError(err, request))
    );
  }

  // --- Watchlist ---

  getWatchlist(): Observable<WatchlistItem[]> {
    const req = this.http.get<ApiResponse<WatchlistItem[]>>(this.WATCHLIST_URL, { headers: this.getHeaders() });
    return this.handleRequest(req).pipe(map(res => res.data));
  }

  addToWatchlist(item: Partial<WatchlistItem>): Observable<WatchlistItem> {
    const req = this.http.post<ApiResponse<WatchlistItem>>(this.WATCHLIST_URL, item, { headers: this.getHeaders() });
    return this.handleRequest(req).pipe(map(res => res.data));
  }

  updateWatchlistItem(id: string, updates: Partial<WatchlistItem>): Observable<WatchlistItem> {
    const req = this.http.patch<ApiResponse<WatchlistItem>>(`${this.WATCHLIST_URL}/${id}`, updates, { headers: this.getHeaders() });
    return this.handleRequest(req).pipe(map(res => res.data));
  }

  removeFromWatchlist(id: string): Observable<void> {
    const req = this.http.delete<void>(`${this.WATCHLIST_URL}/${id}`, { headers: this.getHeaders() });
    return this.handleRequest(req);
  }

  // --- Shopper Alerts ---

  getAlerts(): Observable<ShopperAlert[]> {
    const req = this.http.get<ApiResponse<ShopperAlert[]>>(this.ALERTS_URL, { headers: this.getHeaders() });
    return this.handleRequest(req).pipe(map(res => res.data));
  }

  getAlert(id: string): Observable<ShopperAlert> {
    const req = this.http.get<ApiResponse<ShopperAlert>>(`${this.ALERTS_URL}/${id}`, { headers: this.getHeaders() });
    return this.handleRequest(req).pipe(map(res => res.data));
  }

  pauseAlert(id: string): Observable<ShopperAlert> {
    const req = this.http.patch<ApiResponse<ShopperAlert>>(`${this.ALERTS_URL}/${id}/pause`, {}, { headers: this.getHeaders() });
    return this.handleRequest(req).pipe(map(res => res.data));
  }

  resumeAlert(id: string): Observable<ShopperAlert> {
    const req = this.http.patch<ApiResponse<ShopperAlert>>(`${this.ALERTS_URL}/${id}/resume`, {}, { headers: this.getHeaders() });
    return this.handleRequest(req).pipe(map(res => res.data));
  }
}
