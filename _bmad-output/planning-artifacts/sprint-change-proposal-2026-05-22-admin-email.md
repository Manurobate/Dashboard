# Sprint Change Proposal — 2026-05-22 — Admin Email

**Projet :** Dashboard  
**Date :** 2026-05-22  
**Auteur :** Manu (via Correct Course workflow)  
**Statut :** Approuvé  
**Scope :** Minor — correction ciblée variable d'env + validation + renommage cohérent

---

## Section 1 — Résumé du problème

### Problème identifié

La variable d'environnement `ADMIN_USERNAME` utilisée pour créer le compte administrateur
initial (FR0 / `AdminSeedService`) n'est pas validée comme email et son exemple montre
`admin` — une valeur non-email. Or l'ensemble de l'application (formulaire de connexion,
panneau admin, UsersService) traite le champ `username` comme une adresse email obligatoire.

### Contexte de découverte

Constaté après le premier déploiement en production (fin Épic 4). Si l'opérateur suit
l'exemple `.env.example` et saisit `ADMIN_USERNAME=admin`, le compte est créé en base
avec `username=admin`, mais le formulaire de connexion Angular applique `Validators.email`
sur ce champ — l'administrateur ne peut donc **pas se connecter**.

### Evidence

| Élément | État actuel | État attendu |
|---------|-------------|--------------|
| `app.config.ts` validation | `Joi.string().trim().min(1)` | `Joi.string().email()` |
| `.env.example` exemple | `ADMIN_USERNAME=admin` | `ADMIN_EMAIL=admin@example.com` |
| Frontend login | `Validators.email` ✅ | — |
| UsersService message erreur | *"adresse email déjà utilisée"* ✅ | — |
| E2E tests | `input[autocomplete="email"]` ✅ | — |

---

## Section 2 — Analyse d'impact

### Impact sur les épics

| Épic | Statut | Impact |
|------|--------|--------|
| Épic 2 — Authentification | done | ⚠️ Story 2-1 (AdminSeed) nécessite correction rétroactive |
| Épics 3–4 | done | ✅ Aucun impact |
| Épics 5–7 | backlog | ✅ Aucun impact — profiteront du fix dès leur démarrage |

Pas de nouvel épic, pas de suppression, pas de réordonnancement. Correction de
l'implémentation existante de FR0 avant le lancement de l'Épic 5.

### Impact sur les artefacts

| Artefact | Type de changement |
|----------|-------------------|
| `backend/src/config/app.config.ts` | 🟡 Renommage clé + validation email |
| `backend/src/auth/admin-seed.service.ts` | 🟡 Lecture `ADMIN_EMAIL`, calcul nom initial |
| `.env.example` (racine) | 🟡 Renommage + exemple email |
| `backend/.env.example` | 🟡 Renommage + exemple email |
| `backend/.env` *(non versionné)* | 🔴 Mise à jour manuelle requise |
| `.github/workflows/ci.yml` | 🟡 4 occurrences renommées |
| `e2e/tests/*.spec.ts` (×7 fichiers) | 🟡 `E2E_ADMIN_USERNAME` → `E2E_ADMIN_EMAIL` |
| `_bmad-output/planning-artifacts/prd.md` | 🟢 FR0 libellé mis à jour |
| `_bmad-output/planning-artifacts/epics.md` | 🟢 Additional Requirements mis à jour |
| `_bmad-output/planning-artifacts/architecture.md` | 🟢 Table décisions + template docker-compose |
| `deferred-work.md` | 🟢 Ajout item rename colonne DB username → email |

### Impact technique

- **Aucun impact sur le schéma de base de données** — la colonne reste nommée `username`
  (renommage en `email` différé, cf. deferred-work.md)
- **Aucune migration TypeORM** requise
- **1 action manuelle GitHub** : renommer le Secret `E2E_ADMIN_USERNAME` → `E2E_ADMIN_EMAIL`
- **1 action manuelle locale** : mettre à jour `backend/.env`

---

## Section 3 — Approche recommandée

### Option retenue : Ajustement direct (Option 1)

**Rationale :**
- Changement purement correctif, périmètre très limité (~10 fichiers)
- Zéro rollback nécessaire — Epic 2 reste done
- Aucune migration de base de données
- Risque **Low** — la correction renforce la robustesse du démarrage (Joi rejette
  explicitement une valeur non-email au lieu de créer silencieusement un compte inutilisable)
