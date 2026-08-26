import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface CompletionStatus {
  completed: boolean;
  certificateId?: string;
}

export interface CourseFullStatus extends CompletionStatus {
  modules: { moduleId: string; title: string; completed: boolean }[];
  track: CompletionStatus | null;
  exam: { exists: boolean; examId?: string; passed: boolean };
}

/**
 * Dispara os checks de conclusão/certificado — hoje nada no backend chama isso sozinho, então
 * precisa ser acionado do frontend depois de qualquer evento que possa ter completado alguma
 * coisa (assistir aula até o fim, passar numa prova).
 */
@Injectable({ providedIn: 'root' })
export class CompletionService {
  constructor(private http: HttpClient) {}

  checkModule(moduleId: string) {
    return this.http.get<CompletionStatus>(`${environment.apiUrl}/completion/module/${moduleId}`);
  }

  checkCourseTrack(courseId: string) {
    return this.http.get<CompletionStatus>(`${environment.apiUrl}/completion/course/${courseId}`);
  }

  checkCourseFull(courseId: string) {
    return this.http.get<CourseFullStatus>(`${environment.apiUrl}/completion/course/${courseId}/full`);
  }
}
