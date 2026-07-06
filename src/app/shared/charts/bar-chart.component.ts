import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ChartDatum {
  label: string;
  value: number;
  color: string; // hex or css color
}

/**
 * Lightweight horizontal bar chart — no charting library required.
 * Used for breakdowns like "bookings by status".
 */
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-3.5">
      <div *ngFor="let d of data" class="flex items-center gap-3">
        <span class="w-28 shrink-0 text-body-md text-on-surface-variant truncate">{{ d.label }}</span>
        <div class="flex-1 h-2.5 bg-surface-container rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-700 ease-out"
            [style.width.%]="percent(d.value)"
            [style.background]="d.color"
          ></div>
        </div>
        <span class="w-6 text-right text-label-md font-label-md text-on-surface">{{ d.value }}</span>
      </div>
      <div *ngIf="!data.length" class="text-body-md text-on-surface-variant text-center py-4">Chưa có dữ liệu.</div>
    </div>
  `,
})
export class BarChartComponent {
  @Input() data: ChartDatum[] = [];

  get max(): number {
    return Math.max(1, ...this.data.map((d) => d.value), 0);
  }

  percent(v: number): number {
    return this.max === 0 ? 0 : Math.round((v / this.max) * 100);
  }
}
