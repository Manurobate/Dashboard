# Story 1.5 : Navigation responsive (Top bar + Bottom nav)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant qu'utilisateur,
Je veux naviguer entre les modules via une top bar sur desktop et une bottom navigation sur mobile,
Afin de pouvoir changer de module en un clic quel que soit mon appareil.

## Acceptance Criteria

1. **Étant donné** que l'application tourne sur desktop (≥768px),
   **Quand** je regarde la top bar,
   **Alors** je vois : logo "Dashboard", onglets de navigation (Liens/Recettes/Notes) via `MatTabNavBar`, icône toggle thème, menu utilisateur (`MatMenu`) avec bouton déconnexion
   **Et** le fond est `#C62828` en thème clair et `#1F1F1F` en thème sombre (app name en `#EF5350`)

2. **Étant donné** que l'application tourne sur mobile (<768px),
   **Quand** je regarde le bas de l'écran,
   **Alors** je vois la bottom nav avec 3 items (icône + label) : Liens, Recettes, Notes
   **Et** les onglets de la top bar ne sont pas visibles sur mobile

3. **Étant donné** que je clique sur un onglet ou item de navigation,
   **Quand** la route change,
   **Alors** l'item actif est mis en évidence (couleur primaire + fond `rgba(primary, 0.15)`) et la route correspondante est activée

4. **Étant donné** que j'inspecte tous les `mat-icon-button` de la top bar,
   **Quand** je vérifie les attributs ARIA,
   **Alors** chaque bouton icône possède un `aria-label` descriptif

5. **Étant donné** que je navigue au clavier,
   **Quand** j'utilise Tab et Entrée,
   **Alors** tous les éléments de la top bar et de la bottom nav sont accessibles et activables

## Tasks / Subtasks

