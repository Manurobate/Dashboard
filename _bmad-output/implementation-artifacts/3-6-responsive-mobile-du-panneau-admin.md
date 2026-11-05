# Story 3.6 : Responsive mobile du panneau admin

**Épic :** 3 — Administration de l'instance
**Statut :** done
**Créée le :** 2026-05-18
**Source :** Sprint Change Proposal 2026-05-18

---

## User Story

En tant qu'administrateur sur mobile,
Je veux que le panneau d'administration soit entièrement utilisable sur mon téléphone,
Afin de pouvoir gérer les comptes utilisateurs sans blocage sur petit écran.

---

## Contexte technique

Trois défauts identifiés post-implémentation des stories 3.1 et 3.2 :

| # | Problème | Cause racine |
|---|----------|--------------|
| A | Scroll horizontal sur la page | `mat-table` sans wrapper `overflow-x: auto` → débordement au niveau `body` |
| B | Menu top bar inaccessible sur `/admin` mobile | Scroll horizontal `body` décale les coordonnées du CDK overlay `MatMenu` |
| C | Modals (créer, réinitialiser, désactiver, supprimer) hors viewport | `dialog.open()` avec `width` fixe sans `maxWidth: '95vw'` |

**NFR violée :** NFR19 — "Chrome Android — responsive mobile (support complet)"

---

## Critères d'acceptation

**Étant donné** que j'accède à `/admin` sur un viewport mobile (< 768px),
**Quand** la page charge,
**Alors** les utilisateurs s'affichent sous forme de cards (email, nom, badges rôle/statut, boutons d'action) — aucun scroll horizontal sur la page

**Étant donné** que je suis sur la page admin en mobile,
**Quand** je clique sur le menu utilisateur en haut à droite de la top bar,
**Alors** le menu s'ouvre correctement

**Étant donné** que je clique "Nouvel utilisateur" sur mobile,
**Quand** la modal s'ouvre,
**Alors** elle est entièrement visible dans le viewport (max 95vw) et les champs sont accessibles

**Étant donné** que je clique une action (réinitialiser, désactiver, supprimer) sur mobile,
**Quand** le dialog de confirmation s'ouvre,
**Alors** il est entièrement visible et les boutons sont accessibles

**Étant donné** que j'accède à `/admin` sur desktop (≥ 768px),
**Quand** la page charge,
**Alors** le tableau existant s'affiche sans régression

---

## Changements à implémenter

### 1. `frontend/src/app/admin/admin-panel.component.ts`

Ajouter `maxWidth: '95vw'` sur les 4 appels `dialog.open()` :

```typescript
// openCreateUserDialog
this.dialog.open(CreateUserDialogComponent, {
  width: '400px',
  maxWidth: '95vw',   // ← ajout
  disableClose: false,
});

// openResetPasswordDialog
this.dialog.open(ResetPasswordDialogComponent, {
  width: '420px',
  maxWidth: '95vw',   // ← ajout
  disableClose: false,
  data: { userId: user.id, username: user.username } satisfies ResetPasswordDialogData,
});

// openDisableDialog
this.dialog.open<...>(ConfirmDestructiveDialogComponent, {
  width: '400px',
  maxWidth: '95vw',   // ← ajout
  data: { ... },
});

// openDeleteDialog
this.dialog.open<...>(ConfirmDestructiveDialogComponent, {
  width: '400px',
  maxWidth: '95vw',   // ← ajout
  data: { ... },
});
```

---

### 2. `frontend/src/app/admin/admin-panel.component.html`

Envelopper la `mat-table` dans un `div.table-wrapper` et ajouter un bloc `div.user-cards` pour le layout mobile.

Le contenu du bloc `@if (adminService.users().length > 0)` devient :

