import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthTokens, Role, User } from '../models/user.model';
import { UsersService } from './users.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  institutionId: string;
  exp: number;
}

const ACCESS_TOKEN_KEY = 'gpschool.accessToken';
const REFRESH_TOKEN_KEY = 'gpschool.refreshToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<User | null>(this.decodeUser());

  constructor(
    private http: HttpClient,
    private usersService: UsersService,
  ) {
    if (this.currentUser()) {
      this.refreshProfile();
    }
  }

  /** Busca o perfil completo (nome, avatar, redes sociais) — o JWT só carrega id/e-mail/role. */
  refreshProfile() {
    this.usersService.me().subscribe({
      next: (profile) => this.currentUser.set(profile),
      error: () => {},
    });
  }

  register(payload: { name: string; email: string; phone?: string; password: string }) {
    return this.http
      .post<AuthTokens>(`${environment.apiUrl}/auth/register`, payload)
      .pipe(tap((tokens) => this.storeTokens(tokens)));
  }

  login(email: string, password: string): Observable<AuthTokens> {
    return this.http
      .post<AuthTokens>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((tokens) => this.storeTokens(tokens)));
  }

  refresh(): Observable<AuthTokens> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    return this.http
      .post<AuthTokens>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(tap((tokens) => this.storeTokens(tokens)));
  }

  logout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.currentUser.set(null);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.currentUser();
  }

  private storeTokens(tokens: AuthTokens) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    this.currentUser.set(this.decodeUser());
    this.refreshProfile();
  }

  private decodeUser(): User | null {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as JwtPayload;
      if (payload.exp * 1000 < Date.now()) return null;
      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        institutionId: payload.institutionId,
        name: payload.email,
      };
    } catch {
      return null;
    }
  }
}
