import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { CoursesService } from '../../core/services/courses.service';
import { EnrollmentsService } from '../../core/services/enrollments.service';
import { Course, CourseModule, enrollmentCourseId } from '../../core/models/academic.model';
import { BottomNavComponent } from '../../shared/components/bottom-nav.component';
import { DashboardShellComponent } from '../../shared/components/dashboard-shell.component';
import { STUDENT_NAV_ITEMS } from '../../shared/nav-items';

interface ExploreCourseView {
  course: Course;
  teacherName: string;
  priceLabel: string;
  enrolled: boolean;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

@Component({
  selector: 'app-student-explore',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BottomNavComponent, DashboardShellComponent],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.scss',
})
export class ExploreComponent implements OnInit {
  navItems = STUDENT_NAV_ITEMS;

  loading = signal(true);
  courses = signal<ExploreCourseView[]>([]);
  search = signal('');

  filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.courses();
    return this.courses().filter((view) => view.course.title.toLowerCase().includes(term));
  });

  constructor(
    private coursesService: CoursesService,
    private enrollmentsService: EnrollmentsService,
  ) {}

  ngOnInit() {
    forkJoin({
      courses: this.coursesService.listPublished(),
      enrollments: this.enrollmentsService.myEnrollments(),
    }).subscribe(({ courses, enrollments }) => {
      const enrolledCourseIds = new Set(
        enrollments.filter((e) => e.status === 'active').map(enrollmentCourseId),
      );

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
            enrolled: enrolledCourseIds.has(course.id),
          })),
          catchError(() =>
            of({
              course,
              teacherName: this.teacherName(course),
              priceLabel: '',
              enrolled: enrolledCourseIds.has(course.id),
            }),
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
