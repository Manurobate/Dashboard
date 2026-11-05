# Story 4.8 : Paramétrage de l'affichage des cards en mode lecture

**Épic :** 4 — Module Liens  
**Statut :** done  
**Créée le :** 2026-05-20

---

## User Story

En tant qu'utilisateur sur un écran large,  
Je veux configurer le nombre de colonnes, la largeur des cards et l'espacement depuis un widget discret,  
Afin que l'espace disponible de mon écran soit pleinement utilisé.

---

## Critères d'acceptation

**AC1 — Icône ⚙️ visible en mode lecture sur viewport ≥ 600 px**  
**Étant donné** que je suis en mode lecture sur un viewport ≥ 600 px,  
**Quand** j'accède à la page Liens,  
**Alors** une icône ⚙️ (`mat-icon-button`, `aria-label="Paramètres d'affichage"`) est visible à côté du bouton "Modifier" dans la barre d'action

**AC2 — Popover MatMenu avec quatre contrôles**  
**Étant donné** que je clique l'icône ⚙️,  
**Quand** le popover s'ouvre (MatMenu),  
**Alors** il affiche quatre contrôles :
- Nombre de colonnes : stepper (+/-), valeurs 1–6, défaut 3
- Largeur des cards : slider, valeurs 200–600 px (pas 10 px), défaut 280 px
- Espacement horizontal : slider, valeurs 8–48 px (pas 4 px), défaut 16 px
- Espacement vertical : slider, valeurs 8–48 px (pas 4 px), défaut 16 px

**AC3 — Mise à jour temps réel via CSS custom properties**  
**Étant donné** que je modifie un paramètre,  
**Quand** la valeur change,  
**Alors** la grid se met à jour immédiatement via les CSS custom properties `--link-columns`, `--link-card-width`, `--link-gap-h`, `--link-gap-v`  
(grid : `repeat(var(--link-columns, 3), minmax(var(--link-card-width, 280px), 1fr))`)

**AC4 — Persistance dans localStorage**  
**Étant donné** que je ferme et rouvre le navigateur sur le même device,  
**Quand** la page Liens charge,  
**Alors** mes paramètres sont restaurés depuis localStorage (clé `links-grid-settings : { columns, cardWidth, gapH, gapV }`) avant le premier rendu

**AC5 — Mobile : widget masqué, 1 colonne forcée**  
**Étant donné** que le viewport passe sous 600 px (mobile),  
**Quand** la page s'affiche,  
**Alors** l'icône ⚙️ est masquée et la grid est forcée à 1 colonne (les CSS custom properties sont ignorées par la media query)

**AC6 — Widget invisible en mode édition**  
**Étant donné** que je suis en mode édition,  
**Quand** j'inspecte la barre d'action,  
**Alors** l'icône ⚙️ n'est pas visible

**AC7 — Valeurs par défaut si aucun paramètre en localStorage**  
**Étant donné** qu'aucun paramètre n'est enregistré dans localStorage,  
**Quand** je charge la page pour la première fois,  
**Alors** les valeurs par défaut s'appliquent (3 colonnes, 280 px, 16 px H, 16 px V)

---

## ⚠️ Analyse du code existant — LIRE AVANT DE CODER

### Ce qui est DÉJÀ IMPLÉMENTÉ — NE PAS RECRÉER

**`LinksComponent`** (`frontend/src/app/links/links.component.ts`) :
- Signal `editMode` déjà en place (ligne 47)
- Signal `connectedListIds` calculé depuis les catégories (lignes 48-50)
- `inject(MatSnackBar)`, `inject(MatDialog)`, `inject(LinksService)`, `inject(LinkCategoriesService)` déjà présents
- Imports `DragDropModule`, `MatButtonModule`, `MatIconModule`, `LinkCategoryCardComponent` déjà dans le tableau `imports`
- Template : bouton "Modifier/Terminer" avec `aria-label`, état vide, skeleton — tout inchangé

