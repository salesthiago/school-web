import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsService } from '../../core/services/reports.service';
import {
  CertificatesIssuedReport,
  CompletionRateItem,
  ExamPerformanceItem,
  MostWatchedCourse,
  RegistrationsReport,
  RevenueReport,
  StudentWithoutCourse,
} from '../../core/models/reports.model';
import { DashboardShellComponent } from '../../shared/components/dashboard-shell.component';
import { BarChartComponent } from '../../shared/components/bar-chart.component';
import { RankingBarChartComponent, RankingItem } from '../../shared/components/ranking-bar-chart.component';
import { ADMIN_NAV_ITEMS } from '../../shared/nav-items';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, DashboardShellComponent, BarChartComponent, RankingBarChartComponent],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class AdminReportsComponent implements OnInit {
  navItems = ADMIN_NAV_ITEMS;
  periodOptions = [30, 90, 180];
  days = signal(30);

  mostWatched = signal<MostWatchedCourse[] | null>(null);
  registrations = signal<RegistrationsReport | null>(null);
  studentsWithoutCourses = signal<StudentWithoutCourse[] | null>(null);
  completionRate = signal<CompletionRateItem[] | null>(null);
  revenue = signal<RevenueReport | null>(null);
  examPerformance = signal<ExamPerformanceItem[] | null>(null);
  certificatesIssued = signal<CertificatesIssuedReport | null>(null);

  mostWatchedRanking = computed<RankingItem[]>(() =>
    (this.mostWatched() ?? []).map((c) => ({
      label: c.title,
      value: c.totalWatchedSeconds,
      displayValue: `${this.formatDuration(c.totalWatchedSeconds)} · ${c.viewerCount} aluno(s)`,
    })),
  );

  completionRanking = computed<RankingItem[]>(() =>
    (this.completionRate() ?? []).map((c) => ({
      label: c.title,
      value: c.completionRatePercent,
      displayValue: `${c.completionRatePercent}% (${c.completedCount}/${c.enrolledCount})`,
    })),
  );

  revenueRanking = computed<RankingItem[]>(() =>
    (this.revenue()?.byCourse ?? []).map((c) => ({
      label: c.title,
      value: c.total,
      displayValue: `${this.formatCurrency(c.total)} · ${c.orders} pedido(s)`,
    })),
  );

  examRanking = computed<RankingItem[]>(() =>
    (this.examPerformance() ?? []).map((e) => ({
      label: `${e.examTitle} (${e.courseTitle})`,
      value: e.passRatePercent,
      displayValue: `${e.passRatePercent}% aprovação · nota média ${e.avgScore}`,
    })),
  );

  certificatesRanking = computed<RankingItem[]>(() =>
    (this.certificatesIssued()?.byCourse ?? []).map((c) => ({
      label: c.title,
      value: c.count,
    })),
  );

  registrationsSeries = computed(() =>
    (this.registrations()?.series ?? []).map((p) => ({ date: p.date, count: p.value })),
  );

  revenueSeries = computed(() => (this.revenue()?.series ?? []).map((p) => ({ date: p.date, count: p.value })));

  certificatesSeries = computed(() =>
    (this.certificatesIssued()?.series ?? []).map((p) => ({ date: p.date, count: p.value })),
  );

  totalRevenuePeriod = computed(() =>
    (this.revenue()?.series ?? []).reduce((sum, p) => sum + p.value, 0),
  );

  totalCertificatesPeriod = computed(() =>
    (this.certificatesIssued()?.series ?? []).reduce((sum, p) => sum + p.value, 0),
  );

  constructor(private reportsService: ReportsService) {}

  ngOnInit() {
    this.loadSnapshots();
    this.loadTimeSeries();
  }

  onDaysChange(value: string) {
    this.days.set(Number(value));
    this.loadTimeSeries();
  }

  private loadSnapshots() {
    this.reportsService.mostWatchedCourses().subscribe((data) => this.mostWatched.set(data));
    this.reportsService.studentsWithoutCourses().subscribe((data) => this.studentsWithoutCourses.set(data));
    this.reportsService.completionRate().subscribe((data) => this.completionRate.set(data));
    this.reportsService.examPerformance().subscribe((data) => this.examPerformance.set(data));
  }

  private loadTimeSeries() {
    const days = this.days();
    this.reportsService.registrations(days).subscribe((data) => this.registrations.set(data));
    this.reportsService.revenue(days).subscribe((data) => this.revenue.set(data));
    this.reportsService.certificatesIssued(days).subscribe((data) => this.certificatesIssued.set(data));
  }

  formatDuration(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.round((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR');
  }
}
