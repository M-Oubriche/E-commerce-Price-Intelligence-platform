import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button class="theme-btn" (click)="themeService.toggle()" [title]="(themeService.isDark$ | async) ? 'Switch to light mode' : 'Switch to dark mode'">
      <svg *ngIf="themeService.isDark$ | async" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
      <svg *ngIf="!(themeService.isDark$ | async)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    </button>
  `,
  styles: [`
    .theme-btn {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
      padding: 0;

      svg {
        width: 16px;
        height: 16px;
        color: #94A3B8;
        transition: color 0.2s ease;
      }

      &:hover {
        border-color: rgba(255,255,255,0.3);
        background: rgba(255,255,255,0.05);
        svg { color: #F1F5F9; }
      }
    }

    :host-context([data-theme="light"]) .theme-btn {
      border-color: rgba(0,0,0,0.12);
      background: transparent;
      svg { color: #475569; }
      &:hover {
        border-color: rgba(0,0,0,0.25);
        background: rgba(0,0,0,0.04);
        svg { color: #0F172A; }
      }
    }
  `]
})
export class ThemeToggleComponent {
  constructor(public themeService: ThemeService) {}
}
