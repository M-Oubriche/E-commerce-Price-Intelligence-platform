import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-radar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="radar-container">
      <svg [attr.viewBox]="'0 0 ' + size + ' ' + size" class="radar-svg">
        <!-- Background Polygons -->
        <polygon *ngFor="let level of [0.2, 0.4, 0.6, 0.8, 1]" 
          [attr.points]="getPolygonPoints(level)" 
          class="grid-line"
        />
        
        <!-- Axis Lines -->
        <line *ngFor="let axis of axes; let i = index"
          [attr.x1]="center" [attr.y1]="center"
          [attr.x2]="getAxisPoint(i).x" [attr.y2]="getAxisPoint(i).y"
          class="grid-line"
        />

        <!-- Data Polygon -->
        <polygon [attr.points]="getDataPoints()" class="data-poly" />
        
        <!-- Axis Labels -->
        <text *ngFor="let axis of axes; let i = index"
          [attr.x]="getLabelPoint(i).x" [attr.y]="getLabelPoint(i).y"
          class="type-label radar-label"
          [attr.text-anchor]="getLabelAnchor(i)"
        >
          {{ axis }}
        </text>
      </svg>
    </div>
  `,
  styles: [`
    @import 'src/app/styles/variables';
    .radar-container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .radar-svg { width: 100%; max-width: 400px; overflow: visible; }
    .grid-line { fill: none; stroke: var(--color-border); stroke-width: 1; }
    .data-poly { 
      fill: var(--color-accent-soft); 
      stroke: var(--color-accent); 
      stroke-width: 2; 
      opacity: 0;
      animation: fadeInPoly 1s forwards 0.5s;
    }
    .radar-label { font-size: 11px; fill: var(--color-ink-faint); font-weight: 700; }
    @keyframes fadeInPoly { from { opacity: 0; transform: scale(0.8); transform-origin: center; } to { opacity: 1; transform: scale(1); } }
  `]
})
export class RadarChartComponent {
  @Input() size = 300;
  @Input() axes: string[] = ['PRICE', 'VOLATILITY', 'DEMAND', 'STOCK', 'LIQUIDITY'];
  @Input() data: number[] = [0.8, 0.6, 0.9, 0.4, 0.7]; // Normalized 0-1

  center = 150;
  radius = 120;

  getPolygonPoints(scale: number): string {
    return this.axes.map((_, i) => {
      const angle = (Math.PI * 2 * i) / this.axes.length - Math.PI / 2;
      const x = this.center + Math.cos(angle) * this.radius * scale;
      const y = this.center + Math.sin(angle) * this.radius * scale;
      return `${x},${y}`;
    }).join(' ');
  }

  getAxisPoint(i: number) {
    const angle = (Math.PI * 2 * i) / this.axes.length - Math.PI / 2;
    return {
      x: this.center + Math.cos(angle) * this.radius,
      y: this.center + Math.sin(angle) * this.radius
    };
  }

  getDataPoints(): string {
    return this.data.map((val, i) => {
      const angle = (Math.PI * 2 * i) / this.axes.length - Math.PI / 2;
      const x = this.center + Math.cos(angle) * this.radius * val;
      const y = this.center + Math.sin(angle) * this.radius * val;
      return `${x},${y}`;
    }).join(' ');
  }

  getLabelPoint(i: number) {
    const angle = (Math.PI * 2 * i) / this.axes.length - Math.PI / 2;
    return {
      x: this.center + Math.cos(angle) * (this.radius + 20),
      y: this.center + Math.sin(angle) * (this.radius + 20)
    };
  }

  getLabelAnchor(i: number): string {
    const angle = (Math.PI * 2 * i) / this.axes.length - Math.PI / 2;
    const x = Math.cos(angle);
    if (Math.abs(x) < 0.1) return 'middle';
    return x > 0 ? 'start' : 'end';
  }
}
