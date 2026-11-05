# Sprint Change Proposal — 2026-05-18

## Section 1 : Résumé du problème

**Déclencheur :** Constat visuel de Manu sur l'environnement réel — le panneau d'administration (`/admin`) présente trois problèmes bloquants sur mobile, découverts après que les stories 3.1 et 3.2 ont été marquées `done`.

**Problèmes identifiés :**

| # | Problème | Gravité |
|---|----------|---------|
| A | Table des utilisateurs non responsive → scroll horizontal forcé sur la page | Gênant |
| B | Menu utilisateur (top-right) inaccessible sur la page admin en mobile | **Bloquant** |
| C | Modal "Nouvel utilisateur" positionnée hors du viewport mobile | **Bloquant** |

**Causes racines :**

- **B** : La `mat-table` déborde hors du viewport sans conteneur `overflow-x: auto`, ce qui provoque un scroll horizontal au niveau du `body`. Le CDK overlay du `MatMenu` calcule sa position à partir des coordonnées du bouton, lesquelles sont décalées par le scroll de page → le menu s'ouvre hors de l'écran visible.
- **A** : Même cause — absence de wrapper `overflow-x: auto` isolant le scroll de la table.
- **C** : Tous les `dialog.open()` spécifient une `width` fixe (400px / 420px) sans `maxWidth: '95vw'`. Sur un viewport de 375px, la largeur fixe dépasse l'écran et la modal se retrouve partiellement hors champ.

**Exigence non-fonctionnelle violée :** NFR19 — "Chrome Android — responsive mobile (support complet)".

---

## Section 2 : Analyse d'impact

### Impact Épics

| Épic | Impact |
|------|--------|
| **Épic 3** | Stories 3.1 et 3.2 fonctionnellement correctes mais rendu mobile cassé. Correction dans une story 3.6 dédiée. |
| **Épics 4–7** | Non impactées. Même vigilance à apporter sur les futurs composants avec tables ou dialogs. |

### Impact Artefacts

| Artefact | Impact |
|----------|--------|
| `admin-panel.component.html` | Ajout wrapper table + layout cards mobile |
| `admin-panel.component.scss` | Wrapper overflow + media query + styles cards |
| `admin-panel.component.ts` | `maxWidth: '95vw'` sur 4 appels `dialog.open()` |
| PRD / Architecture / UX Design | Aucun |
| Tests Playwright | Story 3.6 embarquera des scénarios E2E en viewport mobile |

### Impact Technique

Correction purement frontend. Aucune migration DB, aucun changement d'API, aucun impact backend.

---

## Section 3 : Approche retenue

**Option 1 — Ajustement direct : Story 3.6 dédiée**

Les problèmes sont corrigibles sans rollback ni révision de scope MVP. Une story 3.6 dédiée est préférable à rouvrir les stories 3.1/3.2 afin de préserver leur historique fonctionnel et de garder un suivi clair.

