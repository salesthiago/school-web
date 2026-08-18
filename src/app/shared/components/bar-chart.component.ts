import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailyCount } from '../../core/models/stats.model';

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bar-chart">
      @for (item of data(); track item.date) {
        <div class="bar-col" [title]="tooltip(item)">
          <div class="bar-track">
            <div class="bar" [style.height.%]="heightPercent(item.count)" [style.background]="color"></div>
          </div>
          <span class="bar-label">{{ dayLabel(item.date) }}</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .bar-chart {
        display: flex;
        align-items: flex-end;
        gap: 0.4rem;
        height: 140px;
        padding-top: 0.5rem;
      }

      .bar-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.35rem;
        height: 100%;
      }

      .bar-track {
        flex: 1;
        width: 100%;
        display: flex;
        align-items: flex-end;
      }

      .bar {
        width: 100%;
        min-height: 3px;
        border-radius: 4px 4px 0 0;
      }

      .bar-label {
        font-size: 0.65rem;
        color: #8a8fa3;
      }
    `,
  ],
})
export class BarChartComponent {
  @Input() color = '#6c4bf4';
  @Input({ required: true }) set series(value: DailyCount[]) {
    this.data.set(value ?? []);
  }

  data = signal<DailyCount[]>([]);
  private max = computed(() => Math.max(1, ...this.data().map((d) => d.count)));

  heightPercent(count: number): number {
    return Math.max(2, (count / this.max()) * 100);
  }

  dayLabel(date: string): string {
    const [, month, day] = date.split('-');
    return `${day}/${month}`;
  }

  tooltip(item: DailyCount): string {
    return `${this.dayLabel(item.date)}: ${item.count}`;
  }
}
