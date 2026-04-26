import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface INotification {
  id: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'ALERT';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly notifications$ = new BehaviorSubject<INotification[]>([]);

  get notifications(): Observable<INotification[]> {
    return this.notifications$.asObservable();
  }

  show(message: string, type: 'INFO' | 'SUCCESS' | 'ALERT' = 'INFO') {
    const notification: INotification = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: new Date()
    };
    
    const current = this.notifications$.value;
    this.notifications$.next([notification, ...current]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      this.dismiss(notification.id);
    }, 5000);
  }

  dismiss(id: string) {
    const current = this.notifications$.value;
    this.notifications$.next(current.filter(n => n.id !== id));
  }
}
