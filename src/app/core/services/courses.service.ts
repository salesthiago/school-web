import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Course, CourseModule, Lesson } from '../models/academic.model';

export interface CourseFormPayload {
  title: string;
  description?: string;
  /** Preço da trilha de aulas avulsas do curso (aulas sem módulo). */
  bundlePrice?: number;
  /** Trilha de aulas avulsas gratuita — ver bundlePrice. */
  free?: boolean;
}

export interface ModuleFormPayload {
  courseId: string;
  title: string;
  description?: string;
  price: number;
  free?: boolean;
  workloadHours?: number;
}

@Injectable({ providedIn: 'root' })
export class CoursesService {
  constructor(private http: HttpClient) {}

  listPublished() {
    return this.http.get<Course[]>(`${environment.apiUrl}/courses`);
  }

  /** Professor: só os próprios cursos. Admin: todos os cursos da plataforma. */
  mine() {
    return this.http.get<Course[]>(`${environment.apiUrl}/courses/mine`);
  }

  getCourse(id: string) {
    return this.http.get<Course>(`${environment.apiUrl}/courses/${id}`);
  }

  createCourse(payload: CourseFormPayload) {
    return this.http.post<Course>(`${environment.apiUrl}/courses`, payload);
  }

  updateCourse(id: string, payload: Partial<CourseFormPayload> & { published?: boolean }) {
    return this.http.patch<Course>(`${environment.apiUrl}/courses/${id}`, payload);
  }

  deleteCourse(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/courses/${id}`);
  }

  uploadCourseCover(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Course>(`${environment.apiUrl}/courses/${id}/cover`, formData);
  }

  listModules(courseId: string) {
    return this.http.get<CourseModule[]>(`${environment.apiUrl}/modules`, {
      params: { courseId },
    });
  }

  getModule(id: string) {
    return this.http.get<CourseModule>(`${environment.apiUrl}/modules/${id}`);
  }

  createModule(payload: ModuleFormPayload) {
    return this.http.post<CourseModule>(`${environment.apiUrl}/modules`, payload);
  }

  updateModule(
    id: string,
    payload: Partial<Omit<ModuleFormPayload, 'courseId'>> & { published?: boolean },
  ) {
    return this.http.patch<CourseModule>(`${environment.apiUrl}/modules/${id}`, payload);
  }

  deleteModule(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/modules/${id}`);
  }

  uploadModuleCover(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CourseModule>(`${environment.apiUrl}/modules/${id}/cover`, formData);
  }

  listLessons(moduleId: string) {
    return this.http.get<Lesson[]>(`${environment.apiUrl}/lessons`, { params: { moduleId } });
  }
}
