import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AdminStats, TeacherStats } from '../models/stats.model';

@Injectable({ providedIn: 'root' })
export class StatsService {
  constructor(private http: HttpClient) {}

  admin() {
    return this.http.get<AdminStats>(`${environment.apiUrl}/stats/admin`);
  }

  teacher() {
    return this.http.get<TeacherStats>(`${environment.apiUrl}/stats/teacher`);
  }
}
