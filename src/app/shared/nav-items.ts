import { ShellNavItem } from './components/dashboard-shell.component';

export const STUDENT_NAV_ITEMS: ShellNavItem[] = [
  { label: 'Dashboard', link: '/student', exact: true, icon: 'home' },
  { label: 'Meus Cursos', link: '/student/meus-cursos', exact: false, icon: 'menu_book' },
  { label: 'Explorar Cursos', link: '/student/explorar', exact: false, icon: 'explore' },
  { label: 'Certificados', link: '/student/certificates', exact: false, icon: 'workspace_premium' },
  { label: 'Wishlist', link: '/student/wishlist', exact: false, icon: 'favorite' },
  { label: 'Histórico', link: '/student/historico', exact: false, icon: 'history' },
  { label: 'Perfil', link: '/student/profile', exact: false, icon: 'person' },
  { label: 'Configurações', link: '/student/configuracoes', exact: false, icon: 'settings' },
  { label: 'Ajuda', link: '/student/ajuda', exact: false, icon: 'help_outline' },
];

export const TEACHER_NAV_ITEMS: ShellNavItem[] = [
  { label: 'Dashboard', link: '/teacher', exact: true, icon: 'home' },
  { label: 'Meus cursos', link: '/teacher/courses', exact: false, icon: 'menu_book' },
  { label: 'Avaliações', link: '/teacher/exams', exact: false, icon: 'assignment' },
  { label: 'Alunos matriculados', link: '/teacher/students', exact: false, icon: 'group' },
];

export const ADMIN_NAV_ITEMS: ShellNavItem[] = [
  { label: 'Dashboard', link: '/admin', exact: true, icon: 'home' },
  { label: 'Alunos', link: '/admin/students', exact: false, icon: 'group' },
  { label: 'Professores', link: '/admin/teachers', exact: false, icon: 'school' },
  { label: 'Administradores', link: '/admin/admins', exact: false, icon: 'admin_panel_settings' },
  { label: 'Cursos', link: '/admin/courses', exact: false, icon: 'menu_book' },
  { label: 'Pagamentos', link: '/admin/payments', exact: false, icon: 'credit_card' },
  { label: 'Relatórios', link: '/admin/reports', exact: false, icon: 'bar_chart' },
  { label: 'Identidade visual', link: '/admin/settings', exact: false, icon: 'palette' },
  { label: 'Integração de vídeos', link: '/admin/video-settings', exact: false, icon: 'videocam' },
];
