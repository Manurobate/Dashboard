# Story 4.6 : Vue par défaut, état vide et thème clair/sombre

**Épic :** 4 — Module Liens
**Statut :** done
**Créée le :** 2026-05-20

---

## User Story

En tant qu'utilisateur authentifié,
Je veux que la page Liens soit ma vue par défaut après connexion, voir un état vide actionnable quand je n'ai pas encore de liens, et choisir mon thème clair ou sombre,
Afin que Dashboard soit immédiatement utile dès la première utilisation et personnalisé à mes préférences.

---

## Critères d'acceptation

**AC1 — Redirection vers `/links` après connexion**
**Étant donné** que je me connecte avec succès,
**Quand** l'authentification réussit,
**Alors** je suis redirigé vers `/links` (vue par défaut)

**AC2 — État vide actionnable**
**Étant donné** que mon espace Liens est vide (aucune catégorie),
**Quand** j'accède à `/links`,
**Alors** un état vide s'affiche : icône outline centrée + message "Aucun lien pour l'instant" + bouton CTA "Ajouter une catégorie"

**AC3 — Toggle thème dans la top bar**
**Étant donné** que je clique l'icône toggle thème dans la top bar,
**Quand** le thème change,
**Alors** la classe `.dark-theme` est ajoutée/retirée de `<body>`, les tokens CSS et le thème Angular Material s'appliquent immédiatement

**AC4 — Persistance du thème**
**Étant donné** que j'ai sélectionné le thème sombre,
**Quand** je ferme et rouvre le navigateur,
**Alors** le thème sombre est restauré depuis localStorage avant le premier rendu

**AC5 — Skeleton screens au chargement**
**Étant donné** que le module charge pour la première fois,
**Quand** les données arrivent de l'API,
**Alors** les skeleton screens sont remplacés par les vraies cards sans flash de contenu vide

---

## ⚠️ Analyse du code existant — LIRE AVANT DE CODER

### Ce qui est DÉJÀ IMPLÉMENTÉ — NE PAS RECRÉER

**AC1 (Redirection vers `/links`)** — 100% fait, zéro code à écrire :
- `login.component.ts:40` : `void this.router.navigate(['/links'])` (après login classique)
- `login.component.ts:53` : `await this.router.navigate(['/links'])` (après mustChangePassword redirect)
- `app.routes.ts` : `{ path: '', redirectTo: 'links', pathMatch: 'full' }` (route racine)

**AC3 (Toggle thème top bar)** — 100% fait, zéro code à écrire :
- `top-bar.component.html:15-18` : bouton `mat-icon-button` avec `(click)="themeService.toggle()"` et `aria-label` dynamique
- Icônes `light_mode` / `dark_mode` selon `themeService.isDark()`

**AC4 (Persistance thème)** — 100% fait, zéro code à écrire :
- `theme.service.ts` : constructeur lit `localStorage.getItem('theme')` → applique `.dark-theme` sur `<body>` avant le premier rendu
- `toggle()` écrit dans localStorage

**ThemeService** (ne pas dupliquer ni modifier) — `frontend/src/app/core/services/theme.service.ts` :
```typescript
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _isDark = signal(false);
  readonly isDark = this._isDark.asReadonly();
  constructor() {
    const saved = this.doc.defaultView?.localStorage.getItem(THEME_STORAGE_KEY) ?? null;
    const dark = saved === 'dark';
    this._isDark.set(dark);
    this.applyTheme(dark);  // classe .dark-theme sur <body> dès le constructeur
  }
  toggle(): void { /* bascule + localStorage */ }
}
```

---

## Tasks / Subtasks

### Ce qu'il reste à implémenter (AC2 + AC5 uniquement)

- [x] T1 — Corriger l'état vide dans `LinksComponent` (AC2)
  - [x] Modifier `links.component.html` : bloc `empty-state` — changer le message et ajouter le bouton CTA
  - [x] Modifier `links.component.scss` : style bouton CTA dans `.empty-state`

- [x] T2 — Implémenter les skeleton screens (AC5)
  - [x] Modifier `links.component.html` : remplacer `mat-spinner` par skeleton cards pendant le chargement
  - [x] Modifier `links.component.scss` : animation CSS shimmer pour les skeletons

