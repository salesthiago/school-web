export type Role = 'student' | 'teacher' | 'admin';

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
  avatarUrl?: string;
  socialLinks?: SocialLinks;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
