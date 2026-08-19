import { Component, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QuillEditorComponent } from 'ngx-quill';
import { Subscription, interval, switchMap, take, takeWhile } from 'rxjs';
import { CoursesService } from '../../core/services/courses.service';
import { LessonsService } from '../../core/services/lessons.service';
import { AttachmentsService } from '../../core/services/attachments.service';
import { AuthService } from '../../core/services/auth.service';
import { Attachment, CourseModule, Lesson } from '../../core/models/academic.model';
import { DashboardShellComponent } from '../components/dashboard-shell.component';
import { IconButtonComponent } from '../components/icon-button.component';
import { ADMIN_NAV_ITEMS, TEACHER_NAV_ITEMS } from '../nav-items';

const VIDEO_POLL_INTERVAL_MS = 8000;
const VIDEO_POLL_MAX_ATTEMPTS = 100; // ~13min; depois disso, revisitar a página retoma o polling

@Component({
  selector: 'app-module-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    QuillEditorComponent,
    DashboardShellComponent,
    IconButtonComponent,
  ],
  templateUrl: './module-detail.component.html',
  styleUrl: './module-detail.component.scss',
})
export class ModuleDetailComponent implements OnInit, OnDestroy {
  @Input({ required: true }) courseId!: string;
  @Input({ required: true }) moduleId!: string;

  loading = signal(true);
  module = signal<CourseModule | null>(null);
  lessons = signal<Lesson[]>([]);

  savingModule = signal(false);
  uploadingCover = signal(false);
  moduleError = signal<string | null>(null);
  moduleSaved = signal(false);

  lessonFormOpen = signal(false);
  editingLesson = signal<Lesson | null>(null);
  savingLesson = signal(false);
  lessonError = signal<string | null>(null);
  uploadingVideoFor = signal<string | null>(null);
  videoUploadProgress = signal(0);

  expandedLessonId = signal<string | null>(null);
  attachmentsByLesson = signal<Record<string, Attachment[]>>({});
  uploadingAttachmentFor = signal<string | null>(null);

  private fb = inject(FormBuilder);
  private pollingSubs = new Map<string, Subscription>();

  moduleForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    free: [false],
    workloadHours: [0, [Validators.min(0)]],
    published: [false],
  });

  lessonForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    mandatory: [true],
    published: [false],
  });

  constructor(
    private coursesService: CoursesService,
    private lessonsService: LessonsService,
    private attachmentsService: AttachmentsService,
    public authService: AuthService,
  ) {}

  get navItems() {
    return this.authService.currentUser()?.role === 'admin' ? ADMIN_NAV_ITEMS : TEACHER_NAV_ITEMS;
  }

  get basePath(): string {
    return this.authService.currentUser()?.role === 'admin' ? '/admin/courses' : '/teacher/courses';
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.coursesService.getModule(this.moduleId).subscribe((module) => {
      this.module.set(module);
      this.moduleForm.reset({
        title: module.title,
        description: module.description ?? '',
        price: module.price,
        free: module.free,
        workloadHours: module.workloadHours,
        published: module.published,
      });
      this.loading.set(false);
    });
    this.loadLessons();
  }

  loadLessons() {
    this.lessonsService.listByModule(this.moduleId).subscribe((lessons) => {
      this.lessons.set(lessons);
      for (const lesson of lessons) {
        if (lesson.video?.status === 'processing') {
          this.pollLessonStatus(lesson.id);
        }
      }
    });
  }

  ngOnDestroy() {
    for (const sub of this.pollingSubs.values()) sub.unsubscribe();
  }

  /** Vídeo enviado ao Bunny ainda precisa processar — acompanha até ficar pronto/falhar. */
  private pollLessonStatus(lessonId: string) {
    if (this.pollingSubs.has(lessonId)) return;
    const sub = interval(VIDEO_POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => this.lessonsService.getLesson(lessonId)),
        takeWhile((lesson) => lesson.video?.status === 'processing', true),
        take(VIDEO_POLL_MAX_ATTEMPTS),
      )
      .subscribe({
        next: (updated) => {
          this.lessons.update((list) => list.map((l) => (l.id === lessonId ? updated : l)));
        },
        complete: () => this.pollingSubs.delete(lessonId),
      });
    this.pollingSubs.set(lessonId, sub);
  }

  submitModule() {
    if (this.moduleForm.invalid) return;
    this.savingModule.set(true);
    this.moduleError.set(null);
    this.moduleSaved.set(false);
    this.coursesService.updateModule(this.moduleId, this.moduleForm.getRawValue()).subscribe({
      next: (module) => {
        this.module.set(module);
        this.savingModule.set(false);
        this.moduleSaved.set(true);
      },
      error: (err) => {
        this.savingModule.set(false);
        this.moduleError.set(err?.error?.message ?? 'Não foi possível salvar o módulo.');
      },
    });
  }

  onCoverSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingCover.set(true);
    this.coursesService.uploadModuleCover(this.moduleId, file).subscribe({
      next: (module) => {
        this.module.set(module);
        this.uploadingCover.set(false);
      },
      error: () => this.uploadingCover.set(false),
    });
  }

  openLessonCreate() {
    this.editingLesson.set(null);
    this.lessonError.set(null);
    this.lessonForm.reset({ title: '', description: '', mandatory: true, published: false });
    this.lessonFormOpen.set(true);
  }

  openLessonEdit(lesson: Lesson) {
    this.editingLesson.set(lesson);
    this.lessonError.set(null);
    this.lessonForm.reset({
      title: lesson.title,
      description: lesson.description ?? '',
      mandatory: lesson.mandatory,
      published: lesson.published,
    });
    this.lessonFormOpen.set(true);
  }

  closeLessonForm() {
    this.lessonFormOpen.set(false);
    this.editingLesson.set(null);
  }

  submitLesson() {
    if (this.lessonForm.invalid) return;
    this.savingLesson.set(true);
    this.lessonError.set(null);
    const value = this.lessonForm.getRawValue();
    const editing = this.editingLesson();

    const request = editing
      ? this.lessonsService.updateLesson(editing.id, value)
      : this.lessonsService.createLesson({ ...value, moduleId: this.moduleId });

    request.subscribe({
      next: () => {
        this.savingLesson.set(false);
        this.closeLessonForm();
        this.loadLessons();
      },
      error: (err) => {
        this.savingLesson.set(false);
        this.lessonError.set(err?.error?.message ?? 'Não foi possível salvar a aula.');
      },
    });
  }

  removeLesson(lesson: Lesson) {
    const confirmed = window.confirm(`Excluir a aula "${lesson.title}"? Isso remove seus anexos também.`);
    if (!confirmed) return;
    this.lessonsService.deleteLesson(lesson.id).subscribe({
      next: () => {
        this.pollingSubs.get(lesson.id)?.unsubscribe();
        this.pollingSubs.delete(lesson.id);
        this.lessons.update((list) => list.filter((l) => l.id !== lesson.id));
      },
      error: (err) => window.alert(err?.error?.message ?? 'Não foi possível excluir a aula.'),
    });
  }

  async onVideoSelected(lesson: Lesson, event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingVideoFor.set(lesson.id);
    this.videoUploadProgress.set(0);
    try {
      const updated = await this.lessonsService.uploadVideoDirect(lesson.id, file, (percent) =>
        this.videoUploadProgress.set(percent),
      );
      this.lessons.update((list) => list.map((l) => (l.id === lesson.id ? updated : l)));
      this.uploadingVideoFor.set(null);
      if (updated.video?.status === 'processing') {
        this.pollLessonStatus(lesson.id);
      }
    } catch (err: unknown) {
      this.uploadingVideoFor.set(null);
      const message = (err as { message?: string })?.message;
      window.alert(message ?? 'Não foi possível enviar o vídeo.');
    }
  }

  toggleAttachments(lesson: Lesson) {
    if (this.expandedLessonId() === lesson.id) {
      this.expandedLessonId.set(null);
      return;
    }
    this.expandedLessonId.set(lesson.id);
    if (!this.attachmentsByLesson()[lesson.id]) {
      this.attachmentsService.listByLesson(lesson.id).subscribe((attachments) => {
        this.attachmentsByLesson.update((map) => ({ ...map, [lesson.id]: attachments }));
      });
    }
  }

  attachmentsFor(lessonId: string): Attachment[] {
    return this.attachmentsByLesson()[lessonId] ?? [];
  }

  onAttachmentSelected(lesson: Lesson, event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingAttachmentFor.set(lesson.id);
    this.attachmentsService.upload(lesson.id, file).subscribe({
      next: (attachment) => {
        this.attachmentsByLesson.update((map) => ({
          ...map,
          [lesson.id]: [...(map[lesson.id] ?? []), attachment],
        }));
        this.uploadingAttachmentFor.set(null);
      },
      error: (err) => {
        this.uploadingAttachmentFor.set(null);
        window.alert(err?.error?.message ?? 'Não foi possível enviar o anexo.');
      },
    });
  }

  removeAttachment(lesson: Lesson, attachment: Attachment) {
    const confirmed = window.confirm(`Excluir o anexo "${attachment.fileName}"?`);
    if (!confirmed) return;
    this.attachmentsService.remove(attachment.id).subscribe({
      next: () => {
        this.attachmentsByLesson.update((map) => ({
          ...map,
          [lesson.id]: (map[lesson.id] ?? []).filter((a) => a.id !== attachment.id),
        }));
      },
      error: (err) => window.alert(err?.error?.message ?? 'Não foi possível excluir o anexo.'),
    });
  }
}
