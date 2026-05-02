import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'links', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'links',
    canActivate: [authGuard],
    loadComponent: () => import('./links/links.component').then(m => m.LinksComponent),
  },
  {
    path: 'recipes',
    canActivate: [authGuard],
    loadComponent: () => import('./recipes/recipes.component').then(m => m.RecipesComponent),
  },
  {
    path: 'notes',
    canActivate: [authGuard],
    loadComponent: () => import('./notes/notes.component').then(m => m.NotesComponent),
  },
  {
    path: 'share',
    loadChildren: () => import('./share/share.routes').then(r => r.shareRoutes),
  },
];
