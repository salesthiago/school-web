import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ExamOption {
  index: number;
  text: string;
}

export interface ExamQuestion {
  id: string;
  text: string;
  type: 'single' | 'multiple';
  options: ExamOption[];
}

export interface AttemptResult {
  attemptId: string;
  scorePercent: number;
  passed: boolean;
  minScorePercent: number;
}

@Injectable({ providedIn: 'root' })
export class ExamsService {
  constructor(private http: HttpClient) {}

  listByModule(moduleId: string) {
    return this.http.get<{ id: string; title: string }[]>(`${environment.apiUrl}/exams`, {
      params: { moduleId },
    });
  }

  listByLesson(lessonId: string) {
    return this.http.get<{ id: string; title: string }[]>(`${environment.apiUrl}/exams`, {
      params: { lessonId },
    });
  }

  getQuestions(examId: string) {
    return this.http.get<ExamQuestion[]>(`${environment.apiUrl}/exams/${examId}/questions`);
  }

  submit(examId: string, answers: { questionId: string; selectedOptionIndexes: number[] }[]) {
    return this.http.post<AttemptResult>(`${environment.apiUrl}/exams/${examId}/attempts`, {
      answers,
    });
  }
}
