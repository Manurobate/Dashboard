# Sprint Change Proposal — Intégration Trilium Notes (Epic 7 pivot)

**Date :** 2026-06-18
**Auteur :** Manu
**Statut :** Approuvé
**Scope :** Modéré — restructuration planning + mise à jour artefacts (aucun code à rollback)

---

## Section 1 — Résumé du déclencheur

### Problème identifié

Avant le démarrage de l'Epic 7 (Module Notes), Manu a testé **Trilium Notes** auto-hébergé sur son serveur et constate que cette application couvre l'intégralité de ses besoins en gestion de notes (éditeur riche, arborescence, canvas, mindmaps, code, listes, relations, etc.), avec une qualité et une profondeur de fonctionnalités impossible à reproduire raisonnablement dans Dashboard.

**Catégorie :** Pivot stratégique — découverte d'une solution externe qui surpasse le plan initial.

### Contexte de découverte

Découvert en phase de préparation de l'Epic 7, avant toute implémentation. Aucune story de l'Epic 7 n'est commencée (`status: backlog` dans `sprint-status.yaml`). Le changement est donc purement documentaire — aucun rollback de code requis.

### Evidence

- Trilium Notes expose une **ETAPI REST** (token-based, JSON) permettant toutes opérations CRUD sur les notes.
- L'interface web de Trilium est complète et intègre tous les types de notes souhaités (texte WYSIWYG, canvas, code, listes, mindmaps...).
- Réimplémenter ces features via ETAPI dans Angular représenterait plusieurs mois de travail et deviendrait obsolète à chaque mise à jour de Trilium.
- L'approche iframe est validée : Trilium peut être configuré pour autoriser l'embedding (CSP `frame-ancestors` côté Trilium).

---

## Section 2 — Analyse d'impact

### 2.1 Impact sur les Epics

| Epic | Impact | Nature |
|------|--------|--------|
| Epic 1–5 | Aucun | — |
| Epic 6 | Mineur | Références "Épic 7 pour les notes" → "Épic 8 pour les notes" (2 occurrences) |
| Epic 7 | **Majeur** | Contenu intégralement remplacé — Trilium iframe au lieu de notes intégrées |
| Epic 8 (nouveau) | **Créé** | Reprend le contenu de l'Epic 7 original (TipTap, arborescence, auto-save, partage) |

### 2.2 Impact sur le PRD

**FRs déplacées de Epic 7 → Epic 8 (contenu inchangé) :**
FR29, FR30, FR31, FR32, FR33, FR34, FR35 (notes), FR38 (notes), FR41 (notes)

**Nouveaux FRs Epic 7 :**

| FR | Description |
|----|-------------|
| FR_S1 | Une page `/settings` accessible à tous les utilisateurs authentifiés est créée, accessible depuis le menu utilisateur de la top bar — elle contient initialement les paramètres du module Notes et est extensible à d'autres paramètres dans les épics futurs |
| FR_T1 | Un utilisateur peut saisir l'URL de son instance Trilium Notes dans sa page `/settings` |
| FR_T2 | Un utilisateur peut activer ou désactiver le module Notes depuis `/settings` — l'onglet Notes est masqué dans la navigation si désactivé |
| FR_T4 | L'onglet Notes affiche l'interface web de l'instance Trilium de l'utilisateur dans une iframe |
| FR_T5 | L'utilisateur peut tester la connectivité de son instance Trilium depuis `/settings` (le backend effectue un HEAD sur l'URL fournie, sans token) |
| FR_T6 | Si aucune instance Trilium n'est configurée ou si l'URL ne répond pas, un état d'erreur explicite s'affiche dans l'onglet Notes avec un lien vers `/settings` |

**Nouveau FR Epic 8 :**

| FR | Description |
|----|-------------|
| FR_N0 | En Epic 8, la section Notes de `/settings` évolue vers un sélecteur à trois états (Désactivé / Trilium / Notes intégrées Dashboard) — remplace le toggle binaire et le champ URL distincts introduits en Epic 7 |

**FR Coverage Map — mise à jour :**