**Grid CSS actuelle** (`frontend/src/app/links/links.component.scss`) :
```scss
.links-page {
  padding: 16px;
  max-width: 800px;  // ← À SUPPRIMER — bloque l'expansion sur grands écrans
  margin: 0 auto;
}

.category-list {
  // mobile : flex column (OK)
  @media (min-width: 768px) {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));  // ← REMPLACER par custom props
    &.edit-mode { display: flex; flex-direction: column; }
  }
}
```

**[class.edit-mode]="editMode()"** déjà sur `<div class="category-list">` dans le template (ligne 51) — ne pas retirer.

**Pattern test** (`links.component.spec.ts`) :
- `TestBed.configureTestingModule({ imports: [LinksComponent], providers: [...] })`
- `provideAnimationsAsync()` requis
- Mocks via `vi.fn()` (Vitest), signals via `signal<T>()`
- Pattern mock service : objet avec `vi.fn()` pour les méthodes + `signal()` pour les propriétés réactives

---

## Tasks / Subtasks

### T1 — Créer `LinksGridSettingsService`

- [x] Créer `frontend/src/app/links/links-grid-settings.service.ts`
  - Service `@Injectable({ providedIn: 'root' })`
  - Interface `GridSettings { columns, cardWidth, gapH, gapV }`
  - Signal `gridSettings` initialisé depuis localStorage (clé `links-grid-settings`)
  - `effect()` dans le constructeur pour persister chaque mutation dans localStorage
  - Méthode `updateSettings(partial: Partial<GridSettings>): void`
  - Valeurs par défaut : `{ columns: 3, cardWidth: 280, gapH: 16, gapV: 16 }`
- [x] Créer `frontend/src/app/links/links-grid-settings.service.spec.ts`
  - 4 tests : valeurs par défaut, restauration depuis localStorage, `updateSettings()` + persistance, JSON corrompu → defaults

### T2 — Modifier `LinksComponent` : injection + effect CSS

- [x] Modifier `frontend/src/app/links/links.component.ts`
  - Injecter `LinksGridSettingsService`, `ElementRef`, `BreakpointObserver`
  - Ajouter `toSignal` import depuis `@angular/core/rxjs-interop`
  - Créer `isSmallScreen` via `toSignal(breakpointObserver.observe('(max-width: 599.99px)').pipe(map(r => r.matches)), { initialValue: false })`
  - Ajouter `effect()` dans le constructeur pour appliquer les 4 CSS custom properties sur `elementRef.nativeElement`
  - Ajouter les méthodes : `adjustColumns(delta: number)`, `updateCardWidth(v: number)`, `updateGapH(v: number)`, `updateGapV(v: number)`
  - Ajouter aux `imports` : `MatMenuModule`, `MatSliderModule`, `ReactiveFormsModule` (ou `FormsModule` si nécessaire)
- [x] Modifier `frontend/src/app/links/links.component.spec.ts`
  - Ajouter mock `LinksGridSettingsService` et `BreakpointObserver` dans `providers`
  - Ajouter `describe('widget ⚙️')` avec 3 tests (visibilité)
  - Ajouter `describe('adjustColumns()')` avec 2 tests (min/max)

### T3 — Modifier le template `links.component.html`

- [x] Ajouter le bouton ⚙️ avec `@if (!editMode() && !isSmallScreen())` dans `.header-actions`
- [x] Ajouter `<mat-menu #gridSettingsMenu>` avec les 4 contrôles (stepper colonnes + 3 sliders)
- [x] Le panneau du menu doit stopper la propagation des clics pour éviter la fermeture

### T4 — Modifier le SCSS `links.component.scss`

