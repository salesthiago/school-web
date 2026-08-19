import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { QuillEditorComponent } from 'ngx-quill';
import { CoursesService } from '../../core/services/courses.service';
import { AuthService } from '../../core/services/auth.service';
import { Course } from '../../core/models/academic.model';
import { DashboardShellComponent } from '../components/dashboard-shell.component';
import { IconButtonComponent } from '../components/icon-button.component';
import { ADMIN_NAV_ITEMS, TEACHER_NAV_ITEMS } from '../nav-items';

@Component({
  selector: 'app-courses-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    QuillEditorComponent,
    DashboardShellComponent,
    IconButtonComponent,
  ],
  templateUrl: './courses-list.component.html',
  styleUrl: './courses-list.component.scss',
})
export class CoursesListComponent implements OnInit {
  loading = signal(true);
  courses = signal<Course[]>([]);
  formOpen = signal(false);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  private fb = inject(FormBuilder);
  private router = inject(Router);

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
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
    this.coursesService.mine().subscribe((courses) => {
      this.courses.set(courses);
      this.loading.set(false);
    });
  }

  teacherName(course: Course): string {
    const teacher = course.teacherId;
    return typeof teacher === 'object' ? teacher.name : '';
  }

  openCreate() {
    this.errorMessage.set(null);
    this.form.reset({ title: '', description: '' });
    this.formOpen.set(true);
  }

  closeForm() {
    this.formOpen.set(false);
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.errorMessage.set(null);
    this.coursesService.createCourse(this.form.getRawValue()).subscribe({
      next: (course) => this.router.navigate([this.basePath, course.id]),
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Não foi possível criar o curso.');
      },
    });
  }

  open(course: Course) {
    this.router.navigate([this.basePath, course.id]);
  }

  remove(course: Course) {
    const confirmed = window.confirm(`Excluir o curso "${course.title}"? Isso também remove seus módulos e aulas.`);
    if (!confirmed) return;
    this.coursesService.deleteCourse(course.id).subscribe({
      next: () => this.load(),
      error: (err) => window.alert(err?.error?.message ?? 'Não foi possível excluir o curso.'),
    });
  }
}