```html
@if (adminService.users().length > 0) {
  <!-- Desktop : tableau -->
  <div class="table-wrapper">
    <table mat-table [dataSource]="adminService.users()" data-testid="user-list" class="user-table mat-elevation-z2">
      <!-- colonnes inchangées -->
      <ng-container matColumnDef="username">
        <th mat-header-cell *matHeaderCellDef>Email</th>
        <td mat-cell *matCellDef="let user">{{ user.username }}</td>
      </ng-container>

      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Nom</th>
        <td mat-cell *matCellDef="let user">{{ user.name || '—' }}</td>
      </ng-container>

      <ng-container matColumnDef="role">
        <th mat-header-cell class="text-center" *matHeaderCellDef>Rôle</th>
        <td mat-cell class="text-center" *matCellDef="let user">
          <span class="status-badge" [class]="'status-badge role-' + user.role">{{ user.role }}</span>
        </td>
      </ng-container>

      <ng-container matColumnDef="isActive">
        <th mat-header-cell class="text-center" *matHeaderCellDef>Statut</th>
        <td mat-cell class="text-center" *matCellDef="let user">
          @if (user.isActive) {
            <span class="status-badge badge-active">Actif</span>
          } @else {
            <span class="status-badge badge-inactive">Inactif</span>
          }
        </td>
      </ng-container>

      <ng-container matColumnDef="mustChangePassword">
        <th mat-header-cell class="text-center" *matHeaderCellDef>Mdp temp.</th>
        <td mat-cell class="text-center" *matCellDef="let user">
          @if (user.mustChangePassword) {
            <span class="status-badge badge-warning">Oui</span>
          } @else {
            <span class="status-badge badge-active">Non</span>
          }
        </td>
      </ng-container>

      <ng-container matColumnDef="actions">
        <th mat-header-cell class="text-center" *matHeaderCellDef>Actions</th>
        <td mat-cell class="text-center" *matCellDef="let user">
          @if (user.id !== authService.currentUser()?.id) {
            @if (user.role !== 'admin') {
              <button mat-icon-button
                      aria-label="Réinitialiser le mot de passe"
                      matTooltip="Réinitialiser le mot de passe"
                      (click)="openResetPasswordDialog(user)">
                <mat-icon>lock_reset</mat-icon>
              </button>
            }
            @if (user.isActive) {
              <button mat-icon-button
                      aria-label="Désactiver le compte"
                      matTooltip="Désactiver"
                      (click)="openDisableDialog(user)"
                      [disabled]="isActioning()">
                <mat-icon>block</mat-icon>
              </button>
            } @else {
              <button mat-icon-button
                      aria-label="Réactiver le compte"
                      matTooltip="Réactiver"
                      (click)="enableUser(user)"
                      [disabled]="isActioning()">
                <mat-icon>check_circle</mat-icon>
              </button>
            }
            <button mat-icon-button
                    class="delete-button"
                    aria-label="Supprimer le compte"
                    matTooltip="Supprimer"
                    (click)="openDeleteDialog(user)"
                    [disabled]="isActioning()">
              <mat-icon>delete</mat-icon>
            </button>
          }
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
    </table>
  </div>

  <!-- Mobile : cards -->
  <div class="user-cards">
    @for (user of adminService.users(); track user.id) {
      <div class="user-card mat-elevation-z1">
        <div class="user-card-header">
          <div class="user-card-identity">
            <span class="user-card-email">{{ user.username }}</span>
            @if (user.name) {
              <span class="user-card-name">{{ user.name }}</span>
            }
          </div>
          <div class="user-card-badges">
            <span class="status-badge" [class]="'status-badge role-' + user.role">{{ user.role }}</span>
            @if (user.isActive) {
              <span class="status-badge badge-active">Actif</span>
            } @else {
              <span class="status-badge badge-inactive">Inactif</span>
            }
            @if (user.mustChangePassword) {
              <span class="status-badge badge-warning">Mdp temp.</span>
            }
          </div>
        </div>
        @if (user.id !== authService.currentUser()?.id) {
          <div class="user-card-actions">
            @if (user.role !== 'admin') {
              <button mat-icon-button
                      aria-label="Réinitialiser le mot de passe"
                      matTooltip="Réinitialiser le mot de passe"
                      (click)="openResetPasswordDialog(user)">
                <mat-icon>lock_reset</mat-icon>
              </button>
            }
            @if (user.isActive) {
              <button mat-icon-button
                      aria-label="Désactiver le compte"
                      matTooltip="Désactiver"
                      (click)="openDisableDialog(user)"
                      [disabled]="isActioning()">
                <mat-icon>block</mat-icon>
              </button>
            } @else {
              <button mat-icon-button
                      aria-label="Réactiver le compte"
                      matTooltip="Réactiver"
                      (click)="enableUser(user)"
                      [disabled]="isActioning()">
                <mat-icon>check_circle</mat-icon>
              </button>
            }
            <button mat-icon-button
                    class="delete-button"
                    aria-label="Supprimer le compte"
                    matTooltip="Supprimer"
                    (click)="openDeleteDialog(user)"
                    [disabled]="isActioning()">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        }
      </div>
    }
  </div>
}
```

---

### 3. `frontend/src/app/admin/admin-panel.component.scss`

Ajouter à la fin du fichier existant :

```scss
.table-wrapper {
  overflow-x: auto;
}

.user-cards {
  display: none;
}

@media (max-width: 767px) {
  .admin-panel {
    padding: 1rem;
  }

  .table-wrapper {
    display: none;
  }

  .user-cards {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .user-card {
    border-radius: 8px;
    padding: 12px 16px;
    background: var(--mat-sys-surface);
  }

  .user-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 8px;
  }

  .user-card-identity {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .user-card-email {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--mat-sys-on-surface);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .user-card-name {
    font-size: 0.75rem;
    color: var(--mat-sys-on-surface-variant);
  }

  .user-card-badges {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .user-card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
    border-top: 1px solid var(--mat-sys-outline-variant);
    padding-top: 8px;
    margin-top: 4px;
  }
}
```

---

## Tasks/Subtasks

- [x] T1 — `admin-panel.component.ts` : ajouter `maxWidth: '95vw'` sur les 4 `dialog.open()`
- [x] T2 — `admin-panel.component.html` : envelopper la table dans `.table-wrapper` et ajouter `.user-cards` pour le mobile
- [x] T3 — `admin-panel.component.scss` : ajouter styles responsive (`.table-wrapper`, `.user-cards`, media query `max-width: 767px`)
- [x] T4 — `e2e/tests/admin-responsive.spec.ts` : créer les tests E2E Playwright (viewport mobile 390×844 + desktop 1280×800)

