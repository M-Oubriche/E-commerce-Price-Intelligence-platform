import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overlay" *ngIf="isOpen" (click)="close.emit()"></div>
    <aside class="notification-sidebar border-outline" [@slideInOut] *ngIf="isOpen">
      <header class="sidebar-header border-bottom">
        <span class="type-label">RECENT ACTIVITY</span>
        <button (click)="close.emit()" class="close-btn">&times;</button>
      </header>

      <div class="notification-list">
        <div *ngFor="let note of notes" class="note-item border-bottom">
          <div class="note-meta">
            <span class="type-label">{{ note.category }}</span>
            <span class="type-label time">{{ note.time }}</span>
          </div>
          <p class="type-body note-msg">
            <span class="highlight">{{ note.product }}</span> {{ note.message }}
          </p>
        </div>
      </div>

      <footer class="sidebar-footer">
        <button class="clear-btn type-label">CLEAR ALL</button>
      </footer>
    </aside>
  `,
  styles: [`
    @import 'src/app/styles/variables';

    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(10, 10, 11, 0.4);
      backdrop-filter: blur(4px);
      z-index: 90;
    }

    .notification-sidebar {
      position: fixed;
      top: 0;
      right: 0;
      width: 380px;
      height: 100vh;
      background: var(--color-bg-surface);
      z-index: 100;
      display: flex;
      flex-direction: column;
      border-left: 1px solid var(--color-border);
      box-shadow: -10px 0 25px rgba(0,0,0,0.05);
    }

    .sidebar-header {
      padding: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--color-border);
      
      .type-label { font-size: 0.875rem; font-weight: 700; color: var(--color-ink); text-transform: uppercase; letter-spacing: 0.05em; }
    }

    .close-btn {
      background: transparent;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: var(--color-ink-faint);
      &:hover { color: var(--color-ink); }
    }

    .notification-list {
      flex: 1;
      overflow-y: auto;
    }

    .note-item {
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      transition: background 0.2s;
      border-bottom: 1px solid var(--color-border);
      
      &:hover { background: #fafafa; }
    }

    .note-meta {
      display: flex;
      justify-content: space-between;
      .type-label { font-size: 0.65rem; font-weight: 700; color: var(--color-accent); text-transform: uppercase; letter-spacing: 0.05em;}
      .time { color: var(--color-ink-faint); font-weight: 500;}
    }

    .note-msg {
      margin: 0;
      line-height: 1.5;
      font-size: 0.875rem;
      color: var(--color-ink-muted);
      .highlight { font-weight: 600; color: var(--color-ink); }
    }

    .sidebar-footer {
      padding: 1.5rem;
      border-top: 1px solid var(--color-border);
      display: flex;
      justify-content: center;
    }

    .clear-btn {
      background: transparent;
      border: none;
      color: var(--color-ink-faint);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      cursor: pointer;
      &:hover { color: #ef4444; }
    }
  `],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('400ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('400ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateX(100%)' }))
      ])
    ])
  ]
})
export class NotificationCenterComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  notes = [
    { product: 'RTX 4090 Founders Edition', message: 'dropped 5% at UltraHardware', category: 'PRICE ALERT', time: '2 mins ago' },
    { product: 'Ryzen 9 7950X3D', message: 'is now back in stock at Nexus', category: 'STOCK ALERT', time: '14 mins ago' },
    { product: 'Samsung 990 Pro 2TB', message: 'hit your target price of $165', category: 'TARGET HIT', time: '1 hour ago' },
    { product: 'DDR5 Memory Prices', message: 'are trending down by 8%', category: 'MARKET TREND', time: '3 hours ago' },
  ];
}
