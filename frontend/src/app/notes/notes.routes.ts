import { Routes } from '@angular/router';

export const notesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./trilium-embed/trilium-embed.component').then((m) => m.TriliumEmbedComponent),
  },
];