- Timing idéal : entre la correction CD (ce matin) et le début de l'Épic 5

**Timeline :** < 1 heure de travail développeur

---

## Section 4 — Propositions de changements détaillées

### 4.1 `backend/src/config/app.config.ts`

**Section :** Schéma de validation Joi

```
ANCIEN :
  ADMIN_USERNAME: Joi.string().trim().min(1).required(),

NOUVEAU :
  ADMIN_EMAIL: Joi.string().email().trim().lowercase().required(),
```

**Rationale :** Renommage de la clé + validation email stricte + normalisation lowercase
cohérente avec `username.toLowerCase()` dans `UsersService`.

---

### 4.2 `backend/src/auth/admin-seed.service.ts`

**Section :** `onApplicationBootstrap`

```typescript
// ANCIEN
const username = this.configService.get<string>('ADMIN_USERNAME')!;
const rawPassword = this.configService.get<string>('ADMIN_INITIAL_PASSWORD')!;
const passwordHash = await bcrypt.hash(rawPassword, 12);

await this.usersService.createUser({
  username,
  name: username,
  passwordHash,
  role: 'admin',
  mustChangePassword: true,
});
this.logger.log(`Admin account "${username}" created (mustChangePassword=true)`);

// NOUVEAU
const email = this.configService.get<string>('ADMIN_EMAIL')!;
const name = email.split('@')[0];
const rawPassword = this.configService.get<string>('ADMIN_INITIAL_PASSWORD')!;
const passwordHash = await bcrypt.hash(rawPassword, 12);

await this.usersService.createUser({
  username: email,
  name,
  passwordHash,
  role: 'admin',
  mustChangePassword: true,
});
this.logger.log(`Admin account "${email}" created (mustChangePassword=true)`);
```

**Rationale :** Lecture de `ADMIN_EMAIL`, nom d'affichage initial = partie locale de l'email
(ex. `admin@mondomaine.fr` → `admin`), modifiable ensuite dans le profil utilisateur.

---

### 4.3 `.env.example` (racine) et `backend/.env.example`

```bash
# ANCIEN
# Compte administrateur
# Créé automatiquement au 1er démarrage sur une base vide — ignoré ensuite
# Mot de passe : minimum 8 caractères
ADMIN_USERNAME=admin
ADMIN_INITIAL_PASSWORD=change_me_min_8_chars

# NOUVEAU
# Compte administrateur
# Créé automatiquement au 1er démarrage sur une base vide — ignoré ensuite
# Email : adresse email valide utilisée comme identifiant de connexion
# Mot de passe : minimum 8 caractères
ADMIN_EMAIL=admin@example.com
ADMIN_INITIAL_PASSWORD=change_me_min_8_chars
```

---

### 4.4 `.github/workflows/ci.yml`

**4 remplacements dans le fichier :**

```yaml
# ANCIEN
ADMIN_USERNAME: ${{ secrets.E2E_ADMIN_USERNAME }}
ADMIN_INITIAL_PASSWORD: ${{ secrets.E2E_ADMIN_PASSWORD }}
...
printf 'ADMIN_USERNAME=%s\n' "$ADMIN_USERNAME" >> .env
...
E2E_ADMIN_USERNAME: ${{ secrets.E2E_ADMIN_USERNAME }}

# NOUVEAU
ADMIN_EMAIL: ${{ secrets.E2E_ADMIN_EMAIL }}
ADMIN_INITIAL_PASSWORD: ${{ secrets.E2E_ADMIN_PASSWORD }}
...
printf 'ADMIN_EMAIL=%s\n' "$ADMIN_EMAIL" >> .env
...
E2E_ADMIN_EMAIL: ${{ secrets.E2E_ADMIN_EMAIL }}
```

---

### 4.5 `e2e/tests/*.spec.ts` (×7 fichiers)

**Fichiers :** `auth.spec.ts`, `admin.spec.ts`, `admin-responsive.spec.ts`, `profile.spec.ts`,
`links-drag-drop.spec.ts`, `links-grid-settings.spec.ts`, `links-icon-picker.spec.ts`

```typescript
// ANCIEN
if (!process.env['E2E_ADMIN_USERNAME'] || !process.env['E2E_ADMIN_PASSWORD'])
  throw new Error('E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD must be set');
const adminUsername = process.env['E2E_ADMIN_USERNAME'];

// NOUVEAU
if (!process.env['E2E_ADMIN_EMAIL'] || !process.env['E2E_ADMIN_PASSWORD'])
  throw new Error('E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set');
const adminEmail = process.env['E2E_ADMIN_EMAIL'];
```

