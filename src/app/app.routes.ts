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
          import('./student/profile/profile.component').then((m) => m.ProfileComponent),
      },
      { path: 'meus-cursos', component: ComingSoonComponent, data: { title: 'Meus cursos' } },
      { path: 'explorar', component: ComingSoonComponent, data: { title: 'Explorar cursos' } },
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
      { path: 'courses', component: ComingSoonComponent, data: { title: 'Meus cursos' } },
      { path: 'modules', component: ComingSoonComponent, data: { title: 'Módulos' } },
      { path: 'lessons', component: ComingSoonComponent, data: { title: 'Aulas' } },
      { path: 'exams', component: ComingSoonComponent, data: { title: 'Avaliações' } },
      {
        path: 'students',
        loadComponent: () =>
          import('./shared/pages/role-users.component').then((m) => m.RoleUsersComponent),
        data: { role: 'student', title: 'Alunos matriculados', readOnly: true },
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
      { path: 'courses', component: ComingSoonComponent, data: { title: 'Cursos' } },
      { path: 'payments', component: ComingSoonComponent, data: { title: 'Pagamentos' } },
      { path: 'reports', component: ComingSoonComponent, data: { title: 'Relatórios' } },
      { path: 'settings', component: ComingSoonComponent, data: { title: 'Identidade visual' } },
      {
        path: 'video-settings',
        loadComponent: () =>
          import('./admin/video-settings/video-settings.component').then(
            (m) => m.VideoSettingsComponent,
          ),
      },
    ],
  },

  { path: '**', redirectTo: 'auth/login' },
];
