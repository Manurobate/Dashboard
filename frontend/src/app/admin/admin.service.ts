import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize, catchError, of } from 'rxjs';

export interface UserListItem {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'user';
  mustChangePassword: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserResponse {
  user: UserListItem;
  temporaryPassword: string;
}

export interface ResetPasswordResponse {
  temporaryPassword: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  readonly users = signal<UserListItem[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  loadUsers(): Observable<UserListItem[]> {
    this.isLoading.set(true);
    this.users.set([]);
    this.error.set(null);
    return this.http.get<UserListItem[]>('/api/users').pipe(
      tap(users => this.users.set(users)),
      catchError(() => {
        this.error.set('Impossible de charger la liste des utilisateurs.');
        return of([]);
      }),
      finalize(() => this.isLoading.set(false)),
    );
  }

  createUser(username: string, name: string): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>('/api/users', { username, name });
  }

  resetPassword(userId: number): Observable<ResetPasswordResponse> {
    return this.http.patch<ResetPasswordResponse>(`/api/users/${userId}/reset-password`, {});
  }
}
