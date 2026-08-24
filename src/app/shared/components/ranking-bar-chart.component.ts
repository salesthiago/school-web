import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RankingItem {
  label: string;
  value: number;
  displayValue?: string;
}

@Component({
  selector: 'app-ranking-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (data().length) {
      <div class="ranking-chart">
        @for (item of data(); track item.label) {
          <div class="ranking-row" [title]="item.label">
            <span class="ranking-label">{{ item.label }}</span>
            <div class="ranking-track">
              <div class="ranking-bar" [style.width.%]="widthPercent(item.value)" [style.background]="color"></div>
            </div>
            <span class="ranking-value">{{ item.displayValue ?? item.value }}</span>
          </div>
        }
      </div>
    } @else {
      <p class="ranking-empty">Sem dados no período.</p>
    }
  `,
  styles: [
    `
      .ranking-chart {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .ranking-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) auto;
        align-items: center;
        gap: 0.6rem;
      }

      .ranking-label {
        font-size: 0.8rem;
        color: #4b5563;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ranking-track {
        height: 10px;
        background: #f0f1f5;
        border-radius: 6px;
        overflow: hidden;
      }

      .ranking-bar {
        height: 100%;
        min-width: 3px;
        border-radius: 6px;
      }

      .ranking-value {
        font-size: 0.8rem;
        font-weight: 600;
        color: #1a1d29;
        white-space: nowrap;
      }

      .ranking-empty {
        color: #8a8fa3;
        font-size: 0.85rem;
      }
    `,
  ],
})
export class RankingBarChartComponent {
  @Input() color = '#6c4bf4';
  @Input({ required: true }) set items(value: RankingItem[]) {
    this.data.set(value ?? []);
  }

  data = signal<RankingItem[]>([]);
  private max = computed(() => Math.max(1, ...this.data().map((d) => d.value)));

  widthPercent(value: number): number {
    return Math.max(2, (value / this.max()) * 100);
  }
}
