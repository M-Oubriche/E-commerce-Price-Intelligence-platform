import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

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
    return of(data).pipe(delay(850));
  }

  getSalesPerformance(): Observable<{ month: string; sales: number }[]> {
    const data = [
      { month: 'Jan', sales: 12400 },
      { month: 'Feb', sales: 15600 },
      { month: 'Mar', sales: 14200 },
      { month: 'Apr', sales: 18900 }
    ];
    return of(data).pipe(delay(900));
  }
}