| FR | Épic | Description courte |
|----|------|--------------------|
| FR_S1 | Épic 7 | Page `/settings` accessible à tous les utilisateurs |
| FR_T1 | Épic 7 | URL instance Trilium dans `/settings` |
| FR_T2 | Épic 7 | Activer/désactiver Notes depuis `/settings` |
| FR_T4 | Épic 7 | Onglet Notes = iframe Trilium |
| FR_T5 | Épic 7 | Test de connectivité Trilium (HEAD, sans token) |
| FR_T6 | Épic 7 | État d'erreur si Trilium non configuré ou inaccessible |
| FR29 | **Épic 8** | Créer une note WYSIWYG |
| FR30 | **Épic 8** | Modifier/supprimer une note |
| FR31 | **Épic 8** | Organiser notes en dossiers/sous-dossiers |
| FR32 | **Épic 8** | Créer/renommer/supprimer des dossiers |
| FR33 | **Épic 8** | Sauvegarde automatique (debounce 1s) |
| FR34 | **Épic 8** | Panneau latéral de navigation |
| FR35 | Épic 6 (recettes) + **Épic 8** (notes) | Générer un lien de partage public |
| FR38 | Épic 6 (recettes) + **Épic 8** (notes) | Accès visiteur au contenu partagé |
| FR41 | Épic 6 (recettes) + **Épic 8** (notes) | Aucune navigation vers l'app sur les vues publiques |
| FR_N0 | **Épic 8** | Sélecteur 3 états Notes dans `/settings` |

### 2.3 Impact Architecture

**Nouveau : champs User pour Notes**
- Ajout de `triliumUrl VARCHAR(500) NULL` et `notesEnabled BOOLEAN DEFAULT FALSE` sur l'entité `User`
- Migration TypeORM correspondante
- Endpoints `GET /api/users/me/notes-settings` et `PATCH /api/users/me/notes-settings`

