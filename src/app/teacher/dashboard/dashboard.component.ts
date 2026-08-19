import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsService } from '../../core/services/stats.service';
import { TeacherStats } from '../../core/models/stats.model';
import { DashboardShellComponent } from '../../shared/components/dashboard-shell.component';
import { BarChartComponent } from '../../shared/components/bar-chart.component';
import { TEACHER_NAV_ITEMS } from '../../shared/nav-items';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, DashboardShellComponent, BarChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class TeacherDashboardComponent implements OnInit {
  loading = signal(true);
  stats = signal<TeacherStats | null>(null);

  navItems = TEACHER_NAV_ITEMS;

  constructor(private statsService: StatsService) {}

  ngOnInit() {
    this.statsService.teacher().subscribe((stats) => {
      this.stats.set(stats);
      this.loading.set(false);
    });
  }
}
