import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsService } from '../../core/services/stats.service';
import { TeacherStats } from '../../core/models/stats.model';
import { DashboardShellComponent, ShellNavItem } from '../../shared/components/dashboard-shell.component';
import { BarChartComponent } from '../../shared/components/bar-chart.component';

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

  navItems: ShellNavItem[] = [
    { label: 'Dashboard', link: '/teacher', exact: true, icon: 'home' },
    { label: 'Meus cursos', link: '/teacher/courses', exact: false, icon: 'book' },
    { label: 'Módulos', link: '/teacher/modules', exact: false, icon: 'layers' },
    { label: 'Aulas', link: '/teacher/lessons', exact: false, icon: 'video' },
    { label: 'Avaliações', link: '/teacher/exams', exact: false, icon: 'clipboard' },
    { label: 'Alunos matriculados', link: '/teacher/students', exact: false, icon: 'users' },
  ];

  constructor(private statsService: StatsService) {}

  ngOnInit() {
    this.statsService.teacher().subscribe((stats) => {
      this.stats.set(stats);
      this.loading.set(false);
    });
  }
}
