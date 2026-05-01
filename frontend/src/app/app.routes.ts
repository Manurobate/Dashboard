import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'links', pathMatch: 'full' },
  {
    path: 'links',
    loadComponent: () => import('./links/links.component').then(m => m.LinksComponent),
  },
  {
    path: 'recipes',
    loadComponent: () => import('./recipes/recipes.component').then(m => m.RecipesComponent),
  },
  {
    path: 'notes',
    loadComponent: () => import('./notes/notes.component').then(m => m.NotesComponent),
  },
];
