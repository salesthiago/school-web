import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotesService {
  constructor(private http: HttpClient) {}

  getForLesson(lessonId: string) {
    return this.http.get<{ text: string }>(`${environment.apiUrl}/notes/lesson/${lessonId}`);
  }

  save(lessonId: string, text: string) {
    return this.http.put<{ text: string }>(`${environment.apiUrl}/notes/lesson/${lessonId}`, { text });
  }
}
