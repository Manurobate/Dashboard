import { Routes } from '@angular/router';

export const recipesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./recipes.component').then((m) => m.RecipesComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./recipe-editor/recipe-editor.component').then((m) => m.RecipeEditorComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./recipe-detail/recipe-detail.component').then((m) => m.RecipeDetailComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./recipe-editor/recipe-editor.component').then((m) => m.RecipeEditorComponent),
  },
];
