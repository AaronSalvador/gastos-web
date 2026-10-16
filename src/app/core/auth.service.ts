import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse } from './models';

const TOKEN_KEY = 'gastos_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly isLoggedIn = computed(() => !!this.token());
  readonly email = computed(() => this.readEmail(this.token()));

  getToken(): string | null {
    return this.token();
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password })
      .pipe(tap(res => this.save(res.token)));
  }

  register(fullName: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', { fullName, email, password })
      .pipe(tap(res => this.save(res.token)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
    this.router.navigate(['/login']);
  }

  private save(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.token.set(token);
  }

  // El JWT guarda el correo en el campo "sub" del payload.
  private readEmail(token: string | null): string {
    if (!token) return '';
    try {
      const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(payload)).sub ?? '';
    } catch {
      return '';
    }
  }
}