### Review Findings

- [x] [Review][Patch] NO-CLEANUP: Aucun `afterEach`/`afterAll` — ajout d'un `afterEach` avec suppression via `request.delete` dans un `test.describe` dédié [e2e/tests/admin-responsive.spec.ts]
- [x] [Review][Patch] WAITFORURL: Regex `/\/(links|change-password)$/` trop permissive — étendue à `/\/(links|change-password|admin)$/` [e2e/tests/admin-responsive.spec.ts:15]
- [x] [Review][Patch] MENU-SELECTOR: 3 sélecteurs CSS alternatifs avec `.first()` — remplacé par `button[aria-label="Menu utilisateur"]` (aria-label réel du composant top-bar) [e2e/tests/admin-responsive.spec.ts:41]
- [x] [Review][Patch] SCROLL-MEASURE: `document.body.scrollWidth` → `document.documentElement.scrollWidth > document.documentElement.clientWidth` [e2e/tests/admin-responsive.spec.ts:29]
- [x] [Review][Patch] DATE-NOW: `Date.now()` → `randomUUID()` (import crypto) [e2e/tests/admin-responsive.spec.ts:59]
- [x] [Review][Patch] MISSING-CA4: CA4 partiel — ajout des tests pour dialog "supprimer" et "réinitialiser mot de passe" en mobile [e2e/tests/admin-responsive.spec.ts]
- [x] [Review][Dismiss] AUTH-ISSUE: faux positif — `request` context Playwright maintient bien les cookies entre appels, même pattern que admin.spec.ts (done)
- [x] [Review][Dismiss] MISSING-COLUMN: faux positif — colonne `mustChangePassword` présente dans le HTML (lignes 57-66)
- [x] [Review][Defer] UI-DUPLICATION: Logique boutons d'action dupliquée table/cards — refactoring ng-template hors scope story [frontend/src/app/admin/admin-panel.component.html] — deferred, architectural choice
- [x] [Review][Defer] CLASS-BINDING: `[class]` binding écrase les classes statiques — pré-existant dans la table desktop, propagé dans les cards [frontend/src/app/admin/admin-panel.component.html] — deferred, pre-existing
- [x] [Review][Defer] TEST-TOBEVISIBLE: `.toBeVisible()` ne garantit pas le viewport réel (`toBeInViewport()` serait plus précis) [e2e/tests/admin-responsive.spec.ts] — deferred, pre-existing
- [x] [Review][Defer] LOGIN-REPETITION: `loginAdmin` appelé dans chaque test sans `beforeEach` — même pattern que `admin.spec.ts` [e2e/tests/admin-responsive.spec.ts] — deferred, pre-existing

---

## Dev Agent Record

### Completion Notes

Implémentation complète le 2026-05-18. Les 3 défauts responsives (A, B, C) corrigés :
- **A (scroll horizontal)** : `mat-table` encapsulée dans `div.table-wrapper { overflow-x: auto }` — élimine le débordement body.
- **B (menu top bar)** : réglé automatiquement par la correction du scroll horizontal body (le CDK overlay retrouve ses coordonnées correctes).
- **C (modals hors viewport)** : `maxWidth: '95vw'` ajouté sur les 4 appels `dialog.open()` — create, reset-password, disable, delete.
- **Layout mobile** : bloc `div.user-cards` affiché en < 768px via media query, tableau caché.
- Compilation TypeScript sans erreur. Build production réussi (warning budget préexistant non introduit par cette story).

---

## File List

- `frontend/src/app/admin/admin-panel.component.ts` (modifié)
- `frontend/src/app/admin/admin-panel.component.html` (modifié)
- `frontend/src/app/admin/admin-panel.component.scss` (modifié)
- `e2e/tests/admin-responsive.spec.ts` (créé)

---

## Change Log

- 2026-05-18 — Implémentation responsive mobile panneau admin (story 3.6) : layout cards mobile, wrapper overflow, maxWidth dialogs, tests E2E Playwright.

---

## Scénarios E2E (Playwright)

Fichier cible : `e2e/admin-responsive.spec.ts`

```typescript
// Viewport mobile 390×844
test('admin mobile — pas de scroll horizontal', async ({ page }) => {
  // login admin → /admin
  // vérifier que body.scrollWidth <= window.innerWidth
});

test('admin mobile — menu utilisateur accessible', async ({ page }) => {
  // login admin → /admin
  // cliquer le bouton menu utilisateur → vérifier que le menu est visible
});

test('admin mobile — modal créer utilisateur dans le viewport', async ({ page }) => {
  // login admin → /admin
  // cliquer "Nouvel utilisateur" → vérifier que la modal est dans le viewport
});

test('admin desktop — tableau affiché sans régression', async ({ page }) => {
  // viewport 1280×800
  // login admin → /admin
  // vérifier que [data-testid="user-list"] est visible
});
```
