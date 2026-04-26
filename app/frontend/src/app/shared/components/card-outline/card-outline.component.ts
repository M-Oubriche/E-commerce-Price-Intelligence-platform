import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { fadeInEntry } from '../../animations/fade-in.animation';

@Component({
  selector: 'app-card-outline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="card-container border-outline" 
      [@fadeInEntry]
      [ngClass]="{ 'card--interactive': interactive }"
    >
      <div class="card-header" *ngIf="title">
        <span class="type-label">{{ title }}</span>
      </div>
      <div class="card-content">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    @import 'src/app/styles/variables';

    :host {
      display: block;
    }

    .card-container {
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 1.5rem;
      border-radius: 0.75rem;
      height: 100%;
      position: relative;
      transition: all 0.2s;
      box-shadow: var(--shadow-card);
    }

    .card-header {
      margin-bottom: 1.5rem;
      .type-label { 
        color: var(--text-muted); 
        font-size: 0.75rem; 
        font-weight: 700; 
        text-transform: uppercase; 
        letter-spacing: 0.05em; 
      }
    }

    .card--interactive {
      cursor: pointer;
      &:hover {
        border-color: var(--border-mid);
        transform: translateY(-2px);
        box-shadow: var(--shadow-hover);
      }
      &:active {
        transform: scale(0.99);
      }
    }

    .card-content {
      // Content-specific layout handled by consumer
    }
  `],
  animations: [fadeInEntry]
})
export class CardOutlineComponent {
  @Input() title?: string;
  @Input() interactive = false;
}
