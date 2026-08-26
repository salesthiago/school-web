import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { EnrollmentsService } from '../../core/services/enrollments.service';
import { CertificatesService } from '../../core/services/certificates.service';
import { CoursesService } from '../../core/services/courses.service';
import { InstitutionsService } from '../../core/services/institutions.service';
import { CourseModule, Course, ModuleProgressSummary, Certificate } from '../../core/models/academic.model';
import { BottomNavComponent } from '../../shared/components/bottom-nav.component';
import { DashboardShellComponent } from '../../shared/components/dashboard-shell.component';
import { STUDENT_NAV_ITEMS } from '../../shared/nav-items';

interface EnrollmentView {
  module: CourseModule;
  course: Course;
  progress: ModuleProgressSummary;
}

interface RecommendedCourseView {
  course: Course;
  teacherName: string;
  priceLabel: string;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, BottomNavComponent, DashboardShellComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  inProgress = signal<EnrollmentView[]>([]);
  completed = signal<EnrollmentView[]>([]);
  certificates = signal<Certificate[]>([]);
  recommended = signal<RecommendedCourseView[]>([]);
  studentBannerUrl = signal<string | undefined>(undefined);

  navItems = STUDENT_NAV_ITEMS;

  constructor(
    private enrollmentsService: EnrollmentsService,
    private certificatesService: CertificatesService,
    private coursesService: CoursesService,
    private institutionsService: InstitutionsService,
  ) {}

  ngOnInit() {
    this.institutionsService
      .getPublic()
      .subscribe((institution) => this.studentBannerUrl.set(institution.studentBannerUrl));

    this.enrollmentsService
      .myEnrollments()
      .pipe(
        switchMap((enrollments) => {
          // Matrículas na trilha de aulas avulsas do curso (sem módulo) não entram aqui —
          // "Continue aprendendo"/"Concluídos" seguem por módulo; a trilha avulsa aparece
          // na própria página do curso.
          const moduleEnrollments = enrollments.filter(
            (e): e is typeof e & { moduleId: CourseModule } => !!e.moduleId && typeof e.moduleId === 'object',
          );
          if (!moduleEnrollments.length) return of([] as EnrollmentView[]);
          const requests = moduleEnrollments.map((e) => {
            const module = e.moduleId;
            const course = e.courseId as Course;
            return this.enrollmentsService
              .moduleProgress(module.id)
              .pipe(switchMap((progress) => of({ module, course, progress })));
          });
          return forkJoin(requests);
        }),
      )
      .subscribe((views) => {
        this.inProgress.set(views.filter((v) => v.progress.percentage < 100));
        this.completed.set(views.filter((v) => v.progress.percentage >= 100));
        this.loading.set(false);
        this.loadRecommended(new Set(views.map((v) => v.course.id)));
      });

    this.certificatesService.myCertificates().subscribe((certs) => this.certificates.set(certs));
  }

  get currentCourse(): EnrollmentView | undefined {
    return this.inProgress()[0];
  }

  teacherName(course: Course): string {
    const teacher = course.teacherId as unknown;
    if (teacher && typeof teacher === 'object' && 'name' in teacher) {
      return (teacher as { name: string }).name;
    }
    return '';
  }

  initial(name: string | undefined): string {
    return name?.trim()?.charAt(0)?.toUpperCase() ?? '?';
  }

  private readonly thumbPalette = ['#5b6bf5', '#26a69a', '#ef6c9c', '#f4a638', '#7c4dff', '#26c6da'];

  thumbColor(title: string): string {
    let hash = 0;
    for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
    return this.thumbPalette[Math.abs(hash) % this.thumbPalette.length];
  }

  private loadRecommended(enrolledCourseIds: Set<string>) {
    this.coursesService.listPublished().subscribe((courses) => {
      const candidates = courses.filter((c) => !enrolledCourseIds.has(c.id)).slice(0, 4);
      if (!candidates.length) {
        this.recommended.set([]);
        return;
      }

      const requests = candidates.map((course) =>
        this.coursesService.listModules(course.id).pipe(
          map((modules) => ({
            course,
            teacherName: this.teacherName(course),
            priceLabel: this.priceLabel(modules),
          })),
          catchError(() => of({ course, teacherName: this.teacherName(course), priceLabel: '' })),
        ),
      );
      forkJoin(requests).subscribe((views) => this.recommended.set(views));
    });
  }

  private priceLabel(modules: CourseModule[]): string {
    if (!modules.length) return '';
    if (modules.some((m) => m.free)) return 'Grátis';
    const min = Math.min(...modules.map((m) => m.price));
    return currencyFormatter.format(min);
  }
}