- [x] T3 — Tests Vitest (AC2, AC5)
  - [x] `links.component.spec.ts` : tests état vide (message, bouton CTA, emit openAddCategoryDialog) + tests skeleton (affiché pendant chargement, remplacé après)

### Review Findings

- [x] [Review][Decision] Shimmer — décision : garder tel quel, conforme spec (thème Noir-Braise par défaut)
- [x] [Review][Patch] Animation skeleton non supprimée pour `prefers-reduced-motion` — ajouté `@media (prefers-reduced-motion: reduce) { .skeleton-line { animation: none; } }` [links.component.scss]
- [x] [Review][Patch] `aria-label` sur `<div>` sans rôle ARIA — ajouté `role="status"` sur `.skeleton-list` [links.component.html:21]
- [x] [Review][Patch] Test manquant : l'état vide doit être absent quand `error()` est défini [links.component.spec.ts]
- [x] [Review][Patch] `@for (item of [1, 2, 3]; track item)` — remplacé par `track $index` [links.component.html:22]
- [x] [Review][Patch] Grammaire française : "ne affiche pas" → "n'affiche pas" (×2 occurrences) [links.component.spec.ts]
- [x] [Review][Defer] `isLoading()` et `error()` peuvent être simultanément vrais — `catchError` setError avant que `finalize` setLoading=false ; skeleton et message d'erreur rendus simultanément pendant un cycle CD. Comportement pré-existant du service [links.component.html] — deferred, pre-existing
- [x] [Review][Defer] Pas de test pour l'état double `isLoading=true` + `error!=null` simultané — suit le defer ci-dessus [links.component.spec.ts] — deferred, pre-existing

---

## Dev Notes

### Périmètre de cette story

**Frontend uniquement — aucun changement backend, aucun changement de service.**

Ce que cette story fait :
- Corrige le bloc `empty-state` dans `links.component.html` (message + bouton CTA conforme aux specs)
- Remplace le `mat-spinner` par des skeleton screens CSS lors du chargement initial
- Documente que AC1, AC3, AC4 sont déjà satisfaits

