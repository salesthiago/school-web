import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsService } from '../../core/services/stats.service';
import { AdminStats } from '../../core/models/stats.model';
import { DashboardShellComponent, ShellNavItem } from '../../shared/components/dashboard-shell.component';
import { BarChartComponent } from '../../shared/components/bar-chart.component';

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

  navItems: ShellNavItem[] = [
    { label: 'Dashboard', link: '/admin', exact: true, icon: 'home' },
    { label: 'Usuários', link: '/admin/users', exact: false, icon: 'users' },
    { label: 'Cursos', link: '/admin/courses', exact: false, icon: 'book' },
    { label: 'Professores', link: '/admin/teachers', exact: false, icon: 'graduation-cap' },
    { label: 'Pagamentos', link: '/admin/payments', exact: false, icon: 'credit-card' },
    { label: 'Relatórios', link: '/admin/reports', exact: false, icon: 'bar-chart' },
    { label: 'Identidade visual', link: '/admin/settings', exact: false, icon: 'palette' },
    { label: 'Integração de vídeos', link: '/admin/video-settings', exact: false, icon: 'video' },
  ];

  constructor(private statsService: StatsService) {}

  ngOnInit() {
    this.statsService.admin().subscribe((stats) => {
      this.stats.set(stats);
      this.loading.set(false);
    });
  }
}
