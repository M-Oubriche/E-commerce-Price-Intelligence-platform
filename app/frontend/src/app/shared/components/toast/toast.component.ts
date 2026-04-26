import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../core/services/toast.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div 
        *ngFor="let toast of (toastService.toasts$ | async)" 
        class="toast-item" 
        [ngClass]="'toast-' + toast.type"
        [@toastAnimation]
      >
        <div class="toast-content">
          <p>{{ toast.message }}</p>
          <button *ngIf="toast.action" class="toast-action-btn" (click)="toastService.handleAction(toast)">
            {{ toast.action.label }}
          </button>
        </div>
        <button (click)="toastService.remove(toast.id)" class="close-btn">&times;</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      z-index: 2000;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      pointer-events: none;
    }

    .toast-item {
      pointer-events: auto;
      background: #1A2235;
      color: #FFF;
      padding: 1rem 1.5rem;
      min-width: 300px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #1E293B;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      border-left: 4px solid #3B82F6;
    }

    .toast-success { border-left-color: #10B981; }
    .toast-warning { border-left-color: #F59E0B; }
    .toast-error { border-left-color: #EF4444; }
    .toast-info { border-left-color: #3B82F6; }

    .toast-content {
      display: flex;
      align-items: center;
      gap: 1rem;
      p { margin: 0; font-size: 0.9rem; font-weight: 500; }
    }

    .toast-action-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #FFF;
      padding: 0.25rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;
      &:hover { background: rgba(255, 255, 255, 0.2); }
    }

    .close-btn {
      background: transparent;
      border: none;
      color: rgba(255,255,255,0.4);
      font-size: 1.5rem;
      cursor: pointer;
      line-height: 1;
      padding: 0 0 0 1rem;
      &:hover { color: #FFF; }
    }
  `],
  animations: [
    trigger('toastAnimation', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('400ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class ToastComponent {
  toastService = inject(ToastService);
}
