export interface DailyCount {
  date: string;
  count: number;
}

export interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalEnrollments: number;
  newUsersByDay: DailyCount[];
  enrollmentsByDay: DailyCount[];
}

export interface TeacherStats {
  totalCourses: number;
  totalModules: number;
  totalStudents: number;
  totalEnrollments: number;
  enrollmentsByDay: DailyCount[];
}
