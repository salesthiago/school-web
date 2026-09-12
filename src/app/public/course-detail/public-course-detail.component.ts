import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { CoursesService } from '../../core/services/courses.service';
import { InstitutionsService } from '../../core/services/institutions.service';
import { AuthService } from '../../core/services/auth.service';
import { Course, CourseModule, Institution } from '../../core/models/academic.model';
import { PublicHeaderComponent } from '../../shared/components/public-header.component';

interface ModuleRow {
  module: CourseModule;
  priceLabel: string;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

@Component({
  selector: 'app-public-course-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicHeaderComponent],
  templateUrl: './public-course-detail.component.html',
  styleUrl: './public-course-detail.component.scss',
})
export class PublicCourseDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private coursesService = inject(CoursesService);
  private institutionsService = inject(InstitutionsService);
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);

  loading = signal(true);
  notFound = signal(false);
  institution = signal<Institution | null>(null);
  course = signal<Course | null>(null);
  moduleRows = signal<ModuleRow[]>([]);

  startingPriceLabel = computed(() => {
    const rows = this.moduleRows();
    const course = this.course();
    if (rows.length) {
      if (rows.some((r) => r.module.free || r.module.price === 0)) return 'Grátis';
      const min = Math.min(...rows.map((r) => r.module.price));
      return `A partir de ${currencyFormatter.format(min)}`;
    }
    if (course?.free) return 'Grátis';
    if (course?.bundlePrice) return currencyFormatter.format(course.bundlePrice);
    return '';
  });

  private courseId!: string;

  ngOnInit() {
    this.courseId = this.route.snapshot.paramMap.get('id')!;
    this.institutionsService.getPublic().subscribe((institution) => this.institution.set(institution));

    forkJoin({
      course: this.coursesService.getCourse(this.courseId),
      modules: this.coursesService.listModules(this.courseId),
    }).subscribe({
      next: ({ course, modules }) => {
        this.course.set(course);
        this.moduleRows.set(
          modules
            .filter((m) => m.published)
            .sort((a, b) => a.order - b.order)
            .map((module) => ({
              module,
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

  /** Descrição vem do editor rich-text (Quill) usado por professor/admin — conteúdo confiável, não de aluno. */
  safeHtml(html: string | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html ?? '');
  }

  teacherName(): string {
    const teacher = this.course()?.teacherId as unknown;
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

  enroll() {
    const returnUrl = `/student/cursos/${this.courseId}`;
    if (this.authService.isAuthenticated()) {
      this.router.navigateByUrl(returnUrl);
    } else {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl } });
    }
  }
}
