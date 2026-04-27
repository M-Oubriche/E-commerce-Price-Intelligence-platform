import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-pill',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span 
      class="pill type-label" 
      [ngClass]="'pill--' + variant"
    >
      <ng-content></ng-content>
    </span>
  `,
  styles: [`
    @import 'src/app/styles/variables';

    .pill {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.5rem;
      border: 1px solid currentColor;
      border-radius: 9999px;
      white-space: nowrap;
      transition: all 0.2s;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .pill--neutral {
      border-color: var(--border);
      color: var(--text-muted);
      background: var(--bg-secondary);
    }

    .pill--buyer {
      border-color: transparent;
      color: var(--accent-blue);
      background: rgba(59, 130, 246, 0.1);
    }

    .pill--seller {
      border-color: transparent;
      color: var(--accent-green);
      background: rgba(16, 185, 129, 0.1);
    }

    .pill--error {
      border-color: transparent;
      color: var(--accent-red);
      background: rgba(239, 68, 68, 0.1);
    }
  `]
})
export class StatusPillComponent {
  @Input() variant: 'neutral' | 'buyer' | 'seller' | 'error' = 'neutral';
}
