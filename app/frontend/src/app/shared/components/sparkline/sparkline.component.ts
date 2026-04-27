import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg 
      [attr.viewBox]="'0 0 ' + width + ' ' + height" 
      class="sparkline" 
      [style.width.px]="width" 
      [style.height.px]="height"
    >
      <path 
        [attr.d]="pathData" 
        fill="none" 
        [attr.stroke]="color" 
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,
  styles: [`
    .sparkline {
      display: block;
      overflow: visible;
    }
  `]
})
export class SparklineComponent {
  @Input() data: number[] = [];
  @Input() width = 80;
  @Input() height = 24;
  @Input() color = 'var(--color-accent)';

  get pathData(): string {
    if (!this.data || this.data.length < 2) return '';
    
    const min = Math.min(...this.data);
    const max = Math.max(...this.data);
    const range = max - min || 1;
    
    const points = this.data.map((val, idx) => {
      const x = (idx / (this.data.length - 1)) * this.width;
      const y = this.height - ((val - min) / range) * this.height;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  }
}
