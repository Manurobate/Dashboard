import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  globalSetup: './global-setup.ts',
  testDir: './tests',
  timeout: 30000,
  // Un seul worker : tous les tests partagent le même backend/compte admin.
  // La sérialisation évite les conflits d'état (catégories, users) entre specs.
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost',
    headless: true,
    // Accorde l'accès presse-papier au contexte : sans cette permission, chromium
    // headless rejette navigator.clipboard.writeText() (NotAllowedError) et le
    // dialog de partage retombe sur son message défensif « copiez-le manuellement ».
    permissions: ['clipboard-read', 'clipboard-write'],
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    extraHTTPHeaders: {
      'X-Requested-With': 'XMLHttpRequest',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
