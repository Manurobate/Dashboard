import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { mustChangePasswordGuard } from './core/guards/must-change-password.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'links', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'change-password',
    canActivate: [authGuard],
    loadComponent: () => import('./auth/change-password/change-password.component')
      .then(m => m.ChangePasswordComponent),
  },
  {
    path: 'links',
    canActivate: [authGuard, mustChangePasswordGuard],
    loadComponent: () => import('./links/links.component').then(m => m.LinksComponent),
  },
  {
    path: 'recipes',
    canActivate: [authGuard, mustChangePasswordGuard],
    loadComponent: () => import('./recipes/recipes.component').then(m => m.RecipesComponent),
  },
  {
    path: 'notes',
    canActivate: [authGuard, mustChangePasswordGuard],
    loadComponent: () => import('./notes/notes.component').then(m => m.NotesComponent),
  },
  {
    path: 'share',
    loadChildren: () => import('./share/share.routes').then(r => r.shareRoutes),
  },
];
