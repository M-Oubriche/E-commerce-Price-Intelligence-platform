import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';

export interface ToastAction {
  label: string;
  link?: string;
  queryParams?: any;
}

export interface Toast {
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  id: number;
  action?: ToastAction;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.toastsSubject.asObservable();
  private counter = 0;

  constructor(private router: Router) {}

  show(message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success', action?: ToastAction) {
    const id = this.counter++;
    const toast: Toast = { message, type, id, action };
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

    setTimeout(() => {
      this.remove(id);
    }, action ? 5000 : 3000); // give more time if there's an action
  }

  remove(id: number) {
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter(t => t.id !== id));
  }

  handleAction(toast: Toast) {
    if (toast.action?.link) {
      this.router.navigate([toast.action.link], { queryParams: toast.action.queryParams });
    }
    this.remove(toast.id);
  }
}
