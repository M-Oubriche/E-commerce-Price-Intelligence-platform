import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../models/api-response.model';
import { environment } from '../../../environments/environment';

export interface AlertPreferences {
  price_drop_alerts: boolean;
  market_trend_reports: boolean;
  price_rise_warnings: boolean;
  new_deals: boolean;
  websocket_live: boolean;
  email_notifications: boolean;
  updated_at: string;
}

export interface DisplayPreferences {
  theme: string;
  compact_density: boolean;
  animations_enabled: boolean;
  show_ticker: boolean;
  language: string;
  currency: string;
  timezone: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class PreferencesService {
  private readonly API_URL = `${environment.apiUrl}/preferences`;

  constructor(private http: HttpClient) {}

  getAlertPreferences(): Observable<AlertPreferences> {
    return this.http.get<ApiResponse<AlertPreferences>>(`${this.API_URL}/alerts`).pipe(
      map(res => res.data)
    );
  }

  updateAlertPreferences(prefs: Partial<AlertPreferences>): Observable<AlertPreferences> {
    return this.http.patch<ApiResponse<AlertPreferences>>(`${this.API_URL}/alerts`, prefs).pipe(
      map(res => res.data)
    );
  }

  getDisplayPreferences(): Observable<DisplayPreferences> {
    return this.http.get<ApiResponse<DisplayPreferences>>(`${this.API_URL}/display`).pipe(
      map(res => res.data)
    );
  }

  updateDisplayPreferences(prefs: Partial<DisplayPreferences>): Observable<DisplayPreferences> {
    return this.http.patch<ApiResponse<DisplayPreferences>>(`${this.API_URL}/display`, prefs).pipe(
      map(res => res.data)
    );
  }
}
