import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, map, of, forkJoin } from 'rxjs';
import { CoursesService } from '../../core/services/courses.service';
import { InstitutionsService } from '../../core/services/institutions.service';
import { Course, CourseModule, Institution } from '../../core/models/academic.model';
import { PublicHeaderComponent } from '../../shared/components/public-header.component';

interface LandingCourseView {
  course: Course;
  teacherName: string;
  priceLabel: string;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, PublicHeaderComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit {
  loading = signal(true);
  institution = signal<Institution | null>(null);
  courses = signal<LandingCourseView[]>([]);

  footerLine = computed(() => {
    const inst = this.institution();
    if (!inst) return '';
    return [inst.name, inst.address].filter(Boolean).join(' · ');
  });

  contactLine = computed(() => {
    const inst = this.institution();
    if (!inst) return '';
    return [inst.email, inst.phone].filter(Boolean).join(' · ');
  });

  constructor(
    private coursesService: CoursesService,
    private institutionsService: InstitutionsService,
  ) {}

  ngOnInit() {
    this.institutionsService.getPublic().subscribe((institution) => this.institution.set(institution));

    this.coursesService.listPublished().subscribe((courses) => {
      if (!courses.length) {
        this.courses.set([]);
        this.loading.set(false);
        return;
      }

      const requests = courses.map((course) =>
        this.coursesService.listModules(course.id).pipe(
          map((modules) => ({
            course,
            teacherName: this.teacherName(course),
            priceLabel: this.priceLabel(course, modules),
          })),
          catchError(() =>
            of({ course, teacherName: this.teacherName(course), priceLabel: '' }),
          ),
        ),
      );

      forkJoin(requests).subscribe((views) => {
        this.courses.set(views);
        this.loading.set(false);
      });
    });
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

  private priceLabel(course: Course, modules: CourseModule[]): string {
    if (modules.length) {
      if (modules.some((m) => m.free)) return 'Grátis';
      const min = Math.min(...modules.map((m) => m.price));
      return currencyFormatter.format(min);
    }
    if (course.free) return 'Grátis';
    if (course.bundlePrice) return currencyFormatter.format(course.bundlePrice);
    return '';
  }
}
