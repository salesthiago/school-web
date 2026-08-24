export interface DailySeriesPoint {
  date: string;
  value: number;
}

export interface MostWatchedCourse {
  courseId: string;
  title: string;
  totalWatchedSeconds: number;
  avgPercentage: number;
  viewerCount: number;
}

export interface RegistrationsReport {
  totalStudents: number;
  series: DailySeriesPoint[];
}

export interface StudentWithoutCourse {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface CompletionRateItem {
  courseId: string;
  title: string;
  enrolledCount: number;
  completedCount: number;
  completionRatePercent: number;
}

export interface RevenueByCourse {
  courseId: string;
  title: string;
  total: number;
  orders: number;
}

export interface RevenueReport {
  byCourse: RevenueByCourse[];
  series: DailySeriesPoint[];
}

export interface ExamPerformanceItem {
  examId: string;
  examTitle: string;
  courseTitle: string;
  attempts: number;
  passRatePercent: number;
  avgScore: number;
}

export interface CertificatesByCourse {
  courseId: string;
  title: string;
  count: number;
}

export interface CertificatesIssuedReport {
  byCourse: CertificatesByCourse[];
  series: DailySeriesPoint[];
}
