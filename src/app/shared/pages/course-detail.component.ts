import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { QuillEditorComponent } from 'ngx-quill';
import { CoursesService } from '../../core/services/courses.service';
import { AuthService } from '../../core/services/auth.service';
import { Course, CourseModule } from '../../core/models/academic.model';
import { DashboardShellComponent } from '../components/dashboard-shell.component';
import { IconButtonComponent } from '../components/icon-button.component';
import { ADMIN_NAV_ITEMS, TEACHER_NAV_ITEMS } from '../nav-items';

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
  ],
  templateUrl: './course-detail.component.html',
  styleUrl: './course-detail.component.scss',
})
export class CourseDetailComponent implements OnInit {
  @Input({ required: true }) id!: string;

  loading = signal(true);
  course = signal<Course | null>(null);
  modules = signal<CourseModule[]>([]);

  savingCourse = signal(false);
  uploadingCover = signal(false);
  courseError = signal<string | null>(null);
  courseSaved = signal(false);

  moduleFormOpen = signal(false);
  editingModule = signal<CourseModule | null>(null);
  savingModule = signal(false);
  moduleError = signal<string | null>(null);

  private fb = inject(FormBuilder);
  private router = inject(Router);

  courseForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    published: [false],
  });

  moduleForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    free: [false],
    workloadHours: [0, [Validators.min(0)]],
    published: [false],
  });

  constructor(
    private coursesService: CoursesService,
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
    this.coursesService.getCourse(this.id).subscribe((course) => {
      this.course.set(course);
      this.courseForm.reset({
        title: course.title,
        description: course.description ?? '',
        published: course.published,
      });
      this.loading.set(false);
    });
    this.coursesService.listModules(this.id).subscribe((modules) => this.modules.set(modules));
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

  removeModule(module: CourseModule) {
    const confirmed = window.confirm(
      `Excluir o módulo "${module.title}"? Isso remove suas aulas, anexos e matrículas.`,
    );
    if (!confirmed) return;
    this.coursesService.deleteModule(module.id).subscribe({
      next: () => this.modules.update((list) => list.filter((m) => m.id !== module.id)),
      error: (err) => window.alert(err?.error?.message ?? 'Não foi possível excluir o módulo.'),
    });
  }

  openModule(module: CourseModule) {
    this.router.navigate([this.basePath, this.id, 'modules', module.id]);
  }

  priceLabel(module: CourseModule): string {
    if (module.free) return 'Grátis';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(module.price);
  }
}
