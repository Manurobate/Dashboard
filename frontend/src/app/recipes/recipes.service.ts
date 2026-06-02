import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize, catchError, of, EMPTY } from 'rxjs';

export interface Recipe {
  id: number;
  title: string;
  category: string | null;
  servings: number;
  imageUrl: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class RecipesService {
  private readonly http = inject(HttpClient);

  readonly recipes = signal<Recipe[]>([]);
  readonly isLoading = signal(false);

  loadRecipes(): Observable<Recipe[]> {
    if (this.isLoading()) return EMPTY;
    this.isLoading.set(true);
    return this.http.get<Recipe[]>('/api/recipes').pipe(
      tap((recipes) => this.recipes.set(recipes)),
      catchError(() => {
        this.recipes.set([]);
        return of([]);
      }),
      finalize(() => this.isLoading.set(false)),
    );
  }
}
