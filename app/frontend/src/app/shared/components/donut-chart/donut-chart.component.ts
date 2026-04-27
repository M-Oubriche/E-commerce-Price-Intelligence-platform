import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="donut-container">
      <svg viewBox="0 0 100 100" class="donut-svg">
        <circle class="donut-track" cx="50" cy="50" r="40" fill="transparent" stroke-width="10" />
        <circle *ngFor="let seg of segments; let i = index"
          class="donut-segment"
          cx="50" cy="50" r="40"
          fill="transparent"
          [attr.stroke]="seg.color"
          stroke-width="10"
          [attr.stroke-dasharray]="seg.dashArray"
          [attr.stroke-dashoffset]="seg.dashOffset"
          [style.transition-delay.ms]="i * 100"
        />
        <text x="50" y="50" class="donut-center-text type-data" text-anchor="middle" dominant-baseline="middle">
          {{ centerText }}
        </text>
      </svg>
      <div class="donut-legend">
        <div *ngFor="let item of data" class="legend-item">
          <div class="dot" [style.background]="item.color"></div>
          <span class="type-label">{{ item.label }}</span>
          <span class="type-data">{{ item.value }}%</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @import 'src/app/styles/variables';
    .donut-container { display: flex; align-items: center; gap: 2.5rem; }
    .donut-svg { width: 120px; height: 120px; transform: rotate(-90deg); overflow: visible; }
    .donut-track { stroke: var(--color-border); }
    .donut-segment { 
      stroke-linecap: flat;
      transition: stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .donut-center-text { transform: rotate(90deg); transform-origin: center; font-size: 10px; fill: var(--color-ink-faint); font-weight: 700; }
    .donut-legend { display: flex; flex-direction: column; gap: 0.75rem; }
    .legend-item { display: flex; align-items: center; gap: 0.75rem; .type-label { font-size: 0.75rem; color: var(--color-ink-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; } .type-data { font-size: 0.875rem; font-weight: 600; color: var(--color-ink); } }
    .dot { width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 0 2px #fff; }
  `]
})
export class DonutChartComponent {
  @Input() data: { label: string; value: number; color: string }[] = [];
  @Input() centerText = '';

  get segments() {
    let totalOffset = 0;
    const circumference = 2 * Math.PI * 40;
    
    return this.data.map(item => {
      const segmentLength = (item.value / 100) * circumference;
      const dashArray = `${segmentLength} ${circumference - segmentLength}`;
      const dashOffset = -totalOffset;
      totalOffset += segmentLength;
      
      return {
        ...item,
        dashArray,
        dashOffset
      };
    });
  }
}