- [x] **T1 — Remplacer le contenu de `frontend/src/app/app.html`** (AC: #1, #2)
  - [x] Supprimer tout le placeholder Angular (balises `<style>` inline + `<main class="main">...`)
  - [x] Conserver uniquement `<router-outlet />` et y ajouter le layout app-shell
  - [x] Structure : `<app-top-bar>` + `<main class="content"><router-outlet /></main>` + `<app-bottom-nav>`

- [x] **T2 — Créer `frontend/src/app/core/components/top-bar/top-bar.component.ts`** (AC: #1, #3, #4, #5)
  - [x] Composant standalone, sélecteur `app-top-bar`
  - [x] Importer : `MatToolbarModule`, `MatTabNavBarModule` (`MatTabLink`, `MatTabNav`), `MatIconModule`, `MatButtonModule`, `MatMenuModule`, `RouterModule`
  - [x] Template : `mat-toolbar` contenant le titre "Dashboard", `nav mat-tab-nav-bar` avec 3 `a mat-tab-link` (Liens `/links`, Recettes `/recipes`, Notes `/notes`) + bouton toggle thème + `button mat-icon-button [matMenuTriggerFor]`
  - [x] Injecter `ThemeService` pour le toggle et `Router` pour la détection de la route active
  - [x] Cacher la `nav mat-tab-nav-bar` sur mobile via classe CSS (voir T5)
  - [x] `aria-label` sur le bouton toggle thème et le bouton menu utilisateur

- [x] **T3 — Créer `frontend/src/app/core/components/bottom-nav/bottom-nav.component.ts`** (AC: #2, #3, #4, #5)
  - [x] Composant standalone, sélecteur `app-bottom-nav`
  - [x] Importer : `MatIconModule`, `RouterModule`, `RouterLinkActive`
  - [x] Template : `<nav class="bottom-nav">` avec 3 `<a routerLink routerLinkActive>` (icône + label)
  - [x] Icônes Material : `link` pour Liens, `restaurant_menu` pour Recettes, `note` pour Notes
  - [x] Afficher uniquement sur mobile via CSS (voir T5)
  - [x] `aria-label` sur chaque lien de navigation

- [x] **T4 — Mettre à jour `frontend/src/app/app.ts`** (AC: #1, #2)
  - [x] Importer et ajouter `TopBarComponent` et `BottomNavComponent` dans `imports[]`
  - [x] Supprimer le signal `title` (remplacé par le composant top-bar)
  - [x] Conserver l'injection de `ThemeService`

- [x] **T5 — Styles responsive dans `top-bar.component.scss` et `bottom-nav.component.scss` + `app.scss`** (AC: #1, #2)
  - [x] Top bar : fond `var(--color-primary)` thème clair → `#1F1F1F` thème sombre (via `.dark-theme` sur `body`)
  - [x] Top bar desktop : titre blanc en thème clair, titre `#EF5350` en thème sombre
  - [x] `nav mat-tab-nav-bar` : `display: none` en dessous de 768px
  - [x] Bottom nav : `display: none` au-dessus de 768px, `display: flex` en dessous
  - [x] Bottom nav : position fixe en bas, hauteur 56px, items flex-1, icône + label empilés
  - [x] Bottom nav item actif : couleur `var(--color-primary)`, fond `rgba(primary, 0.15)`
  - [x] `app.scss` : padding-bottom sur le contenu en mobile pour éviter le chevauchement avec la bottom nav

- [x] **T6 — Mettre à jour `frontend/src/app/app.routes.ts`** (AC: #3)
  - [x] Ajouter les routes de base : `/links`, `/recipes`, `/notes` (pages stub vides avec lazy loading)
  - [x] Redirection par défaut : `'' → /links`
  - [x] Créer les composants stub nécessaires ou utiliser des placeholders

- [x] **T7 — Validation**
  - [x] Vérifier visuellement desktop et mobile dans le navigateur (DevTools > Responsive)
  - [x] Vérifier le toggle thème dans la top bar (basculement clair/sombre)
  - [x] Vérifier que les onglets/items actifs sont mis en évidence lors de la navigation
  - [x] Inspecter les `aria-label` dans DevTools → Accessibilité
  - [x] Vérifier `ng test --watch=false` (specs existantes)
  - [x] Vérifier `npm run build` réussit

## Dev Notes

### CRITIQUE : `MatBottomNavigation` n'existe pas dans Angular Material

**Angular Material M3 n'a pas de composant `MatBottomNavigation` (bottom nav bar Android-style).**

Les architectures et specs UX mentionnent `mat-bottom-nav` — c'est un composant **custom à implémenter**, pas un composant Material out-of-the-box. Ne pas chercher `MatBottomNavComponent` dans `@angular/material`.

**Implémentation recommandée pour la bottom nav :**

```html
<!-- bottom-nav.component.html -->
<nav class="bottom-nav" role="navigation" aria-label="Navigation principale">
  <a routerLink="/links" routerLinkActive="active" class="bottom-nav-item"
     aria-label="Liens">
    <mat-icon>link</mat-icon>
    <span class="bottom-nav-label">Liens</span>
  </a>
  <a routerLink="/recipes" routerLinkActive="active" class="bottom-nav-item"
     aria-label="Recettes">
    <mat-icon>restaurant_menu</mat-icon>
    <span class="bottom-nav-label">Recettes</span>
  </a>
  <a routerLink="/notes" routerLinkActive="active" class="bottom-nav-item"
     aria-label="Notes">
    <mat-icon>note</mat-icon>
    <span class="bottom-nav-label">Notes</span>
  </a>
</nav>
```

```scss
// bottom-nav.component.scss
.bottom-nav {
  display: none;  // caché sur desktop
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: var(--mat-sys-surface);
  border-top: 1px solid var(--color-divider);
  z-index: 100;

  @media (max-width: 767px) {
    display: flex;
  }
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 10px;

  &.active {
    color: var(--color-primary);
    background: rgba(from var(--color-primary) r g b / 0.15);
  }
}

.bottom-nav-label {
  font-size: 10px;
  font-weight: 500;
}
```

---

### T2 — `TopBarComponent` (squelette complet)

**Emplacement :** `frontend/src/app/core/components/top-bar/top-bar.component.ts`

```html
<!-- top-bar.component.html -->
<mat-toolbar class="top-bar">
  <span class="app-title">Dashboard</span>

  <!-- Onglets desktop — cachés sur mobile -->
  <nav mat-tab-nav-bar class="desktop-nav" [tabPanel]="tabPanel">
    <a mat-tab-link routerLink="/links" routerLinkActive #linksLink="routerLinkActive"
       [active]="linksLink.isActive">Liens</a>
    <a mat-tab-link routerLink="/recipes" routerLinkActive #recipesLink="routerLinkActive"
       [active]="recipesLink.isActive">Recettes</a>
    <a mat-tab-link routerLink="/notes" routerLinkActive #notesLink="routerLinkActive"
       [active]="notesLink.isActive">Notes</a>
  </nav>
  <mat-tab-nav-panel #tabPanel></mat-tab-nav-panel>

  <span class="spacer"></span>

  <!-- Toggle thème -->
  <button mat-icon-button (click)="themeService.toggle()"
          [attr.aria-label]="themeService.isDark() ? 'Activer le thème clair' : 'Activer le thème sombre'">
    <mat-icon>{{ themeService.isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
  </button>

  <!-- Menu utilisateur -->
  <button mat-icon-button [matMenuTriggerFor]="userMenu" aria-label="Menu utilisateur">
    <mat-icon>account_circle</mat-icon>
  </button>
  <mat-menu #userMenu>
    <button mat-menu-item disabled>
      <mat-icon>logout</mat-icon>
      <span>Déconnexion</span>
    </button>
  </mat-menu>
</mat-toolbar>
```

**Imports nécessaires dans `top-bar.component.ts` :**
```typescript
imports: [
  MatToolbarModule,
  MatTabNavBar, MatTabLink, MatTabNavPanel,  // depuis @angular/material/tabs
  MatIconModule,
  MatButtonModule,
  MatMenuModule,
  RouterLink, RouterLinkActive,
]
```

**Note sur le bouton Déconnexion :** marquer `disabled` en Story 1.5 — l'action réelle est implémentée en Story 2.4 quand `AuthService` existera. Le menu doit être visible mais l'action désactivée.

---

### T2 — Styles `top-bar.component.scss`

```scss
:host {
  position: sticky;
  top: 0;
  z-index: 100;
}

.top-bar {
  background-color: var(--color-primary);  // #C62828 thème clair
  color: white;
}

// Thème sombre : fond #1F1F1F, app name en #EF5350
:host-context(.dark-theme) .top-bar {
  background-color: #1F1F1F;
}

:host-context(.dark-theme) .app-title {
  color: #EF5350;
}

.app-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-right: 16px;
  color: white;
}

.spacer {
  flex: 1;
}

.desktop-nav {
  // La nav mat-tab-nav-bar sur la top bar
  --mdc-tab-indicator-active-indicator-color: white;
  --mat-tab-header-active-label-text-color: white;
  --mat-tab-header-inactive-label-text-color: rgba(255, 255, 255, 0.7);

  @media (max-width: 767px) {
    display: none;
  }
}
```

---

### T1 — `app.html` (version finale)

```html
<app-top-bar />

<main class="app-content">
  <router-outlet />
</main>

<app-bottom-nav />
```

```scss
// app.scss — ajout pour éviter le chevauchement avec la bottom nav sur mobile
.app-content {
  @media (max-width: 767px) {
    padding-bottom: 56px;  // hauteur de la bottom nav
  }
}
```

---

### T6 — `app.routes.ts` (routes de base)

```typescript
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
```

**Créer des composants stub** pour `links`, `recipes`, `notes` (composants vides standalone dans `frontend/src/app/links/links.component.ts`, etc.) — ils seront remplis dans les épics suivantes. Structure minimale :

```typescript
@Component({
  selector: 'app-links',
  standalone: true,
  template: '<p>Module Liens — À venir</p>',
})
export class LinksComponent {}
```

**Emplacement des stubs :**
- `frontend/src/app/links/links.component.ts`
- `frontend/src/app/recipes/recipes.component.ts`
- `frontend/src/app/notes/notes.component.ts`

Ces dossiers seront complétés dans les épics 4, 5 et 7 respectivement.

---

### T4 — `app.ts` (mise à jour)

```typescript
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { TopBarComponent } from './core/components/top-bar/top-bar.component';
import { BottomNavComponent } from './core/components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TopBarComponent, BottomNavComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly themeService = inject(ThemeService);
}
```

**Note :** Supprimer le signal `title` (n'est plus utilisé — le titre est dans `TopBarComponent`). Ne pas casser le spec `app.spec.ts` — vérifier qu'il ne référence pas `title`.

---

### Structure de fichiers créés par cette story

```
frontend/src/app/
├── app.html                    (modifié — remplacer le placeholder Angular)
├── app.ts                      (modifié — ajouter TopBarComponent, BottomNavComponent)
├── app.scss                    (modifié — padding-bottom mobile)
├── app.routes.ts               (modifié — routes de base avec lazy loading)
│
├── core/
│   └── components/
│       ├── top-bar/
│       │   ├── top-bar.component.ts
│       │   ├── top-bar.component.html
│       │   └── top-bar.component.scss
│       └── bottom-nav/
│           ├── bottom-nav.component.ts
│           ├── bottom-nav.component.html
│           └── bottom-nav.component.scss
│
├── links/
│   └── links.component.ts      (créé — stub vide)
├── recipes/
│   └── recipes.component.ts    (créé — stub vide)
└── notes/
    └── notes.component.ts      (créé — stub vide)
```

---

### Breakpoints et comportement responsive

| Breakpoint | Top bar | Bottom nav | Comportement |
|---|---|---|---|
| ≥ 768px (desktop) | Onglets visibles (`MatTabNavBar`) | `display: none` | Navigation via onglets |
| < 768px (mobile) | Onglets cachés (`.desktop-nav { display: none }`) | `display: flex` (fixée en bas) | Navigation via items du bas |

**Breakpoint CSS :** utiliser systématiquement `@media (max-width: 767px)` pour le mobile et `@media (min-width: 768px)` pour le desktop — cohérent avec les specs UX.

---

### Accessibilité (NFR11, NFR12, NFR14)

- `mat-toolbar` : `role="banner"` implicite — OK
- `nav mat-tab-nav-bar` : ajouter `aria-label="Navigation principale"` sur l'élément `<nav>`
- Bottom nav : `role="navigation"` sur `<nav>`, `aria-label="Navigation principale"`
- Bouton toggle thème : `aria-label` dynamique (voir template T2)
- Bouton menu utilisateur : `aria-label="Menu utilisateur"`
- Items bottom nav : les liens `<a>` avec `aria-label` explicite suffisent (icône + label visibles)
- Navigation clavier : Tab pour se déplacer, Entrée pour activer — géré automatiquement par Angular Material et les éléments `<a>`

---

### Learnings des stories précédentes

**De Story 1.4 :**
- `provideZonelessChangeDetection()` (sans `Experimental`) — API stabilisée Angular 21, confirmé dans `app.config.ts`
- Vitest est le runner de tests (pas Karma) — `ng test --watch=false` pour lancer les tests
- Le frontend n'a pas ESLint — uniquement Prettier check pour les lints
- `ThemeService` est déjà implémenté et injecté dans `App` — réutiliser directement, ne pas recréer
- Pattern Angular moderne : `inject()` (pas `@Inject()`), signaux `signal()` et `computed()`
- Pas de `zone.js` → pas de `NgZone.run()` nécessaire dans les composants
- `inject(DOCUMENT)` pour accéder au DOM (pattern préféré au `@Inject(DOCUMENT)`)

**De Story 1.3 :**
- Les specs `.spec.ts` doivent continuer à passer — attention à la spec `app.spec.ts` qui référence peut-être `title`

**De Story 1.1 :**
- Composants standalone uniquement — pas de NgModules
- `Logger` NestJS (pas `console.log`) — concerne le backend (hors scope ici)

---

### Angular Material M3 — Notes spécifiques

- **`MatTabNavBar`** : importer depuis `@angular/material/tabs` : `MatTabNav, MatTabLink, MatTabNavPanel` — ces trois sont nécessaires ensemble
- **`MatToolbar`** : importer `MatToolbarModule` depuis `@angular/material/toolbar`
- **`MatMenu`** : importer `MatMenuModule` depuis `@angular/material/menu`
- **`MatIcon`** : les icônes Material sont disponibles via `MatIconModule` — les icônes utilisées (`link`, `restaurant_menu`, `note`, `light_mode`, `dark_mode`, `account_circle`, `logout`) sont dans la police Material Icons incluse lors de `ng add @angular/material`
- **Thème top bar** : utiliser `background-color: var(--color-primary)` (token custom défini en Story 1.4) plutôt que des valeurs hardcodées — sauf pour le fond sombre `#1F1F1F` qui est spécifique à la top bar

---

### Scope de cette story

**In scope :**
- `frontend/src/app/app.html` (modifier — remplacer le placeholder)
- `frontend/src/app/app.ts` (modifier — importer les nouveaux composants)
- `frontend/src/app/app.scss` (modifier — padding-bottom mobile)
- `frontend/src/app/app.routes.ts` (modifier — routes de base)
- `frontend/src/app/core/components/top-bar/` (créer)
- `frontend/src/app/core/components/bottom-nav/` (créer)
- `frontend/src/app/links/links.component.ts` (créer — stub)
- `frontend/src/app/recipes/recipes.component.ts` (créer — stub)
- `frontend/src/app/notes/notes.component.ts` (créer — stub)

**Hors scope :**
- Implémentation réelle des modules Liens/Recettes/Notes → épics 4, 5, 7
- Action de déconnexion fonctionnelle → Story 2.4 (`AuthService` + guard)
- Routes `/login`, `/change-password`, `/admin`, `/share/:token` → épics 2, 3, 6
- PWA / Service Worker → Story 1.6
- Guards d'authentification (`authGuard`) → Story 2.2

---

### Références

- [Source: epics.md#Story 1.5] — acceptance criteria BDD complets
- [Source: ux-design-Dashboard.md#UX-DR3] — top bar responsive specs
- [Source: ux-design-Dashboard.md#UX-DR4] — bottom nav mobile specs
- [Source: ux-design-Dashboard.md#Component Strategy] — `MatTabNavBar` + `MatTabLink`, `MatBottomNav` (custom)
- [Source: architecture.md#Structure des routes Angular] — routes `/links`, `/recipes`, `/notes`, `/admin`, `/share/:token`
- [Source: architecture.md#Cartographie FR → Structure] — placement des composants dans `core/components/`
- [Source: story 1-4] — ThemeService existant, `provideZonelessChangeDetection()`, Vitest runner

## Review Findings

- [x] [Review][Decision] `var(--mat-sys-surface)` vs `--color-surface` pour le fond de la bottom nav — Résolu : `--color-surface` retenu, `--bottom-nav-height` ajouté comme token partagé [bottom-nav.component.scss:8]

- [x] [Review][Patch] `color-mix()` sans fallback + déviation spec : fallback `rgba(198,40,40,0.15)` ajouté [bottom-nav.component.scss:30]
- [x] [Review][Patch] `mat-tab-nav-panel` déplacé hors du `mat-toolbar` — sibling après le toolbar [top-bar.component.html]
- [x] [Review][Patch] Magic number `56px` — token `--bottom-nav-height: 56px` ajouté dans `styles.scss`, utilisé dans les deux fichiers [app.scss, bottom-nav.component.scss]
- [x] [Review][Patch] `themeService` dead code supprimé de `app.ts` [app.ts]
- [x] [Review][Patch] `min-height: calc(100dvh - var(--bottom-nav-height))` ajouté sur `.app-content` mobile [app.scss]
- [x] [Review][Patch] `font-size: 10px` dupliqué supprimé de `.bottom-nav-label` [bottom-nav.component.scss]
- [x] [Review][Patch] Test aria-label toggle : vérifie maintenant l'une des deux valeurs attendues [top-bar.component.spec.ts]

- [x] [Review][Defer] Pas de route wildcard `**` (hors scope story 1.5) [app.routes.ts] — deferred, pre-existing
- [x] [Review][Defer] `routerLinkActive` sans `{exact: true}` — activera faussement l'item parent sur futures routes enfants [bottom-nav.component.html, top-bar.component.html] — deferred, pre-existing
- [x] [Review][Defer] Pas d'error boundary sur les chunks lazy-loaded (aucun `withNavigationErrorHandler`) [app.routes.ts] — deferred, pre-existing
- [x] [Review][Defer] Flash du thème clair au premier chargement avant que ThemeService s'initialise [frontend/src/main.ts] — deferred, pre-existing
- [x] [Review][Defer] Overflow possible sur la toolbar en viewport 768–769px (tablette) — hors scope responsive basique [top-bar.component.scss] — deferred, pre-existing

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Aucun blocage — implémentation directe suivant les specs de la story.

### Completion Notes List

- T1 : `app.html` reécrit — tout le placeholder Angular supprimé, structure app-shell mise en place
- T2 : `TopBarComponent` créé (standalone) — `MatToolbarModule`, `MatTabNav`, `MatTabLink`, `MatTabNavPanel`, `MatIconModule`, `MatButtonModule`, `MatMenuModule`, `RouterLink`, `RouterLinkActive`; toggle thème et menu utilisateur avec `aria-label`; onglets cachés sur mobile via `.desktop-nav { display: none }` à 767px
- T3 : `BottomNavComponent` créé (standalone) — nav HTML custom (pas de `MatBottomNavigation` dans Angular Material), 3 liens avec `routerLinkActive`, icônes Material, `aria-label` sur chaque lien; affiché uniquement sur mobile (`@media max-width: 767px`)
- T4 : `app.ts` mis à jour — signal `title` supprimé, `TopBarComponent` et `BottomNavComponent` ajoutés aux `imports[]`
- T5 : Styles responsive complets — top-bar fond `var(--color-primary)` / `#1F1F1F` sombre, titre `#EF5350` en sombre; bottom-nav position fixe 56px; `app.scss` padding-bottom 56px mobile; item actif avec `color-mix`
- T6 : `app.routes.ts` mis à jour avec routes lazy-loaded `/links`, `/recipes`, `/notes` + redirection `'' → links`; 3 composants stub créés
- T7 : 17 tests passent (4 fichiers spec), build production réussi
- `app.spec.ts` mis à jour : test `should render title` (référençant l'ancien `title` signal) remplacé par tests `app-top-bar` et `app-bottom-nav`

### File List

- `frontend/src/app/app.html` (modifié)
- `frontend/src/app/app.ts` (modifié)
- `frontend/src/app/app.scss` (modifié)
- `frontend/src/app/app.routes.ts` (modifié)
- `frontend/src/app/app.spec.ts` (modifié)
- `frontend/src/app/core/components/top-bar/top-bar.component.ts` (créé)
- `frontend/src/app/core/components/top-bar/top-bar.component.html` (créé)
- `frontend/src/app/core/components/top-bar/top-bar.component.scss` (créé)
- `frontend/src/app/core/components/top-bar/top-bar.component.spec.ts` (créé)
- `frontend/src/app/core/components/bottom-nav/bottom-nav.component.ts` (créé)
- `frontend/src/app/core/components/bottom-nav/bottom-nav.component.html` (créé)
- `frontend/src/app/core/components/bottom-nav/bottom-nav.component.scss` (créé)
- `frontend/src/app/core/components/bottom-nav/bottom-nav.component.spec.ts` (créé)
- `frontend/src/app/links/links.component.ts` (créé — stub)
- `frontend/src/app/recipes/recipes.component.ts` (créé — stub)
- `frontend/src/app/notes/notes.component.ts` (créé — stub)

### Change Log

- 2026-04-23 : Implémentation complète de la story 1.5 — Navigation responsive (Top bar + Bottom nav). TopBarComponent (MatToolbar + MatTabNavBar) et BottomNavComponent (custom nav HTML) créés, app-shell mis en place, routes lazy-loaded pour /links /recipes /notes, 17 tests passent, build OK.
