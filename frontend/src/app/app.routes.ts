import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { mustChangePasswordGuard } from './core/guards/must-change-password.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'links', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'change-password',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./auth/change-password/change-password.component').then(
        (m) => m.ChangePasswordComponent,
      ),
  },
  {
    path: 'account/change-password',
    canActivate: [authGuard, mustChangePasswordGuard],
    loadComponent: () =>
      import('./account/change-password/change-password.component').then(
        (m) => m.ChangePasswordComponent,
      ),
  },
  {
    path: 'profile',
    canActivate: [authGuard, mustChangePasswordGuard],
    loadComponent: () => import('./profile/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard, mustChangePasswordGuard],
    loadComponent: () => import('./links/links.component').then((m) => m.LinksComponent),
  },
  {
    path: 'settings',
    canActivate: [authGuard, mustChangePasswordGuard],
    loadChildren: () => import('./settings/settings.routes').then((r) => r.settingsRoutes),
  },
  {
    path: 'recipes',
    canActivate: [authGuard, mustChangePasswordGuard],
    loadChildren: () => import('./recipes/recipes.routes').then((r) => r.recipesRoutes),
  },
  {
    path: 'notes',
    canActivate: [authGuard, mustChangePasswordGuard],
    loadComponent: () => import('./notes/notes.component').then((m) => m.NotesComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard, mustChangePasswordGuard, adminGuard],
    loadComponent: () => import('./admin/admin-panel.component').then((m) => m.AdminPanelComponent),
  },
  {
    path: 'share',
    loadChildren: () => import('./share/share.routes').then((r) => r.shareRoutes),
  },
  { path: '**', redirectTo: '/dashboard' },
];
