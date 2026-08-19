import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Upload } from 'tus-js-client';
import { environment } from '../../../environments/environment';
import { Lesson } from '../models/academic.model';

export interface LessonFormPayload {
  moduleId: string;
  title: string;
  description?: string;
  mandatory?: boolean;
}

export interface DirectUploadCredentials {
  tusEndpoint: string;
  videoId: string;
  libraryId: string;
  authorizationSignature: string;
  authorizationExpire: number;
  playbackUrl: string;
  thumbnailUrl?: string;
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

  private initVideoUpload(id: string) {
    return this.http.post<DirectUploadCredentials>(`${environment.apiUrl}/lessons/${id}/video/init`, {});
  }

  private completeVideoUpload(id: string, payload: { videoId: string; playbackUrl: string; thumbnailUrl?: string }) {
    return this.http.post<Lesson>(`${environment.apiUrl}/lessons/${id}/video/complete`, payload);
  }

  /**
   * O arquivo vai direto do navegador para o Bunny.net (protocolo TUS,
   * resumível) — nunca passa pelo nosso backend, evitando o limite de
   * corpo do nginx e o gargalo de memória de instâncias pequenas.
   */
  uploadVideoDirect(lessonId: string, file: File, onProgress?: (percent: number) => void): Promise<Lesson> {
    return new Promise((resolve, reject) => {
      this.initVideoUpload(lessonId).subscribe({
        next: (creds) => {
          const upload = new Upload(file, {
            endpoint: creds.tusEndpoint,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: {
              AuthorizationSignature: creds.authorizationSignature,
              AuthorizationExpire: String(creds.authorizationExpire),
              VideoId: creds.videoId,
              LibraryId: String(creds.libraryId),
            },
            metadata: {
              filetype: file.type,
              title: file.name,
            },
            onError: (error) => reject(error),
            onProgress: (bytesSent, bytesTotal) => {
              onProgress?.(Math.round((bytesSent / bytesTotal) * 100));
            },
            onSuccess: () => {
              this.completeVideoUpload(lessonId, {
                videoId: creds.videoId,
                playbackUrl: creds.playbackUrl,
                thumbnailUrl: creds.thumbnailUrl,
              }).subscribe({
                next: (lesson) => resolve(lesson),
                error: (err) => reject(err),
              });
            },
          });
          upload.start();
        },
        error: (err) => reject(err),
      });
    });
  }
}
