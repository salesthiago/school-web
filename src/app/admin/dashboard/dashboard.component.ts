import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsService } from '../../core/services/stats.service';
import { AdminStats } from '../../core/models/stats.model';
import { DashboardShellComponent } from '../../shared/components/dashboard-shell.component';
import { BarChartComponent } from '../../shared/components/bar-chart.component';
import { ADMIN_NAV_ITEMS } from '../../shared/nav-items';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, DashboardShellComponent, BarChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  loading = signal(true);
  stats = signal<AdminStats | null>(null);

  navItems = ADMIN_NAV_ITEMS;

  constructor(private statsService: StatsService) {}

  ngOnInit() {
    this.statsService.admin().subscribe((stats) => {
      this.stats.set(stats);
      this.loading.set(false);
    });
  }
}
