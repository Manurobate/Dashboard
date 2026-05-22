import { Routes } from '@angular/router';
import { ShareViewComponent } from './components/share-view/share-view.component';

export const shareRoutes: Routes = [
  { path: ':token', component: ShareViewComponent },
  { path: '', redirectTo: '/', pathMatch: 'full' },
];
