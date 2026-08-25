import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Enrollment, ModuleProgressSummary } from '../models/academic.model';

@Injectable({ providedIn: 'root' })
export class EnrollmentsService {
  constructor(private http: HttpClient) {}

  myEnrollments() {
    return this.http.get<Enrollment[]>(`${environment.apiUrl}/enrollments/mine`);
  }

  enroll(moduleId: string) {
    return this.http.post<Enrollment>(`${environment.apiUrl}/enrollments/enroll`, { moduleId });
  }

  moduleProgress(moduleId: string) {
    return this.http.get<ModuleProgressSummary>(`${environment.apiUrl}/progress/module/${moduleId}`);
  }

  recordProgress(lessonId: string, moduleId: string, watchedSeconds: number) {
    return this.http.post(`${environment.apiUrl}/progress`, { lessonId, moduleId, watchedSeconds });
  }
}
