# Sprint Change Proposal — Page Profil Utilisateur

**Date :** 2026-05-12
**Auteur :** Manu
**Statut :** Approuvé
**Scope :** Mineur — implémentable directement par l'agent Dev

---

## Section 1 : Résumé du changement

Après la livraison de la Story 3-2 (création d'un compte utilisateur), un besoin a été identifié : les utilisateurs n'ont pas de page dédiée pour gérer leur profil. Actuellement, le changement de mot de passe est accessible directement depuis le menu top-bar, sans point d'entrée unifié pour les actions liées au compte personnel.

**Changement demandé :** Ajouter une page `/profile` permettant à l'utilisateur de modifier son nom d'affichage et d'accéder au changement de mot de passe. Le menu utilisateur de la top-bar est mis à jour en conséquence (remplacement de "Changer le mot de passe" par "Mon profil").

**Découverte :** Besoin fonctionnel identifié en cours de sprint par Manu lors de la planification de la suite de l'Épic 3.

---

## Section 2 : Analyse d'impact

### Impact épics
- **Épic 3 (in-progress) :** Ajout d'une Story 3-5 à la fin. L'épic reste cohérente — la gestion du profil utilisateur s'inscrit naturellement dans le périmètre "administration de l'instance / gestion des comptes".
- **Épic 2 (done) :** Story 2.6 (changement de mot de passe) n'est pas modifiée fonctionnellement. Seul le point d'entrée change : le menu top-bar pointe vers `/profile` au lieu de `/change-password`. La route `/change-password` reste accessible depuis la page profil.
- **Épics 4-7 :** Aucun impact.

### Impact stories
- **Nouvelle story :** 3-5-page-profil-utilisateur (backlog)
- **Story modifiée :** Composant top-bar (menu utilisateur) — intégré dans la Story 3-5 pour éviter une story trop petite

### Conflits artefacts
- **PRD :** Ajout de FR6b et FR6c (modification nom d'affichage + nouveau point d'entrée changement mdp)
- **epics.md :** Description Épic 3 étendue + Story 3-5 ajoutée + FR Coverage Map mis à jour
- **sprint-status.yaml :** Story 3-5 ajoutée en backlog
- **Architecture :** Aucun changement — le champ `name` existe déjà sur l'entité `User` (Story 3.2). Nouvel endpoint `PATCH /api/users/me` à ajouter dans `UsersController`.
- **UX :** Menu top-bar mis à jour, nouvelle route `/profile`

### Impact technique
- Pas de migration TypeORM nécessaire (`name` existe déjà)
- Nouvel endpoint : `PATCH /api/users/me` (mise à jour du `name`)
- Endpoint existant potentiellement à exposer : `GET /api/users/me` (chargement profil)
- Nouvelle route Angular : `/profile` (lazy-loaded)
- Modification du composant top-bar : item menu "Changer le mot de passe" → "Mon profil"

---

## Section 3 : Approche recommandée

**Option retenue : Ajustement direct (Option 1)**

Rationale :
- Champ `name` déjà en base → zéro migration
- Story 2.6 livrée → on réutilise `/change-password` existant sans le modifier
- Impact isolé et sans risque
- Extensible : la page `/profile` est conçue pour accueillir de futures fonctionnalités (photo de profil, etc.) sans breaking change

**Effort :** Faible | **Risque :** Faible | **Impact timeline :** Nul (story ajoutée à la fin de l'Épic 3 déjà en cours)

---

## Section 4 : Propositions de changement détaillées

### 4.1 — Nouvelle Story 3-5 (epics.md)

**Story:** 3-5-page-profil-utilisateur

```
En tant qu'utilisateur authentifié,
Je veux accéder à une page de profil depuis le menu utilisateur,
pouvoir modifier mon nom d'affichage et accéder au changement de
mot de passe depuis cette page,
Afin de gérer mes informations personnelles en un seul endroit.

Critères d'acceptation :

Étant donné que je clique "Mon profil" dans le menu utilisateur de la top bar,
Quand je navigue vers /profile,
Alors la page affiche : mon adresse email (lecture seule),
mon nom d'affichage (champ éditable pré-rempli) et un bouton
"Changer le mot de passe"

Étant donné que je modifie mon nom d'affichage et clique "Sauvegarder",
Quand PATCH /api/users/me est appelé avec le nouveau nom,
Alors le backend met à jour le champ name, retourne 200,
et un snackbar "Profil mis à jour" s'affiche

Étant donné que je soumets le formulaire avec un nom vide,
Quand la validation s'exécute,
Alors une erreur inline "Le nom d'affichage est obligatoire"
s'affiche — le formulaire n'est pas soumis

Étant donné que je clique "Changer le mot de passe",
Quand je navigue,
Alors je suis redirigé vers /change-password (route existante, Story 2.6)

Étant donné que je suis connecté en tant qu'utilisateur standard,
Quand j'accède à /profile,
Alors la page est accessible — pas de restriction de rôle

Scénarios E2E :
- Modifier le nom d'affichage → vérifier snackbar + persistance après rechargement
- Cliquer "Changer le mot de passe" → vérifier redirection vers /change-password
- Soumettre avec nom vide → vérifier erreur inline
```

### 4.2 — PRD (prd.md)

**Section Exigences Fonctionnelles — Gestion des comptes :**

AVANT :
- FR6 : Un utilisateur peut modifier son propre mot de passe

APRÈS :
- FR6 : Un utilisateur peut modifier son propre mot de passe
- FR6b : Un utilisateur peut modifier son nom d'affichage depuis sa page profil (`/profile`)
- FR6c : L'accès au changement de mot de passe se fait depuis la page profil — le menu utilisateur expose "Mon profil" et non plus "Changer le mot de passe"

**Synthèse des capacités (tableau parcours utilisateurs) :**

AJOUT :
| Page profil — modification du nom d'affichage | J5 (étendu) |

### 4.3 — epics.md (Epic List + FR Coverage Map)

**Description Épic 3 :**

AVANT :
> L'administrateur peut créer, gérer et réinitialiser les mots de passe des comptes utilisateurs via un panneau dédié, sans dépendance à un serveur mail.
> FRs couverts : FR8, FR9, FR10, FR11, FR12

APRÈS :
> L'administrateur peut créer, gérer et réinitialiser les mots de passe des comptes utilisateurs via un panneau dédié, sans dépendance à un serveur mail. Les utilisateurs peuvent gérer leur propre profil (nom d'affichage) depuis une page dédiée.
> FRs couverts : FR8, FR9, FR10, FR11, FR12, FR6b, FR6c

**FR Coverage Map — ajout :**
| FR6b | Épic 3 | Modifier le nom d'affichage (page profil) |
| FR6c | Épic 3 | Accès au changement de mot de passe via /profile |

### 4.4 — sprint-status.yaml

AJOUT sous 3-4 :
```
3-5-page-profil-utilisateur: backlog
```

---

## Section 5 : Handoff

**Scope : Mineur** → Agent Dev pour implémentation directe

**Responsabilités :**
- Implémenter Story 3-5 (page `/profile`, endpoint `PATCH /api/users/me`, mise à jour top-bar)
- Lancer avec `/bmad-create-story` pour créer le fichier story détaillé
- Puis `/bmad-dev-story` pour l'implémentation

**Critères de succès :**
- L'utilisateur peut modifier son nom d'affichage depuis `/profile`
- Le menu top-bar affiche "Mon profil" et non plus "Changer le mot de passe"
- La route `/change-password` reste fonctionnelle, accessible depuis `/profile`
- Tests E2E passent (3 scénarios définis)
