import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { EnrollmentsService } from '../../core/services/enrollments.service';
import {
  Course,
  CourseModule,
  Enrollment,
  ModuleProgressSummary,
  enrollmentCourseId,
  enrollmentModuleId,
} from '../../core/models/academic.model';
import { BottomNavComponent } from '../../shared/components/bottom-nav.component';
import { DashboardShellComponent } from '../../shared/components/dashboard-shell.component';
import { STUDENT_NAV_ITEMS } from '../../shared/nav-items';

interface MyCourseView {
  key: string;
  course: Course;
  subtitle: string;
  progress: ModuleProgressSummary;
  continueLink: unknown[];
}

@Component({
  selector: 'app-student-my-courses',
  standalone: true,
  imports: [CommonModule, RouterLink, BottomNavComponent, DashboardShellComponent],
  templateUrl: './my-courses.component.html',
  styleUrl: './my-courses.component.scss',
})
export class MyCoursesComponent implements OnInit {
  navItems = STUDENT_NAV_ITEMS;

  loading = signal(true);
  inProgress = signal<MyCourseView[]>([]);
  completed = signal<MyCourseView[]>([]);

  constructor(private enrollmentsService: EnrollmentsService) {}

  ngOnInit() {
    this.enrollmentsService
      .myEnrollments()
      .pipe(
        switchMap((enrollments) => {
          const active = enrollments.filter(
            (e): e is Enrollment & { courseId: Course } =>
              e.status === 'active' && typeof e.courseId === 'object',
          );
          if (!active.length) return of([] as MyCourseView[]);

          const requests = active.map((enrollment) => {
            const course = enrollment.courseId;
            const moduleId = enrollmentModuleId(enrollment);
            if (moduleId) {
              const module = enrollment.moduleId as CourseModule;
              return this.enrollmentsService.moduleProgress(moduleId).pipe(
                switchMap((progress) =>
                  of({
                    key: `module-${moduleId}`,
                    course,
                    subtitle: module.title,
                    progress,
                    continueLink: progress.nextLessonId
                      ? ['/student/course-player', moduleId, progress.nextLessonId]
                      : ['/student/cursos', course.id],
                  }),
                ),
              );
            }
            const courseId = enrollmentCourseId(enrollment);
            return this.enrollmentsService.courseTrackProgress(courseId).pipe(
              switchMap((progress) =>
                of({
                  key: `track-${courseId}`,
                  course,
                  subtitle: 'Trilha de aulas avulsas',
                  progress,
                  continueLink: progress.nextLessonId
                    ? ['/student/course-player/curso', courseId, progress.nextLessonId]
                    : ['/student/cursos', course.id],
                }),
              ),
            );
          });

          return forkJoin(requests);
        }),
      )
      .subscribe((views) => {
        this.inProgress.set(views.filter((v) => v.progress.percentage < 100));
        this.completed.set(views.filter((v) => v.progress.percentage >= 100));
        this.loading.set(false);
      });
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
}
