import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface Notification {
  id: string;
  alert_event_id: number;
  product_name: string;
  old_price: number;
  new_price: number;
  drop_percent: number;
  platform: string;
  channel: string;
  status: string;
  is_read: boolean;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/notifications`;

  getNotifications(): Observable<Notification[]> {
    return this.http.get<ApiResponse<Notification[]>>(this.API_URL).pipe(
      map(res => res.data)
    );
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<ApiResponse<{count: number}>>(`${this.API_URL}/unread-count`).pipe(
      map(res => res.data.count)
    );
  }

  markAsRead(id: string): Observable<void> {
    return this.http.patch<void>(`${this.API_URL}/${id}/read`, {}).pipe(
      map(() => undefined)
    );
  }

  dismissNotification(id: string): Observable<void> {
    return this.http.patch<void>(`${this.API_URL}/${id}/dismiss`, {}).pipe(
      map(() => undefined)
    );
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/mark-all-read`, {}).pipe(
      map(() => undefined)
    );
  }

  dismissAll(): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/dismiss-all`, {}).pipe(
      map(() => undefined)
    );
  }
}
