import { Component, DestroyRef, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, interval, switchMap, takeWhile } from 'rxjs';
import { CoursesService } from '../../core/services/courses.service';
import { LessonsService } from '../../core/services/lessons.service';
import { EnrollmentsService } from '../../core/services/enrollments.service';
import { PaymentsService } from '../../core/services/payments.service';
import { Course, CourseModule, Enrollment } from '../../core/models/academic.model';
import { CheckoutResponse, PaymentMethod } from '../../core/models/payment.model';
import { BottomNavComponent } from '../../shared/components/bottom-nav.component';
import { DashboardShellComponent } from '../../shared/components/dashboard-shell.component';
import { STUDENT_NAV_ITEMS } from '../../shared/nav-items';

type PurchasableState = 'enrolled' | 'free' | 'paid';
type CheckoutTarget = { type: 'module'; module: CourseModule } | { type: 'course' };

interface ModuleView {
  module: CourseModule;
  state: PurchasableState;
  priceLabel: string;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

function moduleIdOf(e: Enrollment): string | null {
  if (!e.moduleId) return null;
  return typeof e.moduleId === 'string' ? e.moduleId : e.moduleId.id;
}

function courseIdOf(e: Enrollment): string {
  return typeof e.courseId === 'string' ? e.courseId : e.courseId.id;
}

@Component({
  selector: 'app-student-course-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, BottomNavComponent, DashboardShellComponent],
  templateUrl: './course-detail.component.html',
  styleUrl: './course-detail.component.scss',
})
export class StudentCourseDetailComponent implements OnInit {
  navItems = STUDENT_NAV_ITEMS;

  loading = signal(true);
  notFound = signal(false);
  course = signal<Course | null>(null);
  moduleViews = signal<ModuleView[]>([]);
  enrollingModuleId = signal<string | null>(null);
  enrollingCourseTrack = signal(false);

  courseTrackHasLessons = signal(false);
  courseTrackEnrolled = signal(false);
  courseTrackState = computed<PurchasableState>(() =>
    this.courseTrackEnrolled() ? 'enrolled' : this.course()?.free ? 'free' : 'paid',
  );
  courseTrackPriceLabel = computed(() =>
    this.course()?.free ? 'Grátis' : currencyFormatter.format(this.course()?.bundlePrice ?? 0),
  );

  checkoutTarget = signal<CheckoutTarget | null>(null);
  checkoutMethod = signal<PaymentMethod>('pix');
  checkoutLoading = signal(false);
  checkoutError = signal<string | null>(null);
  checkoutResult = signal<CheckoutResponse | null>(null);
  paymentConfirmed = signal(false);
  copiedField = signal<string | null>(null);

  private courseId!: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private coursesService: CoursesService,
    private lessonsService: LessonsService,
    private enrollmentsService: EnrollmentsService,
    private paymentsService: PaymentsService,
    private destroyRef: DestroyRef,
    private sanitizer: DomSanitizer,
  ) {}

