import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  readonly users = signal<UserListItem[]>([]);
  readonly isLoading = signal(false);

  loadUsers(): Observable<UserListItem[]> {
    this.isLoading.set(true);
    return this.http.get<UserListItem[]>('/api/users').pipe(
      tap(users => this.users.set(users)),
      finalize(() => this.isLoading.set(false)),
    );
  }
}
