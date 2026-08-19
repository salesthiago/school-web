import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Lesson } from '../models/academic.model';

export interface LessonFormPayload {
  moduleId: string;
  title: string;
  description?: string;
  mandatory?: boolean;
}

@Injectable({ providedIn: 'root' })
export class LessonsService {
  constructor(private http: HttpClient) {}

  listByModule(moduleId: string) {
    return this.http.get<Lesson[]>(`${environment.apiUrl}/lessons`, { params: { moduleId } });
  }

  getLesson(id: string) {
    return this.http.get<Lesson>(`${environment.apiUrl}/lessons/${id}`);
  }

  createLesson(payload: LessonFormPayload) {
    return this.http.post<Lesson>(`${environment.apiUrl}/lessons`, payload);
  }

  updateLesson(id: string, payload: Partial<Omit<LessonFormPayload, 'moduleId'>> & { published?: boolean }) {
    return this.http.patch<Lesson>(`${environment.apiUrl}/lessons/${id}`, payload);
  }

  deleteLesson(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/lessons/${id}`);
  }

  uploadVideo(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Lesson>(`${environment.apiUrl}/lessons/${id}/video`, formData);
  }
}