*(Les usages ultérieurs de `adminUsername` → `adminEmail` dans chaque fichier sont
mis à jour de façon cohérente.)*

---

### 4.6 Artefacts de planification

**`epics.md` — Additional Requirements :**
```
ANCIEN :
  Admin seed : variables d'environnement `ADMIN_USERNAME` et `ADMIN_INITIAL_PASSWORD`
  requises au démarrage...

NOUVEAU :
  Admin seed : variables d'environnement `ADMIN_EMAIL` (adresse email valide, identifiant
  de connexion) et `ADMIN_INITIAL_PASSWORD` requises au démarrage — `AdminSeedService`
  (`OnApplicationBootstrap`) crée le compte admin initial si aucun admin n'existe en base,
  avec `mustChangePassword = true` ; le nom d'affichage initial est la partie locale de
  l'email (modifiable dans le profil)
```

**`architecture.md` — Table décisions + template docker-compose (×2) :**
```
ANCIEN : ADMIN_USERNAME: ${ADMIN_USERNAME}
NOUVEAU : ADMIN_EMAIL: ${ADMIN_EMAIL}
```

**`prd.md` — FR0 :**
```
ANCIEN : ... depuis les variables d'environnement ADMIN_USERNAME et ADMIN_INITIAL_PASSWORD
NOUVEAU : ... depuis les variables d'environnement ADMIN_EMAIL (adresse email valide
          utilisée comme identifiant de connexion) et ADMIN_INITIAL_PASSWORD
```

**`deferred-work.md` — ajout :**
```markdown
### À faire plus tard — rename colonne DB `username` → `email`

La colonne `username` de la table `User` stocke des adresses email depuis le début.
Un renommage améliorerait la lisibilité du schéma mais nécessite une migration TypeORM.
Différé post-MVP pour éviter une migration sur une instance déjà en production.
Référence : Correct Course 2026-05-22 (admin seed ADMIN_EMAIL).
```

---

## Section 5 — Plan de handoff

### Classification du scope

**Scope : Minor** — correction ciblée, directement implémentable par l'agent Developer
sans coordination PO ou Architecte.

### Handoff : Agent Developer

**Ordre d'implémentation recommandé :**

1. `backend/src/config/app.config.ts` — renommage Joi
2. `backend/src/auth/admin-seed.service.ts` — lecture `ADMIN_EMAIL` + calcul nom
3. `.env.example` (racine) + `backend/.env.example` — renommage exemples
4. `.github/workflows/ci.yml` — 4 remplacements
5. `e2e/tests/*.spec.ts` — 7 fichiers (renommage variable)
6. `prd.md`, `epics.md`, `architecture.md` — mises à jour libellés
7. `deferred-work.md` — ajout item rename colonne

**Actions manuelles requises (hors code) :**

| Action | Où | Quand |
|--------|-----|-------|
| Renommer Secret `E2E_ADMIN_USERNAME` → `E2E_ADMIN_EMAIL` | GitHub Settings → Secrets → Actions | Avant le prochain run CI |
| Mettre à jour `backend/.env` local | Terminal / éditeur | Immédiatement |

### Critères de succès

- [ ] Le backend refuse de démarrer si `ADMIN_EMAIL` est absent ou non-email (Joi)
- [ ] Un `.env.example` suivi à la lettre produit un compte admin fonctionnel (connexion possible)
- [ ] Le CI E2E passe avec le Secret renommé `E2E_ADMIN_EMAIL`
- [ ] Aucune référence à `ADMIN_USERNAME` ne subsiste dans le code versionné

---

## Résumé exécutif

| | |
|---|---|
| **Problème adressé** | `ADMIN_USERNAME` sans validation email → compte admin non-connectable |
| **Scope** | Minor |
| **Artefacts modifiés** | app.config.ts, admin-seed.service.ts, .env.example (×2), ci.yml, e2e (×7), prd.md, epics.md, architecture.md, deferred-work.md |
| **Actions manuelles** | Rename Secret GitHub, màj backend/.env local |
| **Handoff** | Developer agent |
| **Risque** | Low — correction renforçant la robustesse au démarrage |
| **Colonne DB** | `username` → `email` différé dans deferred-work.md |