Ce que cette story ne fait PAS :
- Pas de modification du `ThemeService` (déjà implémenté et fonctionnel)
- Pas de modification du routing ni du composant login
- Pas de modification du `TopBarComponent`
- Pas de skeleton pour les liens (`LinksService.isLoading` n'existe pas — seul `LinkCategoriesService.isLoading` existe)
- Pas de mode édition grid/colonnes (story 4.8)

### T1 — Correction de l'état vide

**État actuel à corriger** (`links.component.html:30-35`) :
```html
<!-- ACTUEL — non conforme aux specs -->
@if (!linkCategoriesService.isLoading() && linkCategoriesService.categories().length === 0 && !linkCategoriesService.error()) {
  <div class="empty-state">
    <mat-icon>link_off</mat-icon>
    <p>Aucune catégorie. Commencez par en ajouter une !</p>
  </div>
}
```

**État cible conforme aux specs (AC2) :**
```html
@if (!linkCategoriesService.isLoading() && linkCategoriesService.categories().length === 0 && !linkCategoriesService.error()) {
  <div class="empty-state">
    <mat-icon class="empty-icon">link_off</mat-icon>
    <p class="empty-message">Aucun lien pour l'instant</p>
    <button mat-stroked-button (click)="openAddCategoryDialog()" class="empty-cta">
      <mat-icon>add</mat-icon>
      Ajouter une catégorie
    </button>
  </div>
}
```

**Points critiques pour le CTA :**
- Le bouton CTA appelle `openAddCategoryDialog()` directement — **sans** activer `editMode()` au préalable
- Ce CTA n'est visible que dans l'état vide ; ce n'est pas le bouton `editMode` de la barre d'en-tête
- Pas besoin de `editMode()` guard sur ce bouton : l'état vide est un onboarding guidé

**SCSS `links.component.scss` — ajouts dans `.empty-state` :**
```scss
.empty-state {
  // existant — conserver
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 16px;
  color: var(--mat-sys-on-surface-variant);

  .empty-icon {
    font-size: 48px;
    width: 48px;
    height: 48px;
    opacity: 0.6;  // icône discrète, pas intrusive
  }

  .empty-message {
    margin: 0;
    font-size: 16px;
  }

  .empty-cta {
    margin-top: 4px;  // petit écart supplémentaire avant le CTA
  }
}
```

### T2 — Skeleton screens

**Stratégie :** Remplacer le `mat-spinner` actuel par 3 skeleton cards qui imitent la structure de `LinkCategoryCard` (hauteur ~56px = hauteur d'un `mat-expansion-panel-header`).

**⚠️ Pas de bibliothèque externe.** Utiliser uniquement CSS `@keyframes` + `background-gradient`. Même pattern que les skeleton Material.

**Modifier `links.component.html` — remplacer le bloc spinner :**
```html
<!-- AVANT -->
@if (linkCategoriesService.isLoading()) {
  <div class="loading-container">
    <mat-spinner diameter="40" />
  </div>
}

<!-- APRÈS -->
@if (linkCategoriesService.isLoading()) {
  <div class="skeleton-list" aria-label="Chargement des liens..." aria-busy="true">
    @for (item of [1, 2, 3]; track item) {
      <div class="skeleton-card">
        <div class="skeleton-line skeleton-emoji"></div>
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-badge"></div>
      </div>
    }
  </div>
}
```

**SCSS — animation shimmer (ajouter dans `links.component.scss`) :**
```scss
@keyframes skeleton-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-card {
  height: 56px;
  border-radius: 8px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--mat-sys-surface-variant);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.skeleton-line {
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--mat-sys-surface-variant) 25%,
    var(--mat-sys-outline-variant) 50%,
    var(--mat-sys-surface-variant) 75%
  );
  background-size: 800px 100%;
  animation: skeleton-shimmer 1.5s infinite linear;
}

.skeleton-emoji {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 50%;
}

.skeleton-title {
  flex: 1;
  height: 16px;
  max-width: 200px;
}

.skeleton-badge {
  width: 32px;
  height: 20px;
  border-radius: 10px;
  flex-shrink: 0;
}
```

**Note :** `mat-spinner` peut être retiré des imports si plus aucun autre usage. Vérifier `MatProgressSpinnerModule` dans `links.component.ts` imports.

**Retirer `MatProgressSpinnerModule`** de `links.component.ts` si c'était le seul usage du spinner.

### T3 — Tests Vitest

**Pattern Vitest (pas Jasmine)** — conforme à `links.component.spec.ts` existant.

Les tests suivent le pattern établi dans les stories précédentes : `vi.fn()` + `signal()` pour les mocks de services.

**Tests état vide :**
```typescript
describe('État vide', () => {
  it('affiche le message "Aucun lien pour l\'instant" quand aucune catégorie et pas de chargement', () => {
    // categoriesService.isLoading() = false, categories() = [], error() = null
    // → vérifier présence du texte "Aucun lien pour l'instant"
  });

  it('affiche le bouton CTA "Ajouter une catégorie" dans l\'état vide', () => {
    // → vérifier présence du bouton texte "Ajouter une catégorie"
  });

  it('appelle openAddCategoryDialog() quand le bouton CTA est cliqué', () => {
    // → simuler click, vérifier dialog.open() appelé
  });

  it('ne affiche pas l\'état vide quand categories().length > 0', () => {
    // → catégories non vides, état vide absent
  });

  it('ne affiche pas l\'état vide pendant le chargement', () => {
    // → isLoading() = true, état vide absent
  });
});
```

**Tests skeleton :**
```typescript
describe('Skeleton screens', () => {
  it('affiche les skeleton cards pendant le chargement', () => {
    // isLoading() = true → .skeleton-card présentes (x3)
  });

  it('masque les skeleton cards après le chargement', () => {
    // isLoading() = false → .skeleton-card absentes
  });
});
```

### Architecture et contraintes

**Tokens CSS thème** : utiliser `var(--mat-sys-surface-variant)` et `var(--mat-sys-outline-variant)` pour les skeletons — ces tokens s'adaptent automatiquement au thème clair/sombre via AM3. **Ne pas utiliser de couleurs hexadécimales codées en dur.**

**`MatProgressSpinnerModule`** : vérifier `links.component.ts` — si `MatProgressSpinnerModule` est importé uniquement pour le spinner de chargement, le retirer des imports quand remplacé par les skeletons. Si utilisé ailleurs dans le fichier, le conserver.

**Signaux disponibles dans `LinksComponent` pour la condition d'état vide :**
- `linkCategoriesService.isLoading()` : boolean
- `linkCategoriesService.categories()` : `LinkCategory[]`
- `linkCategoriesService.error()` : `string | null`
- Condition exacte à conserver : `!isLoading() && categories().length === 0 && !error()`

**`openAddCategoryDialog()`** : méthode déjà présente dans `LinksComponent` (`links.component.ts:148`) — rien à modifier dans le TS, juste appeler depuis le template.

### Arborescence des fichiers

```
frontend/src/app/links/
├── links.component.ts      ← modifier : retirer MatProgressSpinnerModule si plus utilisé
├── links.component.html    ← modifier : état vide (message + CTA) + skeleton screens
├── links.component.scss    ← modifier : styles skeleton + style CTA état vide
└── links.component.spec.ts ← modifier : tests état vide + skeleton
```

Aucun autre fichier à modifier.

---

## Project Structure Notes

- Composants standalone (pas de NgModule) — conforme architecture
- `OnPush` sur tous les composants — utiliser uniquement des signaux (pas de `subscribe` dans le template)
- Les tokens `--mat-sys-*` s'adaptent automatiquement aux thèmes clair/sombre — utiliser en priorité pour les skeletons
- Ce projet utilise l'API AM3 (`mat.theme()`) — les tokens sont générés automatiquement

---

## References

- [Source: epics.md#Story 4.6 — critères d'acceptation complets]
- [Source: ux-design-Dashboard.md#Empty States — pattern état vide actionnable]
- [Source: ux-design-Dashboard.md#Chargement — skeleton screens pour listes de liens]
- [Source: architecture.md#Theming — tokens --mat-sys-* AM3, classe .dark-theme sur body]
- [Source: frontend/src/app/links/links.component.html — état actuel empty-state à corriger]
- [Source: frontend/src/app/links/links.component.ts:148 — openAddCategoryDialog() déjà présent]
- [Source: frontend/src/app/core/services/theme.service.ts — ThemeService déjà complet]
- [Source: frontend/src/app/core/components/top-bar/top-bar.component.html:15-18 — toggle thème déjà wired]
- [Source: frontend/src/app/app.routes.ts — redirectTo: 'links' déjà en place]
- [Source: frontend/src/app/auth/login/login.component.ts:40,53 — navigate('/links') déjà en place]
- [Source: 4-5-composants-linkcategorycard-et-linkitem.md#Dev Notes — Tests Vitest vi.fn(), pas Jasmine]

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (2026-05-20)

### Completion Notes List

- T1 : État vide corrigé dans `links.component.html` — message "Aucun lien pour l'instant", bouton CTA `.empty-cta` avec `(click)="openAddCategoryDialog()"` et icône `add`.
- T1 : SCSS mis à jour — `.empty-icon` (opacity 0.6, 48px), `.empty-message` (margin: 0), `.empty-cta` (margin-top: 4px). Ancien sélecteur `mat-icon` nu remplacé par `.empty-icon`.
- T2 : `mat-spinner` remplacé par 3 skeleton cards avec animation shimmer CSS `@keyframes skeleton-shimmer`. Tokens `var(--mat-sys-surface-variant)` et `var(--mat-sys-outline-variant)` utilisés — s'adaptent automatiquement au thème clair/sombre.
- T2 : `MatProgressSpinnerModule` retiré des imports de `links.component.ts` (n'était utilisé que pour le spinner).
- T3 : 7 nouveaux tests Vitest ajoutés (5 état vide + 2 skeleton). Suite complète : 80 tests, 0 échec.
- AC1 (redirection `/links`), AC3 (toggle top bar), AC4 (persistance localStorage) confirmés déjà implémentés — aucune modification nécessaire.

### File List

- `frontend/src/app/links/links.component.html`
- `frontend/src/app/links/links.component.scss`
- `frontend/src/app/links/links.component.ts`
- `frontend/src/app/links/links.component.spec.ts`

### Change Log

- 2026-05-20 : Création du fichier story — analyse des artefacts et code existant, identification de ce qui est déjà implémenté (AC1, AC3, AC4) vs ce qui reste à faire (AC2 état vide + AC5 skeleton screens)
- 2026-05-20 : Implémentation complète — AC2 état vide corrigé (message + CTA), AC5 skeleton screens remplacent le spinner, MatProgressSpinnerModule retiré, 7 nouveaux tests Vitest (80/80 passent)
