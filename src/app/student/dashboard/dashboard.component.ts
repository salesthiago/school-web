import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { EnrollmentsService } from '../../core/services/enrollments.service';
import { CertificatesService } from '../../core/services/certificates.service';
import { CoursesService } from '../../core/services/courses.service';
import { InstitutionsService } from '../../core/services/institutions.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { AuthService } from '../../core/services/auth.service';
import {
  CourseModule,
  Course,
  ModuleProgressSummary,
  Certificate,
  Institution,
} from '../../core/models/academic.model';
import { AppNotification } from '../../core/models/notification.model';
import { BottomNavComponent } from '../../shared/components/bottom-nav.component';
import { IconComponent, IconName } from '../../shared/components/icon.component';

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

interface NavItem {
  label: string;
  link: string;
  exact: boolean;
  icon: IconName;
}

const ROLE_LABELS: Record<string, string> = {
  student: 'Aluno',
  teacher: 'Professor',
  admin: 'Administrador',
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, BottomNavComponent, IconComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  inProgress = signal<EnrollmentView[]>([]);
  completed = signal<EnrollmentView[]>([]);
  certificates = signal<Certificate[]>([]);
  recommended = signal<RecommendedCourseView[]>([]);
  institution = signal<Institution | null>(null);
  notifications = signal<AppNotification[]>([]);
  unreadCount = computed(() => this.notifications().filter((n) => !n.read).length);

  userMenuOpen = signal(false);
  notifMenuOpen = signal(false);

  navItems: NavItem[] = [
    { label: 'Dashboard', link: '/student', exact: true, icon: 'home' },
    { label: 'Meus Cursos', link: '/student/meus-cursos', exact: false, icon: 'book' },
    { label: 'Explorar Cursos', link: '/student/explorar', exact: false, icon: 'compass' },
    { label: 'Certificados', link: '/student/certificates', exact: false, icon: 'award' },
    { label: 'Wishlist', link: '/student/wishlist', exact: false, icon: 'heart' },
    { label: 'Histórico', link: '/student/historico', exact: false, icon: 'clock' },
    { label: 'Perfil', link: '/student/profile', exact: false, icon: 'user' },
    { label: 'Configurações', link: '/student/configuracoes', exact: false, icon: 'settings' },
    { label: 'Ajuda', link: '/student/ajuda', exact: false, icon: 'help' },
  ];

  constructor(
    public authService: AuthService,
    private enrollmentsService: EnrollmentsService,
    private certificatesService: CertificatesService,
    private coursesService: CoursesService,
    private institutionsService: InstitutionsService,
    private notificationsService: NotificationsService,
  ) {}

  ngOnInit() {
    this.enrollmentsService
      .myEnrollments()
      .pipe(
        switchMap((enrollments) => {
          if (!enrollments.length) return of([] as EnrollmentView[]);
          const requests = enrollments.map((e) => {
            const module = e.moduleId as CourseModule;
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
    this.institutionsService.getPublic().subscribe((institution) => this.institution.set(institution));
    this.notificationsService.mine().subscribe((notifications) => this.notifications.set(notifications));
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

  roleLabel(role: string | undefined): string {
    return role ? (ROLE_LABELS[role] ?? role) : '';
  }

  toggleUserMenu() {
    this.userMenuOpen.update((open) => !open);
    this.notifMenuOpen.set(false);
  }

  toggleNotifMenu() {
    this.notifMenuOpen.update((open) => !open);
    this.userMenuOpen.set(false);
  }

  markNotificationRead(notification: AppNotification) {
    if (notification.read) return;
    this.notificationsService.markRead(notification.id).subscribe(() => {
      this.notifications.update((list) =>
        list.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
    });
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
