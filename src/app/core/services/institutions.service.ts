import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Institution } from '../models/academic.model';

@Injectable({ providedIn: 'root' })
export class InstitutionsService {
  constructor(private http: HttpClient) {}

  getPublic() {
    return this.http.get<Institution>(`${environment.apiUrl}/institutions/public`);
  }

  update(id: string, dto: Partial<Institution>) {
    return this.http.put<Institution>(`${environment.apiUrl}/institutions/${id}`, dto);
  }

  uploadLogo(id: string, file: File) {
    return this.upload(id, 'logo', file);
  }

  uploadLoginBackground(id: string, file: File) {
    return this.upload(id, 'login-background', file);
  }

  uploadRegisterBackground(id: string, file: File) {
    return this.upload(id, 'register-background', file);
  }

  uploadStudentBanner(id: string, file: File) {
    return this.upload(id, 'student-banner', file);
  }

  private upload(id: string, path: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Institution>(`${environment.apiUrl}/institutions/${id}/${path}`, formData);
  }
}