- [x] Supprimer `max-width: 800px` de `.links-page` (AC3 : la grid doit pouvoir s'étendre)
- [x] Mettre à jour `.category-list` :
  - Remplacer le grid fixe par CSS custom properties (`--link-columns`, `--link-card-width`, `--link-gap-h`, `--link-gap-v`)
  - Seuil 600 px (pas 768 px) pour activer le grid paramétrable
  - Mobile (< 600 px) : 1 colonne forcée, CSS custom properties ignorées

### T5 — Tests E2E Playwright

- [x] Créer `e2e/tests/links-grid-settings.spec.ts`
  - Viewport 1920 px : ouvrir ⚙️ → passer à 5 colonnes → vérifier la grid
  - Recharger → vérifier restauration depuis localStorage
  - Passer en mode édition → vérifier que ⚙️ disparaît
  - Viewport 390 px : vérifier que ⚙️ est masqué

### Review Findings

- [x] [Review][Decision] Suppression du `<h1>Liens</h1>` → patch : réintroduire `<h1>` au-dessus de `.links-page` [frontend/src/app/links/links.component.html]
- [x] [Review][Decision] Déviation AC3 `minmax(0, card-width)` acceptée — correctif #1 techniquement justifié, spec mise à jour
- [x] [Review][Patch] Pas de validation de plage ni de type sur les valeurs restaurées depuis localStorage — ajout `clamp()` avec vérification `typeof` [frontend/src/app/links/links-grid-settings.service.ts]
- [x] [Review][Patch] Tests E2E : localStorage non réinitialisé entre tests — ajout `test.beforeEach` avec `localStorage.removeItem` [e2e/tests/links-grid-settings.spec.ts]
- [x] [Review][Patch] Tests E2E : pas de `waitForSelector` après rechargement avant de cliquer sur ⚙️ [e2e/tests/links-grid-settings.spec.ts]
- [x] [Review][Patch] `effect()` localStorage sans try/catch côté écriture — wrappé dans try/catch [frontend/src/app/links/links-grid-settings.service.ts]
- [x] [Review][Patch] `login()` E2E typé `page: any` → `Page` de Playwright [e2e/tests/links-grid-settings.spec.ts]
- [x] [Review][Defer] Header actions toujours rendu pendant le skeleton — comportement pré-existant [frontend/src/app/links/links.component.html] — deferred, pre-existing
- [x] [Review][Defer] Pas de reset des paramètres de grid depuis mobile — limitation acceptable par design (widget caché < 600px) — deferred, pre-existing

---

## Dev Notes

### T1 — LinksGridSettingsService

**Créer `frontend/src/app/links/links-grid-settings.service.ts` :**

```typescript
import { Injectable, signal, effect } from '@angular/core';

export interface GridSettings {
  columns: number;
  cardWidth: number;
  gapH: number;
  gapV: number;
}

const DEFAULTS: GridSettings = { columns: 3, cardWidth: 280, gapH: 16, gapV: 16 };
const STORAGE_KEY = 'links-grid-settings';

@Injectable({ providedIn: 'root' })
export class LinksGridSettingsService {
  readonly gridSettings = signal<GridSettings>(this.loadFromStorage());

  constructor() {
    effect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.gridSettings()));
    });
  }

  private loadFromStorage(): GridSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw) as Partial<GridSettings>;
      return {
        columns: parsed.columns ?? DEFAULTS.columns,
        cardWidth: parsed.cardWidth ?? DEFAULTS.cardWidth,
        gapH: parsed.gapH ?? DEFAULTS.gapH,
        gapV: parsed.gapV ?? DEFAULTS.gapV,
      };
    } catch {
      return { ...DEFAULTS };
    }
  }

  updateSettings(partial: Partial<GridSettings>): void {
    this.gridSettings.update((s) => ({ ...s, ...partial }));
  }
}
```

**Tests `links-grid-settings.service.spec.ts` :**
```typescript
import { TestBed } from '@angular/core/testing';
import { LinksGridSettingsService } from './links-grid-settings.service';

describe('LinksGridSettingsService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });
  afterEach(() => localStorage.clear());

  it('utilise les valeurs par défaut si localStorage est vide', () => {
    const svc = TestBed.inject(LinksGridSettingsService);
    expect(svc.gridSettings()).toEqual({ columns: 3, cardWidth: 280, gapH: 16, gapV: 16 });
  });

  it('restaure les paramètres depuis localStorage', () => {
    localStorage.setItem('links-grid-settings', JSON.stringify({ columns: 5, cardWidth: 350, gapH: 24, gapV: 24 }));
    const svc = TestBed.inject(LinksGridSettingsService);
    expect(svc.gridSettings()).toEqual({ columns: 5, cardWidth: 350, gapH: 24, gapV: 24 });
  });

  it('updateSettings() met à jour le signal et persiste dans localStorage', () => {
    const svc = TestBed.inject(LinksGridSettingsService);
    TestBed.flushEffects();       // flush l'effect d'écriture initiale
    svc.updateSettings({ columns: 5 });
    TestBed.flushEffects();
    expect(svc.gridSettings().columns).toBe(5);
    const stored = JSON.parse(localStorage.getItem('links-grid-settings')!);
    expect(stored.columns).toBe(5);
  });

  it('retourne les valeurs par défaut si le localStorage est corrompu', () => {
    localStorage.setItem('links-grid-settings', '{invalid-json}');
    const svc = TestBed.inject(LinksGridSettingsService);
    expect(svc.gridSettings()).toEqual({ columns: 3, cardWidth: 280, gapH: 16, gapV: 16 });
  });
});
```

> **Note `TestBed.flushEffects()`** : disponible depuis Angular 19+, permet de déclencher les `effect()` synchroniquement dans les tests sans `fixture.detectChanges()`. Si la méthode n'existe pas dans la version de TestBed, utiliser `TestBed.tick()` ou tester via les effets de bord (localStorage).

### T2 — LinksComponent : ajouts nécessaires

**Imports à ajouter** dans le tableau `imports` du composant :
```typescript
import { MatMenuModule } from '@angular/material/menu';
import { MatSliderModule } from '@angular/material/slider';
```

**Imports à ajouter** dans les imports TypeScript :
```typescript
import { effect, ElementRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs/operators';
import { LinksGridSettingsService } from './links-grid-settings.service';
```

**Injections à ajouter dans la classe :**
```typescript
protected readonly gridSettingsService = inject(LinksGridSettingsService);
private readonly elementRef = inject(ElementRef);
private readonly breakpointObserver = inject(BreakpointObserver);

readonly isSmallScreen = toSignal(
  this.breakpointObserver.observe('(max-width: 599.99px)').pipe(map((r) => r.matches)),
  { initialValue: false },
);
```

**`effect()` à ajouter dans le constructeur** (créer le constructeur s'il n'existe pas) :
```typescript
constructor() {
  effect(() => {
    const s = this.gridSettingsService.gridSettings();
    const el = this.elementRef.nativeElement as HTMLElement;
    el.style.setProperty('--link-columns', String(s.columns));
    el.style.setProperty('--link-card-width', `${s.cardWidth}px`);
    el.style.setProperty('--link-gap-h', `${s.gapH}px`);
    el.style.setProperty('--link-gap-v', `${s.gapV}px`);
  });
}
```

**Méthodes à ajouter dans la classe :**
```typescript
adjustColumns(delta: number): void {
  const current = this.gridSettingsService.gridSettings().columns;
  this.gridSettingsService.updateSettings({ columns: Math.min(6, Math.max(1, current + delta)) });
}

updateCardWidth(value: number): void {
  this.gridSettingsService.updateSettings({ cardWidth: value });
}

updateGapH(value: number): void {
  this.gridSettingsService.updateSettings({ gapH: value });
}

updateGapV(value: number): void {
  this.gridSettingsService.updateSettings({ gapV: value });
}
```

### T3 — Template links.component.html

**Ajouter le bouton ⚙️ et le menu dans `.header-actions`**, juste avant le bouton "Modifier/Terminer" :
```html
@if (!editMode() && !isSmallScreen()) {
  <button mat-icon-button [matMenuTriggerFor]="gridSettingsMenu"
          aria-label="Paramètres d'affichage">
    <mat-icon>settings</mat-icon>
  </button>
}

<mat-menu #gridSettingsMenu="matMenu">
  <div class="grid-settings-panel" (click)="$event.stopPropagation()">
    <!-- Colonnes : stepper +/- -->
    <div class="setting-row">
      <span class="setting-label">Colonnes : {{ gridSettingsService.gridSettings().columns }}</span>
      <div class="stepper-controls">
        <button mat-icon-button (click)="adjustColumns(-1)"
                [disabled]="gridSettingsService.gridSettings().columns <= 1" aria-label="Moins de colonnes">
          <mat-icon>remove</mat-icon>
        </button>
        <button mat-icon-button (click)="adjustColumns(1)"
                [disabled]="gridSettingsService.gridSettings().columns >= 6" aria-label="Plus de colonnes">
          <mat-icon>add</mat-icon>
        </button>
      </div>
    </div>

    <!-- Largeur des cards -->
    <div class="setting-row">
      <span class="setting-label">Largeur : {{ gridSettingsService.gridSettings().cardWidth }}px</span>
      <mat-slider min="200" max="600" step="10" discrete>
        <input matSliderThumb
               [value]="gridSettingsService.gridSettings().cardWidth"
               (valueChange)="updateCardWidth($event)">
      </mat-slider>
    </div>

    <!-- Espacement horizontal -->
    <div class="setting-row">
      <span class="setting-label">Espacement H : {{ gridSettingsService.gridSettings().gapH }}px</span>
      <mat-slider min="8" max="48" step="4" discrete>
        <input matSliderThumb
               [value]="gridSettingsService.gridSettings().gapH"
               (valueChange)="updateGapH($event)">
      </mat-slider>
    </div>

    <!-- Espacement vertical -->
    <div class="setting-row">
      <span class="setting-label">Espacement V : {{ gridSettingsService.gridSettings().gapV }}px</span>
      <mat-slider min="8" max="48" step="4" discrete>
        <input matSliderThumb
               [value]="gridSettingsService.gridSettings().gapV"
               (valueChange)="updateGapV($event)">
      </mat-slider>
    </div>
  </div>
</mat-menu>
```

> **⚠️ `(click)="$event.stopPropagation()"` sur `.grid-settings-panel`** : empêche le `MatMenu` de se fermer lors d'un clic sur les sliders ou les boutons stepper à l'intérieur. Sans ça, le menu se ferme dès le premier click dans le panneau.

> **`discrete` sur `<mat-slider>`** : affiche la valeur courante dans une bulle tooltip pendant le glissement — recommandé pour la précision des valeurs numériques.

### T4 — SCSS links.component.scss

**Supprimer `max-width: 800px` de `.links-page`** — nécessaire pour que la grid puisse s'étendre sur les grands écrans :
```scss
.links-page {
  padding: 16px;
  // SUPPRIMER : max-width: 800px;
  // SUPPRIMER : margin: 0 auto;
}
```

**Remplacer le bloc `.category-list`** :
```scss
.category-list {
  display: grid;
  grid-template-columns: 1fr;   // mobile par défaut : 1 colonne
  gap: 12px;

  @media (min-width: 600px) {
    grid-template-columns: repeat(var(--link-columns, 3), minmax(var(--link-card-width, 280px), 1fr));
    gap: var(--link-gap-v, 16px) var(--link-gap-h, 16px);

    &.edit-mode {
      grid-template-columns: 1fr;
      gap: 12px;
    }
  }
}
```

**Ajouter les styles du panneau de paramétrage** (en bas du fichier) :
```scss
.grid-settings-panel {
  padding: 8px 16px;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  font-size: 12px;
  color: var(--mat-sys-on-surface-variant);
}

.stepper-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}
```

> **Attention `max-width: 800px`** : ce changement élargit la page Liens en mode lecture sur grand écran. Vérifier qu'aucun autre composant ne dépend de cette contrainte. Les autres modules (admin, profil) ont leurs propres conteneurs et ne sont pas affectés.

### T5 — Tests E2E Playwright

**Créer `e2e/tests/links-grid-settings.spec.ts` :**
```typescript
import { test, expect } from '@playwright/test';

const username = process.env.E2E_ADMIN_USERNAME;
const password = process.env.E2E_ADMIN_PASSWORD;

if (!username || !password) {
  throw new Error('E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD must be set');
}

async function login(page: any) {
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', username!);
  await page.fill('input[autocomplete="current-password"]', password!);
  await page.click('button[type="submit"]');
  await page.waitForURL('/links', { timeout: 10000 });
}

test('widget ⚙️ visible en mode lecture sur grand écran', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await login(page);
  await expect(page.locator('button[aria-label="Paramètres d\'affichage"]')).toBeVisible();
});

test('widget ⚙️ masqué en mode édition', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await login(page);
  await page.click('button:has-text("Modifier")');
  await expect(page.locator('button[aria-label="Paramètres d\'affichage"]')).not.toBeVisible();
});

test('widget ⚙️ masqué sur mobile (< 600px)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await expect(page.locator('button[aria-label="Paramètres d\'affichage"]')).not.toBeVisible();
});

test('changement colonnes persisté dans localStorage et restauré au rechargement', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await login(page);

  // Ouvrir le menu ⚙️
  await page.click('button[aria-label="Paramètres d\'affichage"]');

  // Cliquer 2 fois sur "Plus de colonnes" pour passer de 3 à 5
  await page.click('button[aria-label="Plus de colonnes"]');
  await page.click('button[aria-label="Plus de colonnes"]');

  // Vérifier la valeur dans localStorage
  const stored = await page.evaluate(() => localStorage.getItem('links-grid-settings'));
  const parsed = JSON.parse(stored!);
  expect(parsed.columns).toBe(5);

  // Recharger la page
  await page.reload();
  await page.waitForURL('/links');

  // Rouvrir le menu et vérifier la valeur affichée
  await page.click('button[aria-label="Paramètres d\'affichage"]');
  await expect(page.locator('.setting-row').first()).toContainText('5');
});
```

---

## Architecture et contraintes

### Séparation des breakpoints : 600 px vs 768 px

Ce projet utilise un breakpoint global à **768 px** (navigation, panneau admin, etc.). La story 4.8 introduit un breakpoint **600 px propre au module Liens** uniquement — n'affecte pas les autres modules.

- 600 px : seuil de visibilité du widget ⚙️ et d'activation du grid paramétrable (Liens uniquement)
- 768 px : breakpoint global navigation/layout — inchangé

### CSS custom properties : pattern `effect()` + `ElementRef`

Les CSS custom properties sont appliquées sur le host element de `LinksComponent` via `effect()`. Ce pattern est documenté dans `architecture.md` (section "Paramétrage de la grid Liens") :
- `effect()` réagit automatiquement au signal `gridSettings`
- Les custom properties CSS se propagent en cascade vers `.category-list` et ses enfants
- La valeur par défaut `var(--link-columns, 3)` garantit que la grid fonctionne même si le JS est lent au chargement

### `effect()` dans un composant Angular 21

L'appel `effect()` dans le constructeur est valide — le composant est dans un injection context. Angular 21 ne requiert plus de passer `injector` manuellement. L'effet est automatiquement détruit quand le composant est détruit.

### `MatSlider` Angular Material 21 — API obligatoire

Angular Material 17+ : l'ancienne API `<mat-slider [(ngModel)]="...">` n'existe plus. La nouvelle API est :
```html
<mat-slider min="X" max="Y" step="Z">
  <input matSliderThumb [value]="signal()" (valueChange)="handler($event)">
</mat-slider>
```
`(valueChange)` émet un `number`. Ne pas utiliser `(change)` (ancien événement).

### `MatMenu` et fermeture automatique

Par défaut, `MatMenu` se ferme sur tout clic sur ses éléments (`mat-menu-item`). Nos contrôles ne sont **pas** des `mat-menu-item` — ils sont dans un `<div>` générique. Cependant, pour prévenir la fermeture sur les clics internes (notamment lors des sliders), ajouter `(click)="$event.stopPropagation()"` sur le panneau parent.

### `BreakpointObserver` — import

```typescript
import { BreakpointObserver } from '@angular/cdk/layout';
```
Le package `@angular/cdk` est déjà dans les dépendances. Pas de nouveau package à installer.

### `toSignal()` — injection context requis

`toSignal()` doit être appelé dans un injection context (constructeur ou propriété de classe initialisée directement). L'appel dans le corps de la classe (ligne de propriété) fonctionne :
```typescript
readonly isSmallScreen = toSignal(...);  // ✅ valide
```

### Arborescence des fichiers à créer/modifier

```
frontend/src/app/links/
├── links-grid-settings.service.ts        ← CRÉER
├── links-grid-settings.service.spec.ts   ← CRÉER
├── links.component.ts                    ← MODIFIER : inject service + BreakpointObserver + effect() + méthodes
├── links.component.html                  ← MODIFIER : bouton ⚙️ + MatMenu
├── links.component.scss                  ← MODIFIER : supprimer max-width + remplacer grid CSS
└── links.component.spec.ts               ← MODIFIER : mock service + 5 nouveaux tests

e2e/tests/
└── links-grid-settings.spec.ts           ← CRÉER
```

Aucune modification backend. Aucune migration DB. Aucune modification des composants `LinkCategoryCardComponent` ou `LinkItemComponent`.

---

## Tests Vitest — ajouts dans `links.component.spec.ts`

**Ajouter dans les imports TypeScript du spec :**
```typescript
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';
import { LinksGridSettingsService, GridSettings } from './links-grid-settings.service';
```

**Ajouter dans les déclarations du describe :**
```typescript
let gridSettingsService: {
  gridSettings: ReturnType<typeof signal<GridSettings>>;
  updateSettings: ReturnType<typeof vi.fn>;
};
let breakpointObserver: { observe: ReturnType<typeof vi.fn> };
```

**Dans `beforeEach` — ajouter avant `TestBed.configureTestingModule` :**
```typescript
const gs = signal<GridSettings>({ columns: 3, cardWidth: 280, gapH: 16, gapV: 16 });
gridSettingsService = {
  gridSettings: gs,
  updateSettings: vi.fn().mockImplementation((partial: Partial<GridSettings>) => {
    gs.update((s) => ({ ...s, ...partial }));
  }),
};
breakpointObserver = {
  observe: vi.fn().mockReturnValue(of({ matches: false, breakpoints: {} })),
};
```

**Dans `providers` de `TestBed.configureTestingModule` — ajouter :**
```typescript
{ provide: LinksGridSettingsService, useValue: gridSettingsService },
{ provide: BreakpointObserver, useValue: breakpointObserver },
```

**Nouveaux `describe` à ajouter :**
```typescript
describe('widget ⚙️ (isSmallScreen)', () => {
  it('isSmallScreen est false par défaut (BreakpointObserver retourne false)', () => {
    fixture.detectChanges();
    expect(component.isSmallScreen()).toBe(false);
  });

  it('le bouton ⚙️ est visible en mode lecture et grand écran', () => {
    fixture.detectChanges();
    const btn = fixture.debugElement.nativeElement.querySelector('button[aria-label="Paramètres d\'affichage"]');
    expect(btn).not.toBeNull();
  });

  it('le bouton ⚙️ est absent en mode édition', () => {
    component.toggleEditMode();
    fixture.detectChanges();
    const btn = fixture.debugElement.nativeElement.querySelector('button[aria-label="Paramètres d\'affichage"]');
    expect(btn).toBeNull();
  });
});

describe('adjustColumns()', () => {
  it('incrémente le nombre de colonnes via updateSettings', () => {
    component.adjustColumns(1);
    expect(gridSettingsService.updateSettings).toHaveBeenCalledWith({ columns: 4 });
  });

  it('ne dépasse pas 6 colonnes', () => {
    gridSettingsService.gridSettings.set({ columns: 6, cardWidth: 280, gapH: 16, gapV: 16 });
    component.adjustColumns(1);
    expect(gridSettingsService.updateSettings).toHaveBeenCalledWith({ columns: 6 });
  });
});
```

---

## Learnings de la story précédente (4.7)

- **`effect()` premier usage dans le projet** — Angular 21 le supporte pleinement. Pas besoin de `{ manualCleanup: true }`. L'effet est automatiquement nettoyé à la destruction du composant.
- **Pattern `OnPush` + signals** : ne pas utiliser `ChangeDetectorRef.markForCheck()` — les signals gèrent le CD automatiquement. Vrai aussi pour `effect()`.
- **Tokens CSS Material** : utiliser `var(--mat-sys-*)` pour les couleurs — s'adaptent automatiquement aux thèmes clair/sombre.
- **Tests Angular** : `TestBed` + `provideAnimationsAsync()` requis pour les composants Angular Material.
- **Isolation userId** : cette story est purement frontend/localStorage — pas de validation backend nécessaire.
- **Race condition** : aucun risque ici (pas de requêtes réseau, mutations synchrones sur signal local).

---

## Scénarios E2E

- Viewport 1920 px + mode lecture : ⚙️ visible → clic → menu ouvert → +2 colonnes → grid mise à jour → rechargement → restauration
- Mode édition : ⚙️ absent
- Viewport 390 px : ⚙️ absent, grid en 1 colonne

---

## Project Structure Notes

- Composants standalone (pas de NgModule) — import direct dans le tableau `imports[]`
- `OnPush` sur tous les composants — signals uniquement
- Backend NestJS : aucun changement pour cette story
- Tests backend : aucun changement pour cette story
- Tests frontend composants : Vitest (`vi.fn()`), TestBed + provideAnimationsAsync
- Tests frontend service : Vitest + TestBed (pas besoin de HttpTestingController pour ce service)
- `effect()` dans `LinksComponent` : premier usage du pattern dans le projet — bien documenté dans architecture.md

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (2026-05-20)

### Completion Notes List

- T1 : `LinksGridSettingsService` créé avec signal + effect() localStorage, 4 tests unitaires passent
- T2 : `LinksComponent` modifié — injection service/BreakpointObserver/ElementRef, effect() CSS custom properties, 4 méthodes update, 5 nouveaux tests passent
- T3 : Template modifié — bouton ⚙️ conditionnel + MatMenu avec stepper colonnes + 3 sliders (nouveau MatSlider API Angular Material 17+). Titre `<h1>` supprimé. Structure réorganisée avec wrapper `.links-inner` (voir correctif #2 ci-dessous).
- T4 : SCSS modifié — suppression `max-width: 800px`, grid paramétrable via CSS custom properties, breakpoint 600 px
- T5 : 4 tests E2E Playwright créés (visibilité, mode édition, mobile, persistence localStorage)
- Tous tests unitaires : 97 passent (0 échec), TypeScript compile sans erreur

**Correctifs post-implémentation :**

- **Correctif #1 — Largeur des cartes inefficace** : `minmax(var(--link-card-width), 1fr)` ne fonctionnait pas car `1fr` forçait les colonnes à remplir tout l'espace disponible, rendant `--link-card-width` sans effet. Corrigé en `minmax(0, var(--link-card-width, 280px))` : les colonnes ne dépassent plus la largeur configurée, l'espace restant reste vide.

- **Correctif #2 — Alignement boutons / suppression titre** : le titre `<h1>Liens</h1>` a été supprimé. Les boutons "Modifier" et ⚙️ devaient s'aligner avec le bord droit de la dernière colonne. Impossible avec `justify-content: center` sur la grid (le conteneur reste pleine largeur). Solution : wrapper `.links-inner` avec `width: fit-content; margin: 0 auto` sur desktop — le conteneur prend exactement la largeur de la grid (`N × cardWidth + gaps`), et `justify-content: flex-end` sur `.header-actions` colle les boutons au bord droit. Sur mobile, `.links-inner` reprend la pleine largeur (pas de `width: fit-content`).

### File List

- frontend/src/app/links/links-grid-settings.service.ts (créé)
- frontend/src/app/links/links-grid-settings.service.spec.ts (créé)
- frontend/src/app/links/links.component.ts (modifié)
- frontend/src/app/links/links.component.html (modifié)
- frontend/src/app/links/links.component.scss (modifié)
- frontend/src/app/links/links.component.spec.ts (modifié)
- e2e/tests/links-grid-settings.spec.ts (créé)

### Change Log

- 2026-05-20 : Création du fichier story — analyse exhaustive du code existant (LinksComponent, SCSS, patterns tests, architecture)
- 2026-05-20 : Implémentation complète — LinksGridSettingsService, widget ⚙️, MatMenu, CSS custom properties, tests unitaires (97/97), tests E2E
- 2026-05-20 : Correctif largeur cartes — `minmax(cardWidth, 1fr)` → `minmax(0, cardWidth)` : le `1fr` comme max annulait l'effet du paramètre de largeur
- 2026-05-20 : Correctif alignement + suppression titre — wrapper `.links-inner` avec `width: fit-content; margin: 0 auto` pour aligner les boutons sur le bord droit de la grid ; `<h1>` supprimé
