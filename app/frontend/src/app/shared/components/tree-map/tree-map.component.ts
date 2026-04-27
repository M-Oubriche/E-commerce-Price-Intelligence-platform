import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface TreeItem {
  name: string;
  value: number;
  color?: string;
}

@Component({
  selector: 'app-tree-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="treemap-container border-outline">
      <div *ngFor="let item of layoutItems" 
        class="treemap-item border-outline"
        [style.left.%]="item.x"
        [style.top.%]="item.y"
        [style.width.%]="item.w"
        [style.height.%]="item.h"
        [style.background]="item.color || 'var(--color-accent-soft)'"
      >
        <span class="type-label item-name">{{ item.name }}</span>
        <span class="type-data item-value">{{ item.value }}%</span>
      </div>
    </div>
  `,
  styles: [`
    @import 'src/app/styles/variables';
    .treemap-container { position: relative; width: 100%; height: 300px; background: var(--color-stone-light); overflow: hidden; border: 1px solid var(--color-border); border-radius: 0.5rem; }
    .treemap-item { 
      position: absolute; 
      display: flex; 
      flex-direction: column; 
      padding: 1rem; 
      gap: 0.25rem;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid var(--color-border);
      &:hover { filter: brightness(0.95); z-index: 10; }
    }
    .item-name { font-size: 0.65rem; color: var(--color-ink-muted); font-weight: 700; letter-spacing: 0.05em; }
    .item-value { font-size: 1rem; color: var(--color-ink); font-weight: 700; }
  `]
})
export class TreeMapComponent {
  @Input() data: TreeItem[] = [];

  get layoutItems() {
    // Simple Squarified-ish algorithm for 2x2 or similar layouts
    // This is a simplified version for demonstration
    const total = this.data.reduce((sum, item) => sum + item.value, 0);
    let currentX = 0;
    let currentY = 0;
    
    // Split into two columns for simplicity in this prototype
    const mid = Math.ceil(this.data.length / 2);
    const leftCol = this.data.slice(0, mid);
    const rightCol = this.data.slice(mid);
    
    const leftWeight = leftCol.reduce((sum, i) => sum + i.value, 0) / total;
    const items: any[] = [];

    // Left Column
    let y = 0;
    leftCol.forEach(item => {
      const h = (item.value / (total * leftWeight)) * 100;
      items.push({ ...item, x: 0, y, w: leftWeight * 100, h });
      y += h;
    });

    // Right Column
    y = 0;
    rightCol.forEach(item => {
      const h = (item.value / (total * (1 - leftWeight))) * 100;
      items.push({ ...item, x: leftWeight * 100, y, w: (1 - leftWeight) * 100, h });
      y += h;
    });

    return items;
  }
}
