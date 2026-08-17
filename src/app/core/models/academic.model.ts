export interface Institution {
  id: string;
  name: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  teacherId: string;
  published: boolean;
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  order: number;
  price: number;
  free: boolean;
  published: boolean;
  completionThresholdPercent: number;
  workloadHours: number;
}

export interface VideoMeta {
  provider: string;
  externalId: string;
  playbackUrl?: string;
  durationSeconds: number;
  thumbnailUrl?: string;
}

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  moduleId: string;
  video: VideoMeta;
  order: number;
  mandatory: boolean;
  published: boolean;
}

export interface Enrollment {
  id: string;
  studentId: string;
  moduleId: CourseModule | string;
  courseId: Course | string;
  status: 'active' | 'revoked';
}

export interface ModuleProgressSummary {
  totalMandatoryLessons: number;
  completedLessons: number;
  percentage: number;
  nextLessonId: string | null;
}

export interface Certificate {
  id: string;
  code: string;
  studentName: string;
  moduleTitle: string;
  teacherName: string;
  workloadHours: number;
  issuedAt: string;
}
