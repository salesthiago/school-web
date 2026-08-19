import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Role, User } from '../models/user.model';

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  instagram?: string;
  twitter?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: Role;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  phone?: string;
  role?: Role;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private http: HttpClient) {}

  me() {
    return this.http.get<User>(`${environment.apiUrl}/users/me`);
  }

  updateProfile(payload: UpdateProfilePayload) {
    return this.http.patch<User>(`${environment.apiUrl}/users/me`, payload);
  }

  uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<User>(`${environment.apiUrl}/users/me/avatar`, formData);
  }

  list(role?: Role) {
    return this.http.get<User[]>(`${environment.apiUrl}/users`, {
      params: role ? { role } : {},
    });
  }

  create(payload: CreateUserPayload) {
    return this.http.post<User>(`${environment.apiUrl}/users`, payload);
  }

  update(id: string, payload: UpdateUserPayload) {
    return this.http.patch<User>(`${environment.apiUrl}/users/${id}`, payload);
  }

  resetPassword(id: string, password: string) {
    return this.http.patch<void>(`${environment.apiUrl}/users/${id}/password`, { password });
  }

  remove(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/users/${id}`);
  }
}
