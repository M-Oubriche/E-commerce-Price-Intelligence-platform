import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PriceIntelligenceService } from '../../../core/services/price-intelligence.service';
import { ILiveTickerFeed } from '../../../core/models/market-intelligence.model';

@Component({
  selector: 'app-price-ticker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ticker-wrapper border-bottom">
      <div class="ticker-content">
        <!-- Duplicate list for seamless infinite scroll -->
        <div class="ticker-track" *ngIf="tickerItems.length > 0">
          <div class="ticker-item" *ngFor="let item of tickerItems">
            <span class="type-label item-name">{{ item.shortName }} ({{ item.platform.toUpperCase() }})</span>
            <span class="type-data item-price">$ {{ item.currentPrice | number:'1.2-2' }}</span>
            <span class="type-label item-delta" [ngClass]="item.changeDirection.toLowerCase()">
              {{ item.changePct > 0 ? '+' : '' }}{{ item.changePct }}%
            </span>
          </div>
          <!-- Second set for seamless loop -->
          <div class="ticker-item" *ngFor="let item of tickerItems">
            <span class="type-label item-name">{{ item.shortName }} ({{ item.platform.toUpperCase() }})</span>
            <span class="type-data item-price">$ {{ item.currentPrice | number:'1.2-2' }}</span>
            <span class="type-label item-delta" [ngClass]="item.changeDirection.toLowerCase()">
              {{ item.changePct > 0 ? '+' : '' }}{{ item.changePct }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @import 'src/app/styles/variables';

    .ticker-wrapper {
      background: var(--color-bg-surface);
      height: 48px;
      overflow: hidden;
      display: flex;
      align-items: center;
      border-bottom: 1px solid var(--color-border);
      border-top: 1px solid var(--color-border);
    }

    .ticker-content {
      width: 100%;
      overflow: hidden;
    }

    .ticker-track {
      display: flex;
      width: max-content;
      animation: scrollTicker 40s linear infinite;
      
      &:hover {
        animation-play-state: paused;
      }
    }

    .ticker-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0 2rem;
      border-right: 1px solid var(--color-border);
    }

    .item-name { color: var(--color-ink-muted); font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;}
    .item-price { font-weight: 600; font-size: 0.875rem; color: var(--color-ink); font-variant-numeric: tabular-nums; }
    
    .item-delta {
      font-weight: 700;
      font-size: 0.75rem;
      &.up { color: #ef4444; }
      &.down { color: #10b981; }
      &.flat { color: #d97706; }
    }

    @keyframes scrollTicker {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
  `]
})
export class PriceTickerComponent implements OnInit {
  tickerItems: ILiveTickerFeed[] = [];

  constructor(private priceIntelligence: PriceIntelligenceService) {}

  ngOnInit() {
    this.priceIntelligence.getLiveTickerFeed().subscribe(items => {
      this.tickerItems = items;
    });
  }
}
