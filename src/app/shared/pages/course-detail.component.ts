import { Component, Input, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { QuillEditorComponent } from 'ngx-quill';
import { Observable, forkJoin, of, Subscription, interval, switchMap, take, takeWhile } from 'rxjs';
import { CoursesService } from '../../core/services/courses.service';
import { LessonsService } from '../../core/services/lessons.service';
import { AttachmentsService } from '../../core/services/attachments.service';
import { AuthService } from '../../core/services/auth.service';
import { Attachment, Course, CourseModule, Lesson } from '../../core/models/academic.model';
import { DashboardShellComponent } from '../components/dashboard-shell.component';
import { IconButtonComponent } from '../components/icon-button.component';
import { ExamManagerComponent } from '../components/exam-manager.component';
import { ADMIN_NAV_ITEMS, TEACHER_NAV_ITEMS } from '../nav-items';

const VIDEO_POLL_INTERVAL_MS = 8000;
const VIDEO_POLL_MAX_ATTEMPTS = 100;

type Tab = 'dados' | 'estrutura' | 'configuracoes';
type ModuleDeleteChoice = 'move-none' | 'move-module' | 'delete-all';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    QuillEditorComponent,
    DashboardShellComponent,
    IconButtonComponent,
    ExamManagerComponent,
  ],
  templateUrl: './course-detail.component.html',
  styleUrl: './course-detail.component.scss',
})
export class CourseDetailComponent implements OnInit, OnDestroy {
  @Input({ required: true }) id!: string;

  activeTab = signal<Tab>('dados');

  loading = signal(true);
  course = signal<Course | null>(null);
  modules = signal<CourseModule[]>([]);
  lessons = signal<Lesson[]>([]);
  looseLessons = computed(() => this.lessons().filter((l) => !l.moduleId));

  savingCourse = signal(false);
  uploadingCover = signal(false);
  courseError = signal<string | null>(null);
  courseSaved = signal(false);

  savingPricing = signal(false);
  pricingError = signal<string | null>(null);
  pricingSaved = signal(false);

  moduleFormOpen = signal(false);
  editingModule = signal<CourseModule | null>(null);
  savingModule = signal(false);
  moduleError = signal<string | null>(null);

  lessonFormOpen = signal(false);
  editingLesson = signal<Lesson | null>(null);
  savingLesson = signal(false);
  lessonError = signal<string | null>(null);
  uploadingVideoFor = signal<string | null>(null);
  videoUploadProgress = signal(0);

  expandedLessonId = signal<string | null>(null);
  expandedQuizLessonId = signal<string | null>(null);
  attachmentsByLesson = signal<Record<string, Attachment[]>>({});
  uploadingAttachmentFor = signal<string | null>(null);

  moduleToDelete = signal<CourseModule | null>(null);
  moduleDeleteChoice = signal<ModuleDeleteChoice>('move-none');
  moduleDeleteTarget = signal<string | null>(null);
  deletingModule = signal(false);

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private pollingSubs = new Map<string, Subscription>();

  courseForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    published: [false],
  });

  pricingForm = this.fb.nonNullable.group({
    free: [true],
    bundlePrice: [0, [Validators.min(0)]],
    examWeightPercent: [10, [Validators.min(0), Validators.max(100)]],
  });

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
    organizeMode: ['none' as 'none' | 'module'],
    moduleId: [''],
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

  ngOnDestroy() {
    for (const sub of this.pollingSubs.values()) sub.unsubscribe();
  }

  setTab(tab: Tab) {
    this.activeTab.set(tab);
  }

  load() {
    this.loading.set(true);
    this.coursesService.getCourse(this.id).subscribe((course) => {
      this.course.set(course);
      this.courseForm.reset({
        title: course.title,
        description: course.description ?? '',
        published: course.published,
      });
      this.pricingForm.reset({
        free: course.free ?? true,
        bundlePrice: course.bundlePrice ?? 0,
        examWeightPercent: course.examWeightPercent ?? 10,
      });
      this.loading.set(false);
    });
    this.coursesService.listModules(this.id).subscribe((modules) => this.modules.set(modules));
    this.loadLessons();
  }

  loadLessons() {
    this.lessonsService.listByCourse(this.id).subscribe((lessons) => {
      this.lessons.set(lessons);
      for (const lesson of lessons) {
        if (!lesson.moduleId && lesson.video?.status === 'processing') {
          this.pollLessonStatus(lesson.id);
        }
      }
    });
  }

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

  submitCourse() {
    if (this.courseForm.invalid) return;
    this.savingCourse.set(true);
    this.courseError.set(null);
    this.courseSaved.set(false);
    this.coursesService.updateCourse(this.id, this.courseForm.getRawValue()).subscribe({
      next: (course) => {
        this.course.set(course);
        this.savingCourse.set(false);
        this.courseSaved.set(true);
      },
      error: (err) => {
        this.savingCourse.set(false);
        this.courseError.set(err?.error?.message ?? 'Não foi possível salvar o curso.');
      },
    });
  }

  submitPricing() {
    this.savingPricing.set(true);
    this.pricingError.set(null);
    this.pricingSaved.set(false);
    this.coursesService.updateCourse(this.id, this.pricingForm.getRawValue()).subscribe({
      next: (course) => {
        this.course.set(course);
        this.savingPricing.set(false);
        this.pricingSaved.set(true);
      },
      error: (err) => {
        this.savingPricing.set(false);
        this.pricingError.set(err?.error?.message ?? 'Não foi possível salvar o preço.');
      },
    });
  }

  onCoverSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingCover.set(true);
    this.coursesService.uploadCourseCover(this.id, file).subscribe({
      next: (course) => {
        this.course.set(course);
        this.uploadingCover.set(false);
      },
      error: () => this.uploadingCover.set(false),
    });
  }

  deleteCourse() {
    const course = this.course();
    if (!course) return;
    const confirmed = window.confirm(
      `Excluir o curso "${course.title}"? Isso remove todos os módulos e aulas dele.`,
    );
    if (!confirmed) return;
    this.coursesService.deleteCourse(this.id).subscribe({
      next: () => this.router.navigate([this.basePath]),
      error: (err) => window.alert(err?.error?.message ?? 'Não foi possível excluir o curso.'),
    });
  }

  // ---------- Módulos ----------

  openModuleCreate() {
    this.editingModule.set(null);
    this.moduleError.set(null);
    this.moduleForm.reset({
      title: '',
      description: '',
      price: 0,
      free: false,
      workloadHours: 0,
      published: false,
    });
    this.moduleFormOpen.set(true);
  }

  openModuleEdit(module: CourseModule) {
    this.editingModule.set(module);
    this.moduleError.set(null);
    this.moduleForm.reset({
      title: module.title,
      description: module.description ?? '',
      price: module.price,
      free: module.free,
      workloadHours: module.workloadHours,
      published: module.published,
    });
    this.moduleFormOpen.set(true);
  }

  closeModuleForm() {
    this.moduleFormOpen.set(false);
    this.editingModule.set(null);
  }

  submitModule() {
    if (this.moduleForm.invalid) return;
    this.savingModule.set(true);
    this.moduleError.set(null);
    const value = this.moduleForm.getRawValue();
    const editing = this.editingModule();

    const request = editing
      ? this.coursesService.updateModule(editing.id, value)
      : this.coursesService.createModule({ ...value, courseId: this.id });

    request.subscribe({
      next: () => {
        this.savingModule.set(false);
        this.closeModuleForm();
        this.coursesService.listModules(this.id).subscribe((modules) => this.modules.set(modules));
      },
      error: (err) => {
        this.savingModule.set(false);
        this.moduleError.set(err?.error?.message ?? 'Não foi possível salvar o módulo.');
      },
    });
  }

  openModule(module: CourseModule) {
    this.router.navigate([this.basePath, this.id, 'modules', module.id]);
  }

  lessonCountFor(moduleId: string): number {
    return this.lessons().filter((l) => l.moduleId === moduleId).length;
  }

  priceLabel(module: CourseModule): string {
    if (module.free) return 'Grátis';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(module.price);
  }

  // ---------- Exclusão de módulo (com opções pras aulas dentro) ----------

  openModuleDelete(module: CourseModule) {
    this.moduleToDelete.set(module);
    this.moduleDeleteChoice.set(this.lessonCountFor(module.id) > 0 ? 'move-none' : 'delete-all');
    this.moduleDeleteTarget.set(this.modules().find((m) => m.id !== module.id)?.id ?? null);
  }

  closeModuleDelete() {
    this.moduleToDelete.set(null);
  }

  otherModules(): CourseModule[] {
    const current = this.moduleToDelete();
    return this.modules().filter((m) => m.id !== current?.id);
  }

  confirmModuleDelete() {
    const module = this.moduleToDelete();
    if (!module) return;
    const choice = this.moduleDeleteChoice();
    this.deletingModule.set(true);

    const lessonsInModule = this.lessons().filter((l) => l.moduleId === module.id);
    const reassignTargetId = choice === 'move-module' ? this.moduleDeleteTarget() : null;

    const reassign$: Observable<unknown> =
      choice === 'delete-all' || lessonsInModule.length === 0
        ? of(null)
        : forkJoin(
            lessonsInModule.map((l) =>
              this.lessonsService.updateLesson(l.id, { moduleId: reassignTargetId }),
            ),
          );

    reassign$.subscribe({
      next: () => {
        this.coursesService.deleteModule(module.id).subscribe({
          next: () => {
            this.deletingModule.set(false);
            this.modules.update((list) => list.filter((m) => m.id !== module.id));
            this.moduleToDelete.set(null);
            this.loadLessons();
          },
          error: (err) => {
            this.deletingModule.set(false);
            window.alert(err?.error?.message ?? 'Não foi possível excluir o módulo.');
          },
        });
      },
      error: (err) => {
        this.deletingModule.set(false);
        window.alert(err?.error?.message ?? 'Não foi possível reorganizar as aulas do módulo.');
      },
    });
  }

  // ---------- Aulas avulsas ----------

  openLessonCreate() {
    this.editingLesson.set(null);
    this.lessonError.set(null);
    this.lessonForm.reset({
      title: '',
      description: '',
      mandatory: true,
      published: false,
      organizeMode: 'none',
      moduleId: '',
    });
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
      organizeMode: lesson.moduleId ? 'module' : 'none',
      moduleId: lesson.moduleId ?? '',
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
    const { organizeMode, moduleId, ...rest } = this.lessonForm.getRawValue();
    const moduleValue = organizeMode === 'module' && moduleId ? moduleId : null;
    const editing = this.editingLesson();

    const request = editing
      ? this.lessonsService.updateLesson(editing.id, { ...rest, moduleId: moduleValue })
      : this.lessonsService.createLesson({
          ...rest,
          courseId: this.id,
          moduleId: moduleValue ?? undefined,
        });

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

  removeVideo(lesson: Lesson) {
    const confirmed = window.confirm(`Remover o vídeo da aula "${lesson.title}"? Você poderá enviar outro em seguida.`);
    if (!confirmed) return;
    this.lessonsService.removeVideo(lesson.id).subscribe({
      next: (updated) => {
        this.pollingSubs.get(lesson.id)?.unsubscribe();
        this.pollingSubs.delete(lesson.id);
        this.lessons.update((list) => list.map((l) => (l.id === lesson.id ? updated : l)));
      },
      error: (err) => window.alert(err?.error?.message ?? 'Não foi possível remover o vídeo.'),
    });
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

  toggleQuiz(lesson: Lesson) {
    this.expandedQuizLessonId.set(this.expandedQuizLessonId() === lesson.id ? null : lesson.id);
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
