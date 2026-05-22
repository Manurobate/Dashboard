import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize, catchError, of } from 'rxjs';

export interface LinkCategory {
  id: number;
  name: string;
  icon: string | null;
  position: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class LinkCategoriesService {
  private readonly http = inject(HttpClient);

  readonly categories = signal<LinkCategory[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  loadCategories(): Observable<LinkCategory[]> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.get<LinkCategory[]>('/api/link-categories').pipe(
      tap((cats) => this.categories.set(cats)),
      catchError(() => {
        this.error.set('Impossible de charger les catégories.');
        return of([]);
      }),
      finalize(() => this.isLoading.set(false)),
    );
  }

  createCategory(name: string, icon?: string | null): Observable<LinkCategory> {
    return this.http.post<LinkCategory>('/api/link-categories', { name, icon });
  }

  updateCategory(id: number, name?: string, icon?: string | null): Observable<LinkCategory> {
    return this.http.patch<LinkCategory>(`/api/link-categories/${id}`, { name, icon });
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`/api/link-categories/${id}`);
  }

  reorderCategories(items: { id: number; position: number }[]): Observable<void> {
    return this.http.patch<void>('/api/link-categories/reorder', { items });
  }
}
