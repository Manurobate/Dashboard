import { Routes } from '@angular/router';

export const recipesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./recipes.component').then((m) => m.RecipesComponent),
  },
  // Stories 5.3/5.4 ajouteront : new, :id/edit, :id
];
