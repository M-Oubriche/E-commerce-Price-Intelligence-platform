import { Component, Input, ContentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { staggerFadeIn } from '../../animations/fade-in.animation';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="table-wrapper border-outline">
      <table class="data-table">
        <thead>
          <tr>
            <th *ngFor="let col of columns" class="type-label">{{ col.header }}</th>
          </tr>
        </thead>
        <tbody [@staggerFadeIn]="data.length">
          <tr *ngFor="let row of data" class="table-row">
            <td *ngFor="let col of columns" class="type-body tabular-numbers">
              <ng-container *ngIf="!col.template">
                {{ row[col.key] }}
              </ng-container>
              <ng-container *ngIf="col.template">
                <ng-container *ngTemplateOutlet="col.template; context: { $implicit: row }"></ng-container>
              </ng-container>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    @import 'src/app/styles/variables';

    .table-wrapper {
      width: 100%;
      overflow-x: auto;
      background: var(--color-bg-surface);
      border-radius: 0.5rem;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;

      th {
        padding: 0.75rem 1.5rem;
        border-bottom: 1px solid var(--color-border);
        background: var(--color-stone-light);
        position: sticky;
        top: 0;
        color: var(--color-ink-faint);
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      td {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--color-border);
        transition: background 0.2s;
        font-size: 0.875rem;
        color: var(--color-ink);
      }

      .table-row {
        &:hover {
          background: #fafafa;
        }
        &:last-child td {
          border-bottom: none;
        }
      }
    }
  `],
  animations: [staggerFadeIn]
})
export class DataTableComponent {
  @Input() data: any[] = [];
  @Input() columns: { key: string; header: string; template?: TemplateRef<any> }[] = [];
}
