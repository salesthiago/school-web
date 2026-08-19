export type Role = 'student' | 'teacher' | 'admin';

export const ROLE_LABELS: Record<Role, string> = {
  student: 'Aluno',
  teacher: 'Professor',
  admin: 'Administrador',
};

export const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'student', label: ROLE_LABELS.student },
  { value: 'teacher', label: ROLE_LABELS.teacher },
  { value: 'admin', label: ROLE_LABELS.admin },
];

export interface SocialLinks {
  instagram?: string;
  twitter?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  institutionId?: string;
  active?: boolean;
  avatarUrl?: string;
  socialLinks?: SocialLinks;
  /** Só vem preenchido nas listagens filtradas por role=student. */
  hasEnrollments?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