**Nouveau : endpoint ping Trilium**
- `GET /api/trilium/ping?url=<encodedUrl>` — le backend effectue un `HEAD` HTTP sur l'URL fournie et retourne OK/KO
- Aucun token stocké, aucun proxy API — uniquement un check de connectivité
- Protection : l'endpoint est authentifié (JWT requis), l'URL est validée côté backend (format URL valide, pas d'SSRF trivial)

**Déféré en Epic 8 (pas de changement pour Epic 7) :**
- Entités `Note` et `NoteFolder` (restent en Epic 8)
- Dépendance TipTap/ProseMirror (Epic 8 seulement)
- `resourceType: 'note'` dans `PublicToken` (Epic 6 garde la colonne mais elle ne sera activement utilisée qu'en Epic 8)

### 2.4 Impact UX

**Nouveau composant : page `/settings`**
- Accessible depuis le menu utilisateur de la top bar (aux côtés de "Mon profil" et "Déconnexion")
- Layout : page dédiée avec sections extensibles (pattern card ou list de sections)
- Section Notes (Epic 7) :
  - Toggle "Activer les Notes" (`mat-slide-toggle`)
  - Champ URL instance Trilium (`mat-form-field`, visible uniquement si Notes activées)
  - Bouton "Tester la connexion" avec feedback inline (icône ✓ vert / ✗ rouge + message)
- Conçu pour recevoir d'autres sections dans les épics futurs sans refonte

**UX-DR3 mise à jour (top bar) :** ajout de "Paramètres" dans le `MatMenu` utilisateur

**UX-DRs déférées en Epic 8 (supprimées de Epic 7) :**
- UX-DR11 : `TipTapEditorComponent`
- UX-DR12 : `NoteTreePanel`
- UX-DR13 : `ShareLinkDialog` pour les notes
- UX-DR20 : Split-pane Notes desktop

**UX-DR20 remplacée pour Epic 7 :**
L'onglet Notes affiche un `<iframe>` full-height pointant vers `triliumUrl`. Sur mobile et desktop, l'iframe occupe tout l'espace disponible sous la top bar. État vide : card centrée "Notes non configurées → Aller dans Paramètres".

**Note technique pour l'utilisateur :** Trilium doit être configuré pour autoriser l'embedding en ajoutant dans sa configuration `Content-Security-Policy: frame-ancestors 'self' https://dashboard.monserveur.fr`. Cette étape est documentée dans les notes de déploiement.

---

## Section 3 — Approche recommandée

**Option retenue : Ajustement direct (Option 1)**

Epic 7 n'a aucune story commencée → aucun rollback, aucune perte de travail. Le changement est exclusivement documentaire. L'approche iframe est retenue car :

- Délivre **100% des fonctionnalités Trilium** immédiatement (canvas, mindmaps, code, tout)
- Effort Epic 7 réduit à **LOW/MEDIUM** (4 stories au lieu de 7)
- Pas de dépendance TipTap en Epic 7, pas de proxy API, pas de gestion de token
- Future-proof : chaque mise à jour de Trilium est disponible automatiquement
- Epic 8 reste intact dans son contenu pour les utilisateurs sans Trilium

**Risque principal :** configuration CSP côté Trilium requise par l'utilisateur. Mitigé par : documentation claire dans les notes de déploiement + message d'aide contextuel dans l'état d'erreur de l'iframe.

**Effort Epic 7 :** LOW/MEDIUM | **Risque :** LOW

---

## Section 4 — Changements détaillés par artefact

### 4.1 Épic 6 — Changements (références cross-epic)

**Epic 6 — Description (2 occurrences à modifier) :**

```
ANCIEN : réutilisée dans Épic 7 pour les notes
NOUVEAU : réutilisée dans Épic 8 pour les notes
```

**Story 6.2 — Note (1 occurrence à modifier) :**

```
ANCIEN : Le partage des notes sera ajouté en Story 7.7 (Épic 7)
NOUVEAU : Le partage des notes sera ajouté en Story 8.7 (Épic 8)
```

**Story 6.1 — Table PublicToken :**
La colonne `resourceType (enum : 'recipe' | 'note')` est **conservée** (la valeur `'note'` sera activement utilisée en Epic 8). Ajout d'une note :
```
Note : la valeur 'note' sera utilisée à partir de l'Épic 8 (notes intégrées Dashboard).
```

---

### 4.2 Épic 7 — Remplacement complet

**Titre :** Module Notes — Intégration Trilium

**Description :**
Manu peut accéder à son instance Trilium Notes depuis l'onglet Notes du Dashboard via une iframe. Chaque utilisateur configure l'URL de sa propre instance Trilium et active/désactive l'onglet Notes depuis la page Paramètres. Une page `/settings` extensible est créée pour centraliser les préférences utilisateur.

**FRs couverts :** FR_S1, FR_T1, FR_T2, FR_T4, FR_T5, FR_T6

---

#### Story 7.1 : Page Paramètres et configuration Notes

En tant qu'utilisateur authentifié,
Je veux accéder à une page Paramètres depuis le menu utilisateur et y configurer mon module Notes (URL Trilium + activation),
Afin de personaliser mon Dashboard sans intervention de l'administrateur.

**Critères d'acceptation :**

**Étant donné** que je clique "Paramètres" dans le menu utilisateur de la top bar,
**Quand** je navigue vers `/settings`,
**Alors** la page affiche une section "Notes" avec : un toggle "Activer les Notes" (`mat-slide-toggle`) et un champ URL instance Trilium (visible uniquement si Notes activées)

**Étant donné** que j'active le toggle Notes,
**Quand** le champ URL s'affiche,
**Alors** je peux saisir l'URL de mon instance Trilium (ex : `https://trilium.monserveur.fr`) et sauvegarder via `PATCH /api/users/me/notes-settings`

**Étant donné** que je sauvegarde mes paramètres,
**Quand** `PATCH /api/users/me/notes-settings` réussit,
**Alors** un snackbar "Paramètres sauvegardés" s'affiche et les changements sont persistés en base

**Étant donné** que le backend reçoit `PATCH /api/users/me/notes-settings`,
**Quand** la requête est traitée,
**Alors** les champs `triliumUrl` et `notesEnabled` de l'entité `User` sont mis à jour via migration TypeORM (champs ajoutés : `triliumUrl VARCHAR(500) NULL`, `notesEnabled BOOLEAN DEFAULT FALSE`)

**Étant donné** que je désactive le toggle Notes,
**Quand** je sauvegarde,
**Alors** l'onglet Notes disparaît de la navigation (top bar desktop + bottom nav mobile) immédiatement après rechargement

**Étant donné** que l'utilisateur n'est pas authentifié,
**Quand** il tente d'accéder à `/settings`,
**Alors** le guard `authGuard` le redirige vers `/login`

#### Scénarios E2E
- Naviguer vers `/settings` → vérifier présence de la section Notes
- Activer Notes + saisir URL + sauvegarder → vérifier snackbar + rechargement → vérifier onglet Notes visible
- Désactiver Notes → sauvegarder → vérifier onglet Notes masqué dans la navigation

---

#### Story 7.2 : Endpoint de vérification de connectivité Trilium

En tant qu'utilisateur authentifié,
Je veux pouvoir tester que l'URL de mon instance Trilium est accessible depuis le serveur Dashboard,
Afin de valider ma configuration avant d'utiliser le module Notes.

**Critères d'acceptation :**

**Étant donné** que j'ai saisi une URL dans `/settings` et que je clique "Tester la connexion",
**Quand** `GET /api/trilium/ping?url=<encodedUrl>` est appelé,
**Alors** le backend effectue une requête HEAD HTTP sur l'URL fournie avec un timeout de 5 secondes

**Étant donné** que l'instance Trilium répond (code HTTP quelconque reçu),
**Quand** le résultat revient,
**Alors** le frontend affiche une icône ✓ verte avec le message "Instance accessible"

**Étant donné** que l'URL ne répond pas (timeout, DNS invalide, connexion refusée),
**Quand** le résultat revient,
**Alors** le frontend affiche une icône ✗ rouge avec le message "Instance inaccessible — vérifiez l'URL"

**Étant donné** que l'URL fournie n'est pas une URL HTTP/HTTPS valide,
**Quand** le backend valide le paramètre,
**Alors** il retourne 400 Bad Request (validation anti-SSRF : schéma http/https obligatoire, pas d'IP privée)

**Étant donné** que l'endpoint est appelé sans JWT valide,
**Quand** la requête arrive,
**Alors** le backend retourne 401 Unauthorized

---

#### Story 7.3 : Onglet Notes avec iframe Trilium

En tant qu'utilisateur authentifié ayant configuré son instance Trilium,
Je veux accéder à Trilium directement depuis l'onglet Notes du Dashboard,
Afin de gérer mes notes sans quitter mon Dashboard.

**Critères d'acceptation :**

**Étant donné** que Notes est activé et qu'une URL valide est configurée,
**Quand** je clique sur l'onglet Notes,
**Alors** la page `/notes` affiche un `<iframe>` occupant tout l'espace disponible (hauteur = viewport - top bar) pointant vers `triliumUrl` de l'utilisateur

**Étant donné** que l'iframe charge,
**Quand** le chargement est en cours,
**Alors** un `MatProgressBar` est affiché en haut de page jusqu'à l'événement `load` de l'iframe

**Étant donné** que Notes est activé mais qu'aucune URL n'est configurée,
**Quand** j'accède à `/notes`,
**Alors** un état d'erreur s'affiche : icône + message "Aucune instance Trilium configurée" + bouton `mat-stroked-button` "Configurer dans Paramètres" (lien vers `/settings`)

**Étant donné** que Notes est désactivé (`notesEnabled = false`),
**Quand** j'inspecte la navigation,
**Alors** l'onglet "Notes" est absent de la top bar desktop et de la bottom nav mobile

**Étant donné** que l'utilisateur accède à `/notes` avec Notes désactivé (URL directe),
**Quand** le guard Angular s'exécute,
**Alors** il est redirigé vers `/dashboard`

**Étant donné** que la page est sur mobile (<768px),
**Quand** j'affiche l'onglet Notes,
**Alors** l'iframe est full-width full-height (aucune barre latérale)

#### Scénarios E2E
- Notes activé + URL configurée → naviguer vers `/notes` → vérifier présence de l'iframe avec `src` correct
- Notes non configuré → naviguer vers `/notes` → vérifier état d'erreur + bouton "Configurer dans Paramètres"
- Notes désactivé → vérifier absence de l'onglet Notes dans la navigation
- Notes désactivé → accéder à `/notes` en URL directe → vérifier redirection vers `/dashboard`

---

### 4.3 Épic 8 — Création (ex-Epic 7)

**Titre :** Module Notes intégré Dashboard

**Description :**
Manu peut rédiger et organiser ses notes directement dans Dashboard via un éditeur WYSIWYG riche (TipTap) avec une arborescence de dossiers/sous-dossiers, une sauvegarde automatique et un panneau latéral de navigation en split-pane. Cette épic étend également le partage public aux notes (Story 8.7). La page `/settings` évolue : le toggle binaire et le champ URL Trilium d'Epic 7 sont remplacés par un sélecteur à trois états (Désactivé / Trilium / Notes intégrées Dashboard).

**FRs couverts :** FR_N0, FR29, FR30, FR31, FR32, FR33, FR34, FR35 (notes), FR38 (notes), FR41 (notes)
**UX-DRs :** UX-DR11, UX-DR12, UX-DR13, UX-DR20

**Stories :**
- Story 8.0 : Migration paramètre Notes (`/settings` → sélecteur 3 états Désactivé / Trilium / Notes intégrées)
- Story 8.1 : Entités `Note` et `NoteFolder` + migrations (= ex-Story 7.1)
- Story 8.2 : Panneau latéral `NoteTreePanel` avec arborescence (= ex-Story 7.2)
- Story 8.3 : Création et gestion des dossiers (= ex-Story 7.3)
- Story 8.4 : Éditeur TipTap avec sauvegarde automatique (= ex-Story 7.4)
- Story 8.5 : Création et suppression d'une note (= ex-Story 7.5)
- Story 8.6 : Vue publique lecture seule — note (= ex-Story 7.6)
- Story 8.7 : Extension du partage aux notes — génération du lien de partage (= ex-Story 7.7)

> Le contenu détaillé des Stories 8.1–8.7 est identique aux Stories 7.1–7.7 originales (voir epics.md version antérieure), avec renommage des références 7.x → 8.x.

---

## Section 5 — Handoff d'implémentation

### Classification du scope

**Scope : Modéré** — restructuration planning pure (Epic 7 non commencé), mise à jour de 4 artefacts.

### Actions par artefact

| Artefact | Action | Priorité |
|----------|--------|----------|
| `epics.md` | Remplacer contenu Epic 7, ajouter Epic 8, corriger références Epic 6 | Critique |
| `prd.md` | Ajouter FR_S1, FR_T1, FR_T2, FR_T4, FR_T5, FR_T6, FR_N0 — mettre à jour FR Coverage Map | Critique |
| `architecture.md` | Ajouter section "Intégration Trilium" : champs User, migration, endpoint ping | Important |
| `ux-design-Dashboard.md` | Ajouter UX page `/settings`, UX onglet Notes iframe, mettre à jour UX-DR3 (menu utilisateur) | Important |
| `sprint-status.yaml` | Remplacer stories 7.x, ajouter Epic 8 en backlog | Critique |

### Destinataire du handoff

**→ Agent Dev / Product Owner** pour :
1. Mise à jour de `epics.md` (Epic 7 remplacé, Epic 8 ajouté, Epic 6 corrigé)
2. Mise à jour de `prd.md` (nouveaux FRs, Coverage Map)
3. Mise à jour de `sprint-status.yaml`
4. Mise à jour de `architecture.md` et `ux-design-Dashboard.md`

### Critères de succès

- [ ] `epics.md` contient le nouveau Epic 7 (3 stories Trilium) et le nouvel Epic 8 (8 stories ex-Epic 7)
- [ ] `prd.md` FR Coverage Map ne référence plus FR29–FR34 en Epic 7
- [ ] `sprint-status.yaml` reflète les nouvelles stories 7.x et la présence d'Epic 8 en backlog
- [ ] Aucune référence à "Épic 7 pour les notes" ne subsiste dans Epic 6
- [ ] Architecture et UX documentent la page `/settings` et l'iframe Trilium

---

*Sprint Change Proposal généré le 2026-06-18 — Correct Course workflow (bmad-correct-course)*
