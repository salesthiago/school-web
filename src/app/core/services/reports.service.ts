import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  CertificatesIssuedReport,
  CompletionRateItem,
  ExamPerformanceItem,
  MostWatchedCourse,
  RegistrationsReport,
  RevenueReport,
  StudentWithoutCourse,
} from '../models/reports.model';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  constructor(private http: HttpClient) {}

  mostWatchedCourses() {
    return this.http.get<MostWatchedCourse[]>(`${environment.apiUrl}/reports/most-watched-courses`);
  }

  registrations(days: number) {
    return this.http.get<RegistrationsReport>(`${environment.apiUrl}/reports/registrations`, {
      params: { days },
    });
  }

  studentsWithoutCourses() {
    return this.http.get<StudentWithoutCourse[]>(`${environment.apiUrl}/reports/students-without-courses`);
  }

  completionRate() {
    return this.http.get<CompletionRateItem[]>(`${environment.apiUrl}/reports/completion-rate`);
  }

  revenue(days: number) {
    return this.http.get<RevenueReport>(`${environment.apiUrl}/reports/revenue`, {
      params: { days },
    });
  }

  examPerformance() {
    return this.http.get<ExamPerformanceItem[]>(`${environment.apiUrl}/reports/exam-performance`);
  }

  certificatesIssued(days: number) {
    return this.http.get<CertificatesIssuedReport>(`${environment.apiUrl}/reports/certificates-issued`, {
      params: { days },
    });
  }
}
