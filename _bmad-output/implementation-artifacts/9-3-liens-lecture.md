---
title: 'Story 9.3 : Liens en lecture (cartes, cascade, survol, recherche inactive, widget grille, état vide)'
type: 'feature'
created: '2026-11-10'
status: 'done'
route: 'dispatch'
baseline_commit: '1a08d566659cb1dbe12d10f3efa7b0187197bc16'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La page Liens en mode lecture garde l'ancien style (cartes Material à ombre fixe, initiale 16px, titre de catégorie rouge, widget grille brut, squelettes et état vide génériques) alors que les fondations et la coque Ember (9.1, 9.2) sont en place.

**Approach:** Restyler la page Liens en lecture aux maquettes `01-main`, `02-alight`, `04-grid-settings`, `25-liens-vide` avec les tokens Ember et la spec Motion, ajouter la barre de recherche `⌘K` en affordance inactive (FR50), sans toucher au comportement ni au backend.

## Boundaries & Constraints

**Always:** Carte : fond `--color-surface`, bordure hairline `--color-divider`, rayon 16px. En-tête : tuile d'icône (~30px, rayon 9px, fond `--color-primary-soft`, icône `--color-primary`), nom 15px/600 `--color-text-primary`, compteur de liens en pastille bordée `ui-monospace` 11px `--color-text-secondary`. Lien : tuile 26×26 rayon 7px (fond `--color-surface-2`, bordure `--color-divider`) contenant le favicon réel, ou à défaut un monogramme de 2 caractères en majuscules (deux mots ou plus : initiales des deux premiers, séparateurs espace, `.`, `-`, `_` ; un seul mot : deux premiers caractères ; vide : `?`), titre 14px/400. Motion : apparition en cascade (fondu + `translateY(10px)`, ~60ms par carte, `cubic-bezier(.2,.7,.2,1)`, ~500ms, `animation-fill-mode: backwards` pour ne pas écraser le `transform` du CDK) ; survol de carte (`translateY(-3px)` + `--card-shadow` + anneau `--color-primary-soft`, 200ms) et survol de lien (fond `--color-surface-2` + tick d'accent `scaleY(0→1)`, 180ms) en mode lecture seulement ; tout neutralisé sous `prefers-reduced-motion: reduce` (l'interrupteur « Animations » viendra en 9.7). Barre de recherche : pleine largeur de la zone, icône `search`, placeholder « Rechercher un lien, une recette… », badge `⌘K`, `<input disabled>` sans aucun handler ni raccourci. Bouton ⚙️ carré bordé (bord `--color-primary` quand le menu est ouvert), « Modifier » en `mat-flat-button` pilule avec icône `edit`. Widget grille au style `04-grid-settings` (titre « AFFICHAGE DE LA GRILLE », stepper − valeur +, libellés « Nombre de colonnes », « Largeur des cards », « Espacement horizontal », « Espacement vertical » avec valeur en `--color-primary`, pied « Enregistré sur cet appareil »), mêmes bornes, pas, défauts (16px) et services. État vide conforme à `25-liens-vide` (icône `link_off` 48px, texte et CTA pilule bordée à texte `--color-primary`, mêmes libellés). Squelettes : structure inchangée, tokens Ember (A14). Grille : `repeat(var(--link-columns, 3), minmax(0, var(--link-card-width, 280px)))` et règle des 600px conservées. Les deux thèmes.

**Décisions de Manu (2026-11-10) :** pas de chevron de repli sur les cartes (aucune fonction de repli n'existe, on n'en crée pas) ; le titre « Dashboard de {nom} » (repli `username`) est retiré de la page Liens et devient le titre de la fenêtre (balise `<title>`) sur toute l'application dès qu'un utilisateur est connecté ; sans session (`/login`, vue publique) le titre reste « Dashboard » ; un `h1` masqué visuellement (classe utilitaire type `visually-hidden`) garde le même texte pour l'accessibilité.

**Never:** Pas de changement du mode édition (9.4 : poignées, boutons, dialogs, drag & drop), du backend, des services, des routes ni des réglages persistés. Pas de logique de recherche, d'écouteur `keydown` ni de faux résultat. Pas de restyle mobile (Epic 10). Pas de commit sans accord de Manu.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Favicon OK | `faviconUrl` chargé | Favicon dans la tuile, pas de monogramme | N/A |
| Favicon KO | `faviconUrl` en erreur ou absent | Monogramme 2 caractères | N/A |
| Titre multi-mots | « Conventional Commits », « WeProject.Synapture » | `CC`, `WS` | N/A |
| Titre mot unique | « GitHub », « O2switch » | `GI`, `O2` | N/A |
| Titre vide | `'  '` | `?` | N/A |
| Recherche | clic, frappe, `⌘K` / `Ctrl+K` | Rien ne se passe | N/A |
| Titre de fenêtre | connecté, n'importe quelle page | « Dashboard de Manu » | Repli `username` si `name` vide |
| Titre sans session | `/login`, vue publique, après déconnexion | « Dashboard » | N/A |
| Animations réduites | `prefers-reduced-motion: reduce` | Cartes affichées directement, sans survol animé | N/A |

</frozen-after-approval>

## Code Map

- `frontend/src/app/links/links.component.html` -- `h1.page-title`, squelettes (`.skeleton-*`, tests sur `.skeleton-card`), état vide (`.empty-state`, `.empty-message`, `.empty-cta` testés), `.header-actions` (ajouter la barre de recherche en tête, gauche ; garder le bouton `toggle-edit-btn`, texte « Modifier » utilisé par l'E2E `links-icon-picker`), `mat-menu #gridSettingsMenu` (restructurer le panneau, mêmes appels `adjustColumns`/`update*`). Passer l'index de `@for` aux cartes (`[style.--card-index]="$index"`).
- `frontend/src/app/links/links.component.scss` -- styles de page, grille (CSS de grille à garder tel quel), squelettes, widget. `.links-inner` en `fit-content` ≥600px : la barre de recherche prend la largeur de la grille, lui donner un `min-width` (~280px) pour une grille à une colonne.
- `frontend/src/app/app.ts` + `app.spec.ts` -- racine `App` (vide aujourd'hui). Titre de fenêtre global : `inject(Title)` + `inject(AuthService)`, `effect` sur `currentUser()` → `setTitle(user ? 'Dashboard de ' + (name.trim() || username) : 'Dashboard')`. Aucune route ne fixe de titre (`index.html` vaut « Dashboard »), pas de `TitleStrategy` à gérer.
- `frontend/src/app/links/links.component.ts` -- ne pas changer la logique métier. Aucun ajout pour le titre. Seul ajout éventuel : état « menu ouvert » via `#trigger="matMenuTrigger"` + `trigger.menuOpen` dans le template (pas de code TS nécessaire).
- `frontend/src/app/links/components/link-category-card/link-category-card.component.{html,scss}` -- tuile d'icône (`.category-icon` testé, garder la classe sur le `mat-icon`), compteur `links.length`, cascade et survol sur `.category-card` (pas sur l'hôte `cdkDrag`). Ne pas toucher aux branches `editMode`.
- `frontend/src/app/links/components/link-item/link-item.component.{html,scss,ts}` -- tuile 26px, `computed`/méthode `monogram` remplaçant `charAt(0)` (utiliser `Array.from` pour les emojis, cf. 9.2), survol + tick. Classes `.link-favicon`, `.link-initial`, `a.link-title` testées : les garder. Styles `.edit-mode` intacts (9.4).
- `frontend/src/app/links/components/link-item/link-item.component.spec.ts:45` -- attend `E` : à mettre à jour (2 caractères) + cas de la matrice.
- `frontend/src/styles.scss` -- tokens Ember (`--color-surface-2`, `--card-shadow`, `--color-primary-soft`, `--color-border-strong`) déjà posés ; styles d'overlay globaux du `mat-menu` (9.2) : le panneau grille s'y ajoute via une `panelClass` (`grid-settings-menu`), styles globaux car l'overlay sort du composant.
- Police d'icônes réduite (9.1) : `search`, `settings`, `edit`, `add`, `remove`, `link_off` présentes ; n'en ajouter aucune.

## Tasks & Acceptance

**Execution:**
- [x] `link-item.component.{ts,html,scss}` -- monogramme 2 caractères, tuile 26px, survol + tick, lecture seulement -- A10, Motion
- [x] `link-category-card.component.{html,scss}` -- carte Ember, tuile d'icône, compteur, cascade (`--card-index`) et survol -- maquettes `01`/`02`
- [x] `links.component.{html,scss}` -- barre de recherche inactive, ⚙️ et « Modifier » Ember, widget grille, état vide, squelettes, `h1` masqué visuellement -- maquettes `01`, `04`, `25`
- [x] `frontend/src/app/app.ts` -- titre de fenêtre global suivant l'utilisateur connecté -- décision de Manu
- [x] `frontend/src/styles.scss` -- panneau `grid-settings-menu` (rayon, surface, bordure, sliders en `--color-primary`) -- `04-grid-settings`
- [x] Specs `link-item`, `link-category-card`, `links` -- monogrammes de la matrice, compteur, titre de fenêtre (`app.spec.ts` : connecté, repli, déconnecté), input de recherche `disabled` sans handler, état vide inchangé -- non-régression

**Acceptance Criteria:**
- Given la page Liens qui charge en mode lecture, when les cartes apparaissent, then elles arrivent en cascade, et se soulèvent au survol avec ombre et anneau
- Given le widget ⚙️ ouvert, when je change un réglage, then la grille réagit comme avant (bornes, pas, défaut 16px, persistance locale) et le panneau ressemble à `04-grid-settings`
- Given aucun lien ou un chargement en cours, when la page s'affiche, then l'état vide suit `25-liens-vide` et les squelettes utilisent les tokens Ember
- Given le mode édition activé, when je le regarde, then rien n'a changé par rapport à avant la story (hors tokens hérités)

## Implementation Notes

- Implémenté directement dans la session (pas de sous-agent). Fichiers : `app.ts`/`app.spec.ts`, `links.component.{html,scss,spec.ts}`, `link-category-card.component.{html,scss,spec.ts}`, `link-item.component.{ts,html,scss,spec.ts}`, `styles.scss`.
- Monogramme : fonction exportée `linkMonogram()` (testée en `it.each`), getter `monogram` dans `LinkItemComponent`.
- Barre de recherche affichée en lecture seulement (la maquette `03-edit` n'en a pas). `<input type="search" disabled>`, aucun handler.
- Bouton ⚙️ actif stylé via `[aria-expanded='true']` posé par `MatMenuTrigger` : aucun code TS.
- `discrete` retiré des `mat-slider` (la valeur s'affiche dans l'en-tête de la ligne, comme la maquette) ; `aria-label` ajoutés aux curseurs.
- Budget de style par composant (4 kB) dépassé par `links.component.scss` : styles du contenu du panneau grille déplacés dans `styles.scss` sous `.grid-settings-menu` (le panneau est rendu dans l'overlay). L'avertissement de budget du bundle initial (≈ 564 kB) existait avant la story.
- Cascade désactivée sur l'aperçu de drag (`:host(.cdk-drag-preview)`), sinon le clone CDK rejouerait le délai.
- Effets visibles en mode édition (hérités, restyle complet en 9.4) : tuile 26px, compteur, carte Ember, bouton « Terminer » plein en pilule.
- Pendant le chargement, la barre d'actions s'affiche sous les squelettes : comportement antérieur conservé (structure inchangée, A14).
- Vérifications : 219 tests verts, `ng build` OK, Prettier OK. Captures Chromium avec API simulée (sombre, clair + survol, widget, vide, chargement, édition, 390px) conformes aux maquettes ; titre de fenêtre « Dashboard de Manu ». `prefers-reduced-motion: reduce` émulé : `animation-name: none`, transitions `0s` (non testable sous jsdom).

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Preuve |
|---|---|---|---|
| `h1` sans `trim()` alors que le titre de fenêtre l'applique (VG, ECH, BH) | low | patch | Réel : nom en espaces → « Dashboard de ␣␣ ». `name?.trim()` ajouté ; test du repli `username` sur le `h1`. |
| Test du `h1` trop faible (BH) | low | patch | Réel. Teste désormais le texte exact et le repli. |
| `ß` → `SS` : monogramme de 3 caractères (ECH, BH) | low | patch | Réel (`'ßtudio'` → `SST`). Découpe après la mise en majuscules ; cas ajouté. |
| Découpe par point de code : drapeau, emoji ZWJ, accent combiné cassés (ECH, BH) | low | patch | Réel. `Intl.Segmenter` (graphèmes), repli `Array.from` ; 3 cas ajoutés. |
| Délai de cascade non plafonné (`index × 60ms`), carte ajoutée tardive (ECH ×2) | low | patch | Réel : 20 catégories → 1,2 s d'invisibilité pour une nouvelle carte. `min(index, 10)`. |
| Survol collant sur écran tactile (BH) | low | patch | Réel : `:hover` persiste après un tap. Survols sous `@media (hover: hover)` (le focus clavier garde le surlignage). |
| Compteur sans sens pour les lecteurs d'écran (BH) | low | patch | Réel (« Dev 2 »). Texte masqué « lien(s) » + test. |
| Test ⌘K infalsifiable, clic/frappe non couverts (BH) | low | patch | Réel. Remplacé par `DebugElement.listeners.length === 0` sur la barre et l'input. |
| Classe `edit-mode` de la carte non testée (BH) | low | patch | Réel. Test ajouté. |
| `min-width` de la recherche 240px au lieu de ~280px du Code Map (BH) | low | patch | Réel. Passé à 280px. |
| Pile monospace dupliquée (BH) | low | patch | Réel, deux fichiers. Token `--font-mono` dans `styles.scss`. |
| `monogram` en getter recalculé à chaque détection (BH) | low | patch | Réel, coût négligeable ; calculé dans `ngOnChanges` (test de recalcul ajouté). |
| Valeurs `.setting-value` du widget non testées (VG) | low | defer | Liaisons de template déjà non testées avant, E2E couvre le chemin principal. Voir `deferred-work.md`. |
| Mode édition modifié malgré l'AC « rien n'a changé » (ECH, claim) | low | rejeté | Réel mais conforme à `03-edit` (tuile, compteur, bouton plein) et noté dans Implementation Notes ; le corriger reviendrait à éditer l'AC ou à ajouter des branches que 9.4 retirera. Signalé à Manu. |
| Titre « Dashboard de {nom} » sur la vue publique si connecté (ECH, claim) | false | rejeté | La ligne de matrice vise « sans session » ; un visiteur sans session voit « Dashboard ». |
| `username` vide → « Dashboard de  » (ECH) | false | rejeté | `username` = email obligatoire (backend), jamais vide pour un utilisateur connecté. |
| Badge `⌘K` sur Linux (BH) | false | rejeté | Imposé par la maquette et la spec gelée (badge `⌘K`). |
| Champ désactivé sans indication « bientôt » (BH) | false | rejeté | Affordance seule voulue par FR50 et la passation §1.3 (champ inactif, sans handler). |
| Pied « Enregistré sur cet appareil » même si `localStorage` échoue (BH) | low | rejeté | Navigation privée bloquante rare ; corriger ajoute un état. Libellé de la maquette. |
| Conflit futur avec des titres de route (BH) | false | rejeté | Aucune route ne fixe de titre aujourd'hui ; pas de défaut présent. |

## Design Notes

Cascade sans conflit avec le CDK : l'animation porte sur `.category-card` (enfant), l'hôte `cdkDrag` garde son `transform` inline ; `fill-mode: backwards` n'applique l'état initial que pendant le délai.

```scss
.category-card {
  animation: card-in 500ms cubic-bezier(.2,.7,.2,1) backwards;
  animation-delay: calc(var(--card-index, 0) * 60ms);
  @media (prefers-reduced-motion: reduce) { animation: none; transition: none; }
}
```

## Verification

**Commands:**
- `cd frontend && npx ng build` -- expected: succès
- `cd frontend && npx ng test --no-watch` -- expected: tests verts
- `cd frontend && npm run prettier:write && npm run prettier:check` -- expected: OK

**Manual checks (if no CLI):**
- Comparer à `01-main` (sombre), `02-alight` (clair), `04-grid-settings`, `25-liens-vide` ; vérifier un lien avec favicon et un sans, le mode édition inchangé, et la page sous 600px (une colonne, pas de casse).
