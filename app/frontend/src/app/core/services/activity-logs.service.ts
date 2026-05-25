import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ActivityLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  log_metadata?: any;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ActivityLogsService {
  private readonly BASE = `${environment.apiUrl}/activity-logs`;

  constructor(private http: HttpClient) {}

  logProductView(productId: string, metadata: any): Observable<any> {
    return this.http.post(`${this.BASE}/`, {
      action: 'product_viewed',
      entity_type: 'product',
      entity_id: productId,
      log_metadata: metadata,
    });
  }

  getRecentlyViewed(): Observable<{ data: ActivityLogEntry[] }> {
    return this.http.get<{ data: ActivityLogEntry[] }>(`${this.BASE}/recently-viewed`);
  }
}