  /** Descrição vem do editor rich-text (Quill) usado por professor/admin — conteúdo confiável, não de aluno. */
  safeHtml(html: string | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html ?? '');
  }

  ngOnInit() {
    this.courseId = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  private load() {
    this.loading.set(true);
    forkJoin({
      course: this.coursesService.getCourse(this.courseId),
      modules: this.coursesService.listModules(this.courseId),
      enrollments: this.enrollmentsService.myEnrollments(),
    }).subscribe({
      next: ({ course, modules, enrollments }) => {
        this.course.set(course);
        const active = enrollments.filter((e) => e.status === 'active' && courseIdOf(e) === this.courseId);
        const enrolledModuleIds = new Set(active.map(moduleIdOf).filter((id): id is string => !!id));
        this.courseTrackEnrolled.set(active.some((e) => moduleIdOf(e) === null));

        this.moduleViews.set(
          modules
            .filter((m) => m.published)
            .sort((a, b) => a.order - b.order)
            .map((module) => ({
              module,
              state: enrolledModuleIds.has(module.id)
                ? 'enrolled'
                : module.free || module.price === 0
                  ? 'free'
                  : 'paid',
              priceLabel:
                module.free || module.price === 0 ? 'Grátis' : currencyFormatter.format(module.price),
            })),
        );
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });

    // Metadados de aulas avulsas só ficam visíveis pra quem já está matriculado na trilha —
    // 403 aqui não é erro de carregamento, só indica "existe trilha, mas ainda não comprou".
    this.lessonsService.listByCourse(this.courseId).subscribe({
      next: (lessons) => this.courseTrackHasLessons.set(lessons.length > 0),
      error: (err) => this.courseTrackHasLessons.set(err?.status === 403),
    });
  }

  teacherName(): string {
    const teacher = this.course()?.teacherId as unknown;
    if (teacher && typeof teacher === 'object' && 'name' in teacher) {
      return (teacher as { name: string }).name;
    }
    return '';
  }

  private readonly thumbPalette = ['#5b6bf5', '#26a69a', '#ef6c9c', '#f4a638', '#7c4dff', '#26c6da'];

  thumbColor(title: string): string {
    let hash = 0;
    for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
    return this.thumbPalette[Math.abs(hash) % this.thumbPalette.length];
  }

  initial(name: string | undefined): string {
    return name?.trim()?.charAt(0)?.toUpperCase() ?? '?';
  }

  continueModule(moduleId: string) {
    this.enrollmentsService.moduleProgress(moduleId).subscribe((progress) => {
      if (progress.nextLessonId) {
        this.router.navigate(['/student/course-player', moduleId, progress.nextLessonId]);
      }
    });
  }

  continueCourseTrack() {
    this.enrollmentsService.courseTrackProgress(this.courseId).subscribe((progress) => {
      if (progress.nextLessonId) {
        this.router.navigate(['/student/course-player/curso', this.courseId, progress.nextLessonId]);
      }
    });
  }

  enrollFree(module: CourseModule) {
    this.enrollingModuleId.set(module.id);
    this.enrollmentsService.enroll({ moduleId: module.id }).subscribe({
      next: () => {
        this.enrollingModuleId.set(null);
        this.continueModule(module.id);
      },
      error: () => this.enrollingModuleId.set(null),
    });
  }

  enrollFreeCourseTrack() {
    this.enrollingCourseTrack.set(true);
    this.enrollmentsService.enroll({ courseId: this.courseId }).subscribe({
      next: () => {
        this.enrollingCourseTrack.set(false);
        this.courseTrackEnrolled.set(true);
        this.continueCourseTrack();
      },
      error: () => this.enrollingCourseTrack.set(false),
    });
  }

  openCheckout(module: CourseModule) {
    this.checkoutTarget.set({ type: 'module', module });
    this.resetCheckoutState();
  }

  openCourseTrackCheckout() {
    this.checkoutTarget.set({ type: 'course' });
    this.resetCheckoutState();
  }

  private resetCheckoutState() {
    this.checkoutMethod.set('pix');
    this.checkoutResult.set(null);
    this.checkoutError.set(null);
    this.paymentConfirmed.set(false);
  }

  closeCheckout() {
    this.checkoutTarget.set(null);
  }

  selectMethod(method: PaymentMethod) {
    this.checkoutMethod.set(method);
  }

  startCheckout() {
    const target = this.checkoutTarget();
    if (!target) return;
    this.checkoutLoading.set(true);
    this.checkoutError.set(null);
    const payload = target.type === 'module' ? { moduleId: target.module.id } : { courseId: this.courseId };
    this.paymentsService.checkout(payload, this.checkoutMethod()).subscribe({
      next: (result) => {
        this.checkoutLoading.set(false);
        this.checkoutResult.set(result);
        this.pollForConfirmation(target);
      },
      error: () => {
        this.checkoutLoading.set(false);
        this.checkoutError.set('Não foi possível gerar a cobrança. Tente novamente.');
      },
    });
  }

  goToPurchased() {
    const target = this.checkoutTarget();
    if (!target) return;
    this.closeCheckout();
    if (target.type === 'module') {
      this.continueModule(target.module.id);
    } else {
      this.continueCourseTrack();
    }
  }

  copy(text: string | undefined, field: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedField.set(field);
      setTimeout(() => this.copiedField.set(null), 2000);
    });
  }

  private pollForConfirmation(target: CheckoutTarget) {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    interval(POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => this.enrollmentsService.myEnrollments()),
        takeWhile(() => Date.now() < deadline && !this.paymentConfirmed()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((enrollments) => {
        const confirmed = enrollments.some((e) => {
          if (e.status !== 'active' || courseIdOf(e) !== this.courseId) return false;
          const mid = moduleIdOf(e);
          return target.type === 'module' ? mid === target.module.id : mid === null;
        });
        if (confirmed) {
          this.paymentConfirmed.set(true);
          this.load();
        }
      });
  }
}
