import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { CoursesService } from '../../core/services/courses.service';
import { EnrollmentsService } from '../../core/services/enrollments.service';
import { CourseModule, Lesson, ModuleProgressSummary } from '../../core/models/academic.model';

@Component({
  selector: 'app-course-player',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './course-player.component.html',
  styleUrl: './course-player.component.scss',
})
export class CoursePlayerComponent implements OnInit {
  module = signal<CourseModule | null>(null);
  lessons = signal<Lesson[]>([]);
  currentLesson = signal<Lesson | null>(null);
  progress = signal<ModuleProgressSummary | null>(null);

  constructor(
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private enrollmentsService: EnrollmentsService,
  ) {}

  ngOnInit() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const moduleId = params.get('moduleId')!;
          return this.coursesService.getModule(moduleId);
        }),
      )
      .subscribe((module) => {
        this.module.set(module);
        this.loadLessons(module.id);
        this.refreshProgress(module.id);
      });
  }

  private loadLessons(moduleId: string) {
    this.coursesService.listLessons(moduleId).subscribe((lessons) => {
      this.lessons.set(lessons);
      const lessonId = this.route.snapshot.paramMap.get('lessonId');
      const selected = lessons.find((l) => l.id === lessonId) ?? lessons[0] ?? null;
      this.currentLesson.set(selected);
    });
  }

  private refreshProgress(moduleId: string) {
    this.enrollmentsService.moduleProgress(moduleId).subscribe((p) => this.progress.set(p));
  }

  selectLesson(lesson: Lesson) {
    this.currentLesson.set(lesson);
  }

  markWatched() {
    const lesson = this.currentLesson();
    const module = this.module();
    if (!lesson || !module) return;

    this.enrollmentsService
      .recordProgress(lesson.id, module.id, lesson.video.durationSeconds)
      .subscribe(() => this.refreshProgress(module.id));
  }
}
