import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, interval, switchMap, takeWhile } from 'rxjs';
import { CoursesService } from '../../core/services/courses.service';
import { EnrollmentsService } from '../../core/services/enrollments.service';
import { PaymentsService } from '../../core/services/payments.service';
import { Course, CourseModule } from '../../core/models/academic.model';
import { CheckoutResponse, PaymentMethod } from '../../core/models/payment.model';
import { BottomNavComponent } from '../../shared/components/bottom-nav.component';

type ModuleState = 'enrolled' | 'free' | 'paid';

interface ModuleView {
  module: CourseModule;
  state: ModuleState;
  priceLabel: string;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

@Component({
  selector: 'app-student-course-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, BottomNavComponent],
  templateUrl: './course-detail.component.html',
  styleUrl: './course-detail.component.scss',
})
export class StudentCourseDetailComponent implements OnInit {
  loading = signal(true);
  notFound = signal(false);
  course = signal<Course | null>(null);
  moduleViews = signal<ModuleView[]>([]);
  enrollingModuleId = signal<string | null>(null);

  checkoutModule = signal<CourseModule | null>(null);
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
    private enrollmentsService: EnrollmentsService,
    private paymentsService: PaymentsService,
    private destroyRef: DestroyRef,
  ) {}

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
        const enrolledModuleIds = new Set(
          enrollments
            .filter((e) => e.status === 'active')
            .map((e) => (e.moduleId as CourseModule).id),
        );
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

  enrollFree(module: CourseModule) {
    this.enrollingModuleId.set(module.id);
    this.enrollmentsService.enroll(module.id).subscribe({
      next: () => {
        this.enrollingModuleId.set(null);
        this.continueModule(module.id);
      },
      error: () => this.enrollingModuleId.set(null),
    });
  }

  openCheckout(module: CourseModule) {
    this.checkoutModule.set(module);
    this.checkoutMethod.set('pix');
    this.checkoutResult.set(null);
    this.checkoutError.set(null);
    this.paymentConfirmed.set(false);
  }

  closeCheckout() {
    this.checkoutModule.set(null);
  }

  selectMethod(method: PaymentMethod) {
    this.checkoutMethod.set(method);
  }

  startCheckout() {
    const module = this.checkoutModule();
    if (!module) return;
    this.checkoutLoading.set(true);
    this.checkoutError.set(null);
    this.paymentsService.checkout(module.id, this.checkoutMethod()).subscribe({
      next: (result) => {
        this.checkoutLoading.set(false);
        this.checkoutResult.set(result);
        this.pollForConfirmation(module.id);
      },
      error: () => {
        this.checkoutLoading.set(false);
        this.checkoutError.set('Não foi possível gerar a cobrança. Tente novamente.');
      },
    });
  }

  goToPurchasedModule() {
    const module = this.checkoutModule();
    if (!module) return;
    this.closeCheckout();
    this.continueModule(module.id);
  }

  copy(text: string | undefined, field: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedField.set(field);
      setTimeout(() => this.copiedField.set(null), 2000);
    });
  }

  private pollForConfirmation(moduleId: string) {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    interval(POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => this.enrollmentsService.myEnrollments()),
        takeWhile(() => Date.now() < deadline && !this.paymentConfirmed()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((enrollments) => {
        const confirmed = enrollments.some(
          (e) => e.status === 'active' && (e.moduleId as CourseModule).id === moduleId,
        );
        if (confirmed) {
          this.paymentConfirmed.set(true);
          this.load();
        }
      });
  }
}
