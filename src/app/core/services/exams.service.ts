import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type ExamScope = 'lesson' | 'module' | 'course';

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
  scope: ExamScope;
  moduleId?: string;
  courseId: string;
}

export interface ExamSummary {
  id: string;
  title: string;
}

export interface ExamDetail {
  id: string;
  title: string;
  scope: ExamScope;
  lessonId?: string;
  moduleId?: string;
  courseId: string;
  minScorePercent: number;
  maxAttempts: number;
  allowRetake: boolean;
  showCorrectAnswers: boolean;
  immediateResult: boolean;
  published: boolean;
}

export interface TeacherQuestionOption {
  text: string;
  correct: boolean;
}

export interface TeacherQuestion {
  id: string;
  text: string;
  type: 'single' | 'multiple';
  options: TeacherQuestionOption[];
  order: number;
}

export interface ExamFormPayload {
  title: string;
  scope: ExamScope;
  lessonId?: string;
  moduleId?: string;
  courseId?: string;
  minScorePercent?: number;
  maxAttempts?: number;
  allowRetake?: boolean;
  showCorrectAnswers?: boolean;
  immediateResult?: boolean;
}

export interface QuestionFormPayload {
  text: string;
  type: 'single' | 'multiple';
  options: TeacherQuestionOption[];
  order?: number;
}

@Injectable({ providedIn: 'root' })
export class ExamsService {
  constructor(private http: HttpClient) {}

  listByModule(moduleId: string) {
    return this.http.get<ExamSummary[]>(`${environment.apiUrl}/exams`, {
      params: { moduleId },
    });
  }

  listByLesson(lessonId: string) {
    return this.http.get<ExamSummary[]>(`${environment.apiUrl}/exams`, {
      params: { lessonId },
    });
  }

  listByCourseScope(courseId: string) {
    return this.http.get<ExamSummary[]>(`${environment.apiUrl}/exams`, {
      params: { courseId },
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

  // ---------- Gestão (professor/admin) ----------

  getManage(examId: string) {
    return this.http.get<{ exam: ExamDetail; questions: TeacherQuestion[] }>(
      `${environment.apiUrl}/exams/${examId}/manage`,
    );
  }

  createExam(payload: ExamFormPayload) {
    return this.http.post<ExamDetail>(`${environment.apiUrl}/exams`, payload);
  }

  updateExam(examId: string, payload: Partial<ExamFormPayload>) {
    return this.http.patch<ExamDetail>(`${environment.apiUrl}/exams/${examId}`, payload);
  }

  deleteExam(examId: string) {
    return this.http.delete<void>(`${environment.apiUrl}/exams/${examId}`);
  }

  createQuestion(examId: string, payload: QuestionFormPayload) {
    return this.http.post<TeacherQuestion>(`${environment.apiUrl}/exams/${examId}/questions`, payload);
  }

  updateQuestion(questionId: string, payload: Partial<QuestionFormPayload>) {
    return this.http.patch<TeacherQuestion>(`${environment.apiUrl}/exams/questions/${questionId}`, payload);
  }

  deleteQuestion(questionId: string) {
    return this.http.delete<void>(`${environment.apiUrl}/exams/questions/${questionId}`);
  }
}
