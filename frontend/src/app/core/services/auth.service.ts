import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable, map, tap, catchError, of } from 'rxjs';

export interface AuthUser {
  id: number;
  username: string;
  role: 'admin' | 'user';
  mustChangePassword: boolean;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<AuthUser | null>(null);

  constructor(private readonly http: HttpClient) {}

  async login(username: string, password: string): Promise<AuthUser> {
    const user = await firstValueFrom(
      this.http.post<AuthUser>('/api/auth/login', { username, password }),
    );
    this.currentUser.set(user);
    return user;
  }

  async me(): Promise<AuthUser | null> {
    try {
      const user = await firstValueFrom(this.http.get<AuthUser>('/api/auth/me'));
      this.currentUser.set(user);
      return user;
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 401) {
        this.currentUser.set(null);
        return null;
      }
      throw err;
    }
  }

  refreshToken(): Observable<boolean> {
    return this.http.post<AuthUser>('/api/auth/refresh', {}).pipe(
      tap(user => this.currentUser.set(user)),
      map(() => true),
      catchError(() => {
        this.currentUser.set(null);
        return of(false);
      }),
    );
  }

  changePassword(newPassword: string, confirmPassword: string): Observable<AuthUser> {
    return this.http.patch<AuthUser>('/api/auth/change-password', { newPassword, confirmPassword }).pipe(
      tap(user => this.currentUser.set(user)),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}).pipe(
      catchError(() => of(undefined as void)),
      tap(() => this.currentUser.set(null)),
    );
  }
}
