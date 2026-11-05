# Story 1.6 : PWA App Shell

Status: done

## Story

En tant qu'utilisateur,
Je veux que l'application s'affiche correctement même sans connexion réseau,
Afin qu'ouvrir un nouvel onglet ne produise jamais d'écran d'erreur blanc.

## Acceptance Criteria

1. **Étant donné** que `@angular/pwa` est configuré et `ngsw-config.json` définit l'app shell,
   **Quand** l'utilisateur charge l'application une première fois avec réseau,
   **Alors** le service worker est enregistré et l'app shell est mis en cache

2. **Étant donné** que le service worker est actif,
   **Quand** l'utilisateur ouvre l'application sans connexion réseau,
   **Alors** l'app shell s'affiche sans erreur (les appels API échouent gracieusement — pas d'offline data en V1)

3. **Étant donné** que le `ShareModule` (routes `/share/*`) est configuré avec le service Angular Meta,
   **Quand** une route publique est naviguée,
   **Alors** le tag `<meta name="robots" content="noindex">` est présent dans le `<head>` du document

## Tasks / Subtasks

- [x] **T1 — Affiner la stratégie d'enregistrement du Service Worker** (AC: #1)
  - [x] Dans `frontend/src/app/app.config.ts`, remplacer `registrationStrategy: 'registerWhenStable:30000'` par `registrationStrategy: 'registerImmediately'`

- [x] **T2 — Valider `ngsw-config.json`** (AC: #1, #2)
  - [x] Confirmer que `assetGroups.app` couvre bien `/index.html`, `/*.css`, `/*.js`, `/manifest.webmanifest`
  - [x] Confirmer qu'il n'y a PAS de `dataGroups` (aucun cache API en V1 — les appels `/api/*` échouent gracieusement offline)
  - [x] Aucune modification attendue — vérification seulement

- [x] **T3 — Créer `ShareViewComponent` avec Meta service** (AC: #3)
  - [x] Créer `frontend/src/app/share/components/share-view/share-view.component.ts` (standalone)
  - [x] Le composant injecte `Meta` depuis `@angular/platform-browser` et appelle `meta.addTag({ name: 'robots', content: 'noindex' })` dans le constructeur
  - [x] Supprimer le tag dans `ngOnDestroy` via `meta.removeTag("name='robots'")`

- [x] **T4 — Créer `share.routes.ts` et mettre à jour `app.routes.ts`** (AC: #3)
  - [x] Créer `frontend/src/app/share/share.routes.ts` avec `{ path: ':token', component: ShareViewComponent }`
  - [x] Ajouter dans `app.routes.ts` : `{ path: 'share', loadChildren: () => import('./share/share.routes').then(r => r.shareRoutes) }`

- [x] **T5 — Validation** (AC: #1, #2, #3)
  - [x] Build production : `ng build` réussit
  - [x] SW enregistré : `ng build` puis servir le `dist/` — DevTools → Application → Service Workers → service worker actif
  - [x] Offline : DevTools → Offline → naviguer sur `/links` — app shell visible, pas d'écran blanc
  - [x] Noindex : naviguer sur `/share/test` — DevTools → Éléments → `<head>` contient `<meta name="robots" content="noindex">`
  - [x] Tests : `ng test --watch=false` — 17+ tests passent sans régression

### Review Findings

- [x] [Review][Patch] Route `/share` sans token non résolue — vue vide [frontend/src/app/share/share.routes.ts] — fixed

- [x] [Review][Defer] Risque de tag `robots` dupliqué si `ShareViewComponent` réinstancié — `addTag` vs `updateTag` [frontend/src/app/share/components/share-view/share-view.component.ts] — deferred, pre-existing
- [x] [Review][Defer] `meta.removeTag` supprime tous les tags `name='robots'` y compris ceux d'autres sources [frontend/src/app/share/components/share-view/share-view.component.ts] — deferred, pre-existing
- [x] [Review][Defer] Pas de route wildcard `**` globale — URLs inconnues sans feedback [frontend/src/app/app.routes.ts] — deferred, pre-existing (déjà noté en 1-5)
- [x] [Review][Defer] Texte placeholder en dur visible en production sur `/share/*` [frontend/src/app/share/components/share-view/share-view.component.ts] — deferred, intentionnel jusqu'à Epic 6
- [x] [Review][Defer] `title` manquant sur la route `/share` — historique navigateur non identifiable [frontend/src/app/app.routes.ts] — deferred, pre-existing
- [x] [Review][Defer] Pas de `ChangeDetectionStrategy.OnPush` sur `ShareViewComponent` [frontend/src/app/share/components/share-view/share-view.component.ts] — deferred, pre-existing
- [x] [Review][Defer] Pas de gestion d'erreur sur l'échec du lazy chunk `/share` [frontend/src/app/app.routes.ts] — deferred, pre-existing (déjà noté en 1-5)
- [x] [Review][Defer] `registerImmediately` — conflit d'activation SW multi-onglets lors d'un déploiement [frontend/src/app/app.config.ts] — deferred, pre-existing

## Dev Notes

### État existant — NE PAS recréer

`@angular/pwa` est **déjà installé** depuis Story 1.1. Ces fichiers existent déjà :

- `frontend/ngsw-config.json` — configuration SW (app shell + assets) — valide telle quelle
- `frontend/src/index.html` — `<link rel="manifest" href="manifest.webmanifest" />` déjà présent
- `frontend/src/app/app.config.ts` — `provideServiceWorker` déjà configuré (seule `registrationStrategy` est à modifier)

**Ne pas réinstaller `@angular/pwa`, ne pas régénérer `ngsw-config.json`.**

---

### T1 — Correction `registrationStrategy` (`app.config.ts`)

**Problème (deferred de Story 1.1) :** `registerWhenStable:30000` attend 30 s ou la stabilité, ce qui est inutilement long avec Angular zoneless (l'app est stable très rapidement).

**Avant :**
```typescript
provideServiceWorker('ngsw-worker.js', {
  enabled: !isDevMode(),
  registrationStrategy: 'registerWhenStable:30000',
})
```

**Après :**
```typescript
provideServiceWorker('ngsw-worker.js', {
  enabled: !isDevMode(),
  registrationStrategy: 'registerImmediately',
})
```

`registerImmediately` enregistre le SW dès que possible — optimal pour une app zoneless où la stabilité est quasi-instantanée.

---

### T2 — `ngsw-config.json` (état actuel — aucune modification attendue)

Le fichier généré par `ng add @angular/pwa` est déjà correct :

```json
{
  "$schema": "./node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": ["/favicon.ico", "/index.csr.html", "/index.html", "/manifest.webmanifest", "/*.css", "/*.js"]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": ["/**/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)"]
      }
    }
  ]
}
```

**Ce qui est intentionnellement absent :**
- Pas de `dataGroups` → les appels `/api/*` échouent en offline (comportement V1 attendu)
- Les polices Google Fonts (`fonts.googleapis.com`) ne sont pas cachées → requêtes externes, CORS, hors contrôle du SW

---

### T3 — `ShareViewComponent` (stub avec noindex)

**Emplacement :** `frontend/src/app/share/components/share-view/share-view.component.ts`

```typescript
import { Component, inject, OnDestroy } from '@angular/core';
import { Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-share-view',
  standalone: true,
  template: `<p>Contenu partagé — disponible à partir de l'Épic 6</p>`,
})
export class ShareViewComponent implements OnDestroy {
  private readonly meta = inject(Meta);

  constructor() {
    this.meta.addTag({ name: 'robots', content: 'noindex' });
  }

  ngOnDestroy(): void {
    this.meta.removeTag("name='robots'");
  }
}
```

**Points critiques :**
- `inject(Meta)` (pas `@Inject(Meta)`) — pattern Angular 21 moderne
- `Meta` depuis `@angular/platform-browser` — pas de package supplémentaire à installer
- `ngOnDestroy` obligatoire pour supprimer le tag lors de la navigation vers d'autres routes (sinon toutes les pages portent `noindex` après une visite sur `/share/*`)
- Template minimaliste — le contenu réel est implémenté en Épics 6 et 7

---

### T4 — `share.routes.ts` et mise à jour `app.routes.ts`

**`frontend/src/app/share/share.routes.ts` (à créer) :**
```typescript
import { Routes } from '@angular/router';
import { ShareViewComponent } from './components/share-view/share-view.component';

export const shareRoutes: Routes = [
  { path: ':token', component: ShareViewComponent },
];
```

**`frontend/src/app/app.routes.ts` (ajout d'une route) :**
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
  {
    path: 'share',
    loadChildren: () => import('./share/share.routes').then(r => r.shareRoutes),
  },
];
```

---

### Structure de fichiers créés par cette story

```
frontend/src/app/
├── app.config.ts        (modifié — registrationStrategy)
├── app.routes.ts        (modifié — route /share ajoutée)
│
└── share/
    ├── share.routes.ts  (créé)
    └── components/
        └── share-view/
            └── share-view.component.ts  (créé — stub standalone)
```

---

### Comportement offline attendu (V1)

En mode offline, le SW sert l'app shell depuis le cache. Les appels API (`HttpClient`) retournent une erreur réseau — comportement attendu, aucun traitement spécial requis. L'utilisateur voit la navigation (top bar + bottom nav) mais les modules affichent une erreur ou un état vide.

**Aucun intercepteur HTTP offline n'est nécessaire en V1.**

---

### Learnings des stories précédentes

**De Story 1.5 :**
- Composants standalone uniquement — pas de NgModules
- `inject()` (pas `@Inject()`) pour tous les services Angular
- Vitest runner : `ng test --watch=false`
- Pas d'ESLint frontend — Prettier uniquement
- `provideZonelessChangeDetection()` (sans `Experimental`) — API stabilisée Angular 21

**De Story 1.1 (deferred résolu ici) :**
- `withInterceptorsFromDi()` dans `app.config.ts` → NE PAS supprimer, les intercepteurs auth seront ajoutés en Epic 2
- Stratégie SW `registerWhenStable:30000` → remplacer par `registerImmediately` (T1 de cette story)

---

### Scope de cette story

**In scope :**
- `frontend/src/app/app.config.ts` (modifier — `registrationStrategy`)
- `frontend/src/app/app.routes.ts` (modifier — ajout route `/share`)
- `frontend/src/app/share/share.routes.ts` (créer)
- `frontend/src/app/share/components/share-view/share-view.component.ts` (créer)

**Hors scope :**
- Affichage réel des recettes/notes partagées → Épics 6 et 7
- Routes `/login`, `/change-password`, `/admin` → Épics 2 et 3
- Guards d'authentification → Epic 2
- Notification de mise à jour SW via `SwUpdate` → optionnel post-V1
- Offline data / background sync → post-V1

---

### Références

- [Source: epics.md#Story 1.6] — acceptance criteria BDD
- [Source: architecture.md#Structure des routes Angular] — `/share/:token → ShareModule (lazy, public)`
- [Source: architecture.md#Organisation des fichiers Angular] — `app/share/` avec `share.routes.ts` + `components/share-view/`
- [Source: deferred-work.md#Deferred from code review de 1-1] — stratégie SW 30s trop agressive → `registerImmediately`
- [Source: story 1-1] — `@angular/pwa` installé, `ngsw-config.json` généré, `provideServiceWorker` configuré
- [Source: story 1-5] — patterns Angular 21 : `inject()`, standalone, Vitest runner

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_Aucun blocage rencontré._

### Completion Notes List

- **T1** : `registrationStrategy` mis à jour de `registerWhenStable:30000` vers `registerImmediately` dans `app.config.ts` — deferred résolu depuis Story 1.1.
- **T2** : `ngsw-config.json` validé conforme — `assetGroups.app` correct, aucun `dataGroups`, aucune modification nécessaire.
- **T3** : `ShareViewComponent` créé (standalone) avec injection de `Meta` pour tag `noindex` + nettoyage `ngOnDestroy`.
- **T4** : `share.routes.ts` créé, route `share` ajoutée dans `app.routes.ts` en lazy loading — chunk `share-routes` confirmé dans le build.
- **T5** : Build production réussi, 17 tests passent sans régression (Vitest runner).

### File List

- `frontend/src/app/app.config.ts` (modifié)
- `frontend/src/app/app.routes.ts` (modifié)
- `frontend/src/app/share/share.routes.ts` (créé)
- `frontend/src/app/share/components/share-view/share-view.component.ts` (créé)

## Change Log

- 2026-05-01 : Implémentation complète — registrationStrategy corrigée, ShareViewComponent créé, route /share ajoutée, build + 17 tests OK
