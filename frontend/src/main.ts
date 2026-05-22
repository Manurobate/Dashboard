import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { THEME_STORAGE_KEY } from './app/core/services/theme.service';

try {
  if (localStorage.getItem(THEME_STORAGE_KEY) === 'dark') {
    document.body.classList.add('dark-theme');
  }
} catch { /* localStorage inaccessible (navigation privée, SecurityError) */ }

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
