import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { ComingSoonComponent } from './shared/components/coming-soon.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },

  {
    path: 'auth/login',
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./auth/register/register.component').then((m) => m.RegisterComponent),
  },

  {
    path: 'student',
    canActivate: [authGuard, roleGuard(['student'])],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./student/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'course-player/:moduleId/:lessonId',
        loadComponent: () =>
          import('./student/course-player/course-player.component').then(
            (m) => m.CoursePlayerComponent,
          ),
      },
      {
        path: 'course-player/curso/:courseId/:lessonId',
        loadComponent: () =>
          import('./student/course-player/course-player.component').then(
            (m) => m.CoursePlayerComponent,
          ),
      },
      {
        path: 'cursos/:id',
        loadComponent: () =>
          import('./student/course-detail/course-detail.component').then(
            (m) => m.StudentCourseDetailComponent,
          ),
      },
      {
        path: 'exams/:examId',
        loadComponent: () =>
          import('./student/exams/exam-take.component').then((m) => m.ExamTakeComponent),
      },
      {
        path: 'certificates',
        loadComponent: () =>
          import('./student/certificates/certificates.component').then(
            (m) => m.CertificatesComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./shared/pages/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'meus-cursos',
        loadComponent: () =>
          import('./student/my-courses/my-courses.component').then((m) => m.MyCoursesComponent),
      },
      {
        path: 'explorar',
        loadComponent: () =>
          import('./student/explore/explore.component').then((m) => m.ExploreComponent),
      },
      { path: 'wishlist', component: ComingSoonComponent, data: { title: 'Wishlist' } },
      { path: 'historico', component: ComingSoonComponent, data: { title: 'Histórico' } },
      {
        path: 'configuracoes',
        component: ComingSoonComponent,
        data: { title: 'Configurações' },
      },
      { path: 'ajuda', component: ComingSoonComponent, data: { title: 'Ajuda' } },
    ],
  },

  {
    path: 'teacher',
    canActivate: [authGuard, roleGuard(['teacher', 'admin'])],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./teacher/dashboard/dashboard.component').then(
            (m) => m.TeacherDashboardComponent,
          ),
      },
      {
        path: 'courses',
        loadComponent: () =>
          import('./shared/pages/courses-list.component').then((m) => m.CoursesListComponent),
      },
      {
        path: 'courses/:id',
        loadComponent: () =>
          import('./shared/pages/course-detail.component').then((m) => m.CourseDetailComponent),
      },
      {
        path: 'courses/:courseId/modules/:moduleId',
        loadComponent: () =>
          import('./shared/pages/module-detail.component').then((m) => m.ModuleDetailComponent),
      },
      { path: 'exams', component: ComingSoonComponent, data: { title: 'Avaliações' } },
      {
        path: 'students',
        loadComponent: () =>
          import('./shared/pages/role-users.component').then((m) => m.RoleUsersComponent),
        data: { role: 'student', title: 'Alunos matriculados', readOnly: true },
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./shared/pages/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },

  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['admin'])],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./admin/dashboard/dashboard.component').then((m) => m.AdminDashboardComponent),
      },
      {
        path: 'students',
        loadComponent: () =>
          import('./shared/pages/role-users.component').then((m) => m.RoleUsersComponent),
        data: { role: 'student', title: 'Alunos' },
      },
      {
        path: 'teachers',
        loadComponent: () =>
          import('./shared/pages/role-users.component').then((m) => m.RoleUsersComponent),
        data: { role: 'teacher', title: 'Professores' },
      },
      {
        path: 'admins',
        loadComponent: () =>
          import('./shared/pages/role-users.component').then((m) => m.RoleUsersComponent),
        data: { role: 'admin', title: 'Administradores' },
      },
      {
        path: 'courses',
        loadComponent: () =>
          import('./shared/pages/courses-list.component').then((m) => m.CoursesListComponent),
      },
      {
        path: 'courses/:id',
        loadComponent: () =>
          import('./shared/pages/course-detail.component').then((m) => m.CourseDetailComponent),
      },
      {
        path: 'courses/:courseId/modules/:moduleId',
        loadComponent: () =>
          import('./shared/pages/module-detail.component').then((m) => m.ModuleDetailComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./admin/reports/reports.component').then((m) => m.AdminReportsComponent),
      },
      {
        path: 'configuracoes',
        loadComponent: () =>
          import('./admin/configuracoes/configuracoes.component').then(
            (m) => m.ConfiguracoesComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./shared/pages/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },

  { path: '**', redirectTo: 'auth/login' },
];
