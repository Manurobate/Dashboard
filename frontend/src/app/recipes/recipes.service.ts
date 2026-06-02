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

export interface RecipeIngredientItem {
  id: number;
  quantity: number;
  unit: string | null;
  name: string;
  position: number;
  recipeId: number;
}

export interface RecipeStepItem {
  id: number;
  content: string;
  position: number;
  recipeId: number;
}

export interface RecipeDetail extends Recipe {
  ingredients: RecipeIngredientItem[];
  steps: RecipeStepItem[];
}

export interface IngredientPayload {
  quantity: number;
  unit: string | null;
  name: string;
  position: number;
}

export interface StepPayload {
  content: string;
  position: number;
}

export interface CreateRecipePayload {
  title: string;
  category?: string | null;
  servings?: number;
  imageUrl?: string | null;
  ingredients: IngredientPayload[];
  steps: StepPayload[];
}

export interface UpdateRecipePayload {
  title?: string;
  category?: string | null;
  servings?: number;
  imageUrl?: string | null;
  ingredients?: IngredientPayload[];
  steps?: StepPayload[];
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

  getRecipe(id: number): Observable<RecipeDetail> {
    return this.http.get<RecipeDetail>(`/api/recipes/${id}`);
  }

  createRecipe(dto: CreateRecipePayload): Observable<RecipeDetail> {
    return this.http
      .post<RecipeDetail>('/api/recipes', dto)
      .pipe(tap((created) => this.recipes.update((r) => [...r, created])));
  }

  updateRecipe(id: number, dto: UpdateRecipePayload): Observable<RecipeDetail> {
    return this.http.patch<RecipeDetail>(`/api/recipes/${id}`, dto).pipe(
      tap((updated) => {
        this.recipes.update((r) => r.map((x) => (x.id === id ? { ...x, ...updated } : x)));
      }),
    );
  }
}
