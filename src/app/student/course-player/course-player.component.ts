import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { of, switchMap } from 'rxjs';
import { CoursesService } from '../../core/services/courses.service';
import { LessonsService } from '../../core/services/lessons.service';
import { AttachmentsService } from '../../core/services/attachments.service';
import { EnrollmentsService } from '../../core/services/enrollments.service';
import { Attachment, CourseModule, Lesson, ModuleProgressSummary } from '../../core/models/academic.model';
import { DashboardShellComponent } from '../../shared/components/dashboard-shell.component';
import { BottomNavComponent } from '../../shared/components/bottom-nav.component';
import { STUDENT_NAV_ITEMS } from '../../shared/nav-items';

@Component({
  selector: 'app-course-player',
  standalone: true,
  imports: [CommonModule, RouterLink, DashboardShellComponent, BottomNavComponent],
  templateUrl: './course-player.component.html',
  styleUrl: './course-player.component.scss',
})
export class CoursePlayerComponent implements OnInit {
  navItems = STUDENT_NAV_ITEMS;

  /** Nulo quando o player está tocando uma aula avulsa (sem módulo). */
  module = signal<CourseModule | null>(null);
  /** Preenchido só no modo "aula avulsa" — usado pra registrar progresso/marcar como assistida. */
  private courseId: string | null = null;

  lessons = signal<Lesson[]>([]);
  currentLesson = signal<Lesson | null>(null);
  progress = signal<ModuleProgressSummary | null>(null);
  attachments = signal<Attachment[]>([]);

  constructor(
    private route: ActivatedRoute,
    private coursesService: CoursesService,
    private lessonsService: LessonsService,
    private attachmentsService: AttachmentsService,
    private enrollmentsService: EnrollmentsService,
    private sanitizer: DomSanitizer,
  ) {}

  /** playbackUrl vem do nosso backend (iframe.mediadelivery.net do Bunny), não de entrada do usuário. */
  embedUrl(playbackUrl: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(playbackUrl);
  }

  ngOnInit() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const moduleId = params.get('moduleId');
          const courseId = params.get('courseId');

          if (moduleId) {
            this.courseId = null;
            return this.coursesService.getModule(moduleId);
          }

          this.courseId = courseId;
          this.module.set(null);
          this.loadLooseLessons(courseId!);
          this.refreshCourseTrackProgress(courseId!);
          return of(null);
        }),
      )
      .subscribe((module) => {
        if (!module) return;
        this.module.set(module);
        this.loadModuleLessons(module.id);
        this.refreshModuleProgress(module.id);
      });
  }

  private loadModuleLessons(moduleId: string) {
    this.coursesService.listLessons(moduleId).subscribe((lessons) => this.selectLessonFromRoute(lessons));
  }

  private loadLooseLessons(courseId: string) {
    this.lessonsService.listByCourse(courseId).subscribe((lessons) => this.selectLessonFromRoute(lessons));
  }

  private selectLessonFromRoute(lessons: Lesson[]) {
    this.lessons.set(lessons);
    const lessonId = this.route.snapshot.paramMap.get('lessonId');
    const selected = lessons.find((l) => l.id === lessonId) ?? lessons[0] ?? null;
    this.currentLesson.set(selected);
    if (selected) this.loadAttachments(selected.id);
  }

  private loadAttachments(lessonId: string) {
    this.attachmentsService.listByLesson(lessonId).subscribe((attachments) => this.attachments.set(attachments));
  }

  private refreshModuleProgress(moduleId: string) {
    this.enrollmentsService.moduleProgress(moduleId).subscribe((p) => this.progress.set(p));
  }

  private refreshCourseTrackProgress(courseId: string) {
    this.enrollmentsService.courseTrackProgress(courseId).subscribe((p) => this.progress.set(p));
  }

  selectLesson(lesson: Lesson) {
    this.currentLesson.set(lesson);
    this.loadAttachments(lesson.id);
  }

  markWatched() {
    const lesson = this.currentLesson();
    if (!lesson) return;
    const module = this.module();

    this.enrollmentsService
      .recordProgress(lesson.id, lesson.video?.durationSeconds ?? 0, module?.id)
      .subscribe(() => {
        if (module) {
          this.refreshModuleProgress(module.id);
        } else if (this.courseId) {
          this.refreshCourseTrackProgress(this.courseId);
        }
      });
  }
}
