import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class MarketAnalyticsService {
  getMarketShareData(): Observable<{ label: string; value: number }[]> {
    const data = [
      { label: 'Retail Corp', value: 35 },
      { label: 'Wholesale Direct', value: 28 },
      { label: 'Indie Suppliers', value: 22 },
      { label: 'Others', value: 15 }
    ];
    return of({ data } as ApiResponse<{ label: string; value: number }[]>).pipe(
      delay(850),
      map(res => res.data)
    );
  }

  getSalesPerformance(): Observable<{ month: string; sales: number }[]> {
    const data = [
      { month: 'Jan', sales: 12400 },
      { month: 'Feb', sales: 15600 },
      { month: 'Mar', sales: 14200 },
      { month: 'Apr', sales: 18900 }
    ];
    return of({ data } as ApiResponse<{ month: string; sales: number }[]>).pipe(
      delay(900),
      map(res => res.data)
    );
  }
}