- **Effort :** Faible
- **Risque :** Faible
- **Impact timeline :** Nul (correction avant ouverture de l'Épic 4)

---

## Section 4 : Changements détaillés

### Changement 1 — `admin-panel.component.ts`

**Section : Dialogs `openCreateUserDialog`, `openResetPasswordDialog`, `openDisableDialog`, `openDeleteDialog`**

OLD:
```typescript
this.dialog.open(CreateUserDialogComponent, { width: '400px', disableClose: false });
// et
this.dialog.open(ResetPasswordDialogComponent, { width: '420px', ... });
// et (×2)
this.dialog.open(ConfirmDestructiveDialogComponent, { width: '400px', ... });
```

NEW:
```typescript
this.dialog.open(CreateUserDialogComponent, { width: '400px', maxWidth: '95vw', disableClose: false });
// et
this.dialog.open(ResetPasswordDialogComponent, { width: '420px', maxWidth: '95vw', ... });
// et (×2)
this.dialog.open(ConfirmDestructiveDialogComponent, { width: '400px', maxWidth: '95vw', ... });
```

**Rationale :** `maxWidth: '95vw'` est le pattern Angular Material standard pour les dialogs responsive. La largeur reste 400px sur desktop, mais se contraint au viewport sur mobile.

---

### Changement 2 — `admin-panel.component.html`

**Section : Bloc `@if (adminService.users().length > 0)`**

OLD:
```html
@if (adminService.users().length > 0) {
  <table mat-table [dataSource]="adminService.users()" ...>
    ...
  </table>
}
```

NEW:
```html
@if (adminService.users().length > 0) {
  <!-- Desktop : tableau (inchangé, enveloppé) -->
  <div class="table-wrapper">
    <table mat-table [dataSource]="adminService.users()" ...>
      ... (contenu identique)
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
              <button mat-icon-button aria-label="Réinitialiser le mot de passe"
                      matTooltip="Réinitialiser le mot de passe"
                      (click)="openResetPasswordDialog(user)">
                <mat-icon>lock_reset</mat-icon>
              </button>
            }
            @if (user.isActive) {
              <button mat-icon-button aria-label="Désactiver le compte"
                      matTooltip="Désactiver"
                      (click)="openDisableDialog(user)"
                      [disabled]="isActioning()">
                <mat-icon>block</mat-icon>
              </button>
            } @else {
              <button mat-icon-button aria-label="Réactiver le compte"
                      matTooltip="Réactiver"
                      (click)="enableUser(user)"
                      [disabled]="isActioning()">
                <mat-icon>check_circle</mat-icon>
              </button>
            }
            <button mat-icon-button class="delete-button"
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

**Rationale :** Même logique de données et handlers que le tableau — zéro duplication de service. La séparation desktop/mobile est 100% CSS, sans `BreakpointObserver` ni signal supplémentaire.

---

### Changement 3 — `admin-panel.component.scss`

**Section : Ajouts à la fin du fichier**

NEW (ajout) :
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

**Rationale :** Le `table-wrapper` avec `overflow-x: auto` contient le scroll au niveau du composant (pas du `body`), ce qui débloque le `MatMenu` CDK overlay. Le media query masque le tableau et affiche les cards sous 768px.

---

## Section 5 : Story 3.6 — Définition

### Story 3.6 : Responsive mobile du panneau admin

En tant qu'administrateur sur mobile,
Je veux que le panneau d'administration soit entièrement utilisable sur mon téléphone,
Afin de pouvoir gérer les comptes utilisateurs sans blocage sur petit écran.

**Critères d'acceptation :**

**Étant donné** que j'accède à `/admin` sur un viewport mobile (< 768px),
**Quand** la page charge,
**Alors** les utilisateurs s'affichent sous forme de cards (email, nom, badges rôle/statut, boutons d'action) — aucun scroll horizontal sur la page

**Étant donné** que je suis sur la page admin en mobile,
**Quand** je clique sur le menu utilisateur en haut à droite de la top bar,
**Alors** le menu s'ouvre correctement (le scroll horizontal de page est éliminé)

**Étant donné** que je clique "Nouvel utilisateur" sur mobile,
**Quand** la modal s'ouvre,
**Alors** elle est entièrement visible dans le viewport (max 95vw) et les champs sont accessibles

**Étant donné** que je clique une action (réinitialiser, désactiver, supprimer) sur mobile,
**Quand** le dialog de confirmation s'ouvre,
**Alors** il est entièrement visible et les boutons sont accessibles

**Étant donné** que j'accède à `/admin` sur desktop (≥ 768px),
**Quand** la page charge,
**Alors** le tableau existant s'affiche sans régression

### Scénarios E2E (Playwright)

- Viewport mobile 390×844 : accéder à `/admin` → vérifier l'absence de scroll horizontal sur `body`
- Viewport mobile 390×844 : cliquer le menu utilisateur → vérifier que le menu s'ouvre
- Viewport mobile 390×844 : cliquer "Nouvel utilisateur" → vérifier que la modal est dans le viewport
- Viewport desktop 1280×800 : vérifier que le tableau s'affiche (pas de régression)

---

## Section 5 : Handoff et implémentation

**Scope : Mineur** — implémentation directe par l'agent Développeur.

**Critères de succès :**
- [ ] Cards utilisateurs affichées sur mobile (< 768px)
- [ ] Tableau affiché sur desktop (≥ 768px) — aucune régression
- [ ] Menu top bar accessible sur la page admin en mobile
- [ ] Toutes les modals (créer, réinitialiser, désactiver, supprimer) visibles dans le viewport mobile
- [ ] Tests E2E Playwright passants sur les 4 scénarios

**Handoff :** Agent Développeur — `bmad-dev-story` sur le fichier story `3-6-responsive-mobile-du-panneau-admin.md`
