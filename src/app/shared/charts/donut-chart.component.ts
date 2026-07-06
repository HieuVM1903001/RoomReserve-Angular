import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Lightweight SVG ring/donut chart — no charting library required.
 * Used for single-value percentage metrics (e.g. room utilization).
 */
@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-flex items-center justify-center">
      <svg [attr.viewBox]="'0 0 ' + size + ' ' + size" [style.width.px]="size" [style.height.px]="size" class="-rotate-90">
        <circle
          [attr.cx]="size / 2"
          [attr.cy]="size / 2"
          [attr.r]="radius"
          fill="none"
          [attr.stroke]="trackColor"
          [attr.stroke-width]="strokeWidth"
        />
        <circle
          [attr.cx]="size / 2"
          [attr.cy]="size / 2"
          [attr.r]="radius"
          fill="none"
          [attr.stroke]="color"
          [attr.stroke-width]="strokeWidth"
          stroke-linecap="round"
          [attr.stroke-dasharray]="circumference"
          [attr.stroke-dashoffset]="dashOffset"
          style="transition: stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="font-headline-sm text-headline-sm text-on-surface leading-none">{{ round(percent) }}%</span>
        <span *ngIf="label" class="text-[10px] text-on-surface-variant mt-1 text-center px-2">{{ label }}</span>
      </div>
    </div>
  `,
})
export class DonutChartComponent {
  @Input() percent = 0; // 0-100
  @Input() color = '#00288e';
  @Input() trackColor = '#eceef0';
  @Input() size = 120;
  @Input() strokeWidth = 12;
  @Input() label = '';

  get radius(): number {
    return this.size / 2 - this.strokeWidth;
  }
  get circumference(): number {
    return 2 * Math.PI * this.radius;
  }
  get dashOffset(): number {
    const clamped = Math.min(100, Math.max(0, this.percent || 0));
    return this.circumference * (1 - clamped / 100);
  }
  round(v: number): number {
    return Math.round(v || 0);
  }
}
