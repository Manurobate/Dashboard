# Sprint Change Proposal — Seed de l'administrateur initial

**Date :** 2026-05-02
**Auteur :** Manu
**Statut :** Approuvé

---

## Section 1 — Résumé du problème

**Déclencheur :** Lors de la préparation de Story 2.2 (connexion sécurisée), il est apparu qu'aucun mécanisme de création du compte administrateur initial n'est spécifié dans les artefacts du projet. Les stories 3.x supposent qu'un admin existe déjà en base, mais son origine n'est nulle part définie.

**Contexte :** Story 2.1 (entités User & RefreshToken + migration) est terminée. L'entité `User` existe en base avec le flag `mustChangePassword`. Aucun compte n'a été créé.

**Problème :** Gap dans les exigences originales — le bootstrap du compte admin initial n'a jamais été spécifié. Sans admin en base, impossible de tester la connexion (Story 2.2) ni d'accéder au panneau d'administration (Épic 3).

---

## Section 2 — Analyse d'impact

- **Épic 2 :** Story 2.2 impactée — 2 ACs supplémentaires + tâches d'implémentation du `AdminSeedService`
- **Épics 3–7 :** Aucun impact — ils supposent déjà qu'un admin existe
- **PRD :** Non modifié (niveau trop haut — détail opérationnel)
- **Architecture :** Ajout de 2 env vars (`ADMIN_USERNAME`, `ADMIN_INITIAL_PASSWORD`) + description du pattern `AdminSeedService`
- **UX :** Aucun impact — le flow `mustChangePassword` (Story 2.5) couvre le premier login admin sans nouvelle UI

---

## Section 3 — Approche retenue

**Option 1 — Direct Adjustment**

Variables d'environnement `ADMIN_USERNAME` et `ADMIN_INITIAL_PASSWORD` dans `.env`. Au démarrage, `AdminSeedService` (implémentant `OnApplicationBootstrap`) crée le compte admin si aucun n'existe en base — idempotent, no-op silencieux si déjà présent.

| Critère | Valeur |
|---------|--------|
| Effort | Faible |
| Risque | Faible |
| Impact timeline | Aucun |
| Impact MVP | Aucun |

**Rationale :** Standard pour les applications self-hosted sans serveur mail. Pas besoin de re-migrer si les credentials changent. Compatible avec le flow `mustChangePassword` déjà planifié en Story 2.5.

---

## Section 4 — Propositions de changement détaillées

### `epics.md`

**FR0 ajouté dans Functional Requirements (avant FR1) :**

```
FR0: Au premier démarrage, si aucun compte admin n'existe en base, le système crée
     automatiquement un compte admin depuis les variables d'environnement
     ADMIN_USERNAME et ADMIN_INITIAL_PASSWORD, avec mustChangePassword = true
```

**FR Coverage Map — FR0 → Épic 2 ajouté**

**Épic 2 — FRs couverts mis à jour :** FR0 ajouté

**Story 2.2 — 2 nouveaux critères d'acceptation :**

```
Étant donné que ADMIN_USERNAME et ADMIN_INITIAL_PASSWORD sont renseignés dans .env,
Quand le backend démarre et qu'aucun utilisateur avec role = 'admin' n'existe en base,
Alors un compte admin est créé automatiquement avec mustChangePassword = true
     et le mot de passe hashé en bcrypt ≥ cost 12

Étant donné qu'un compte admin existe déjà en base,
Quand le backend redémarre,
Alors le seed est ignoré silencieusement — aucun doublon, aucune erreur
```

**Additional Requirements — ligne ajoutée :**

```
- Admin seed : variables d'environnement ADMIN_USERNAME et ADMIN_INITIAL_PASSWORD
  requises au démarrage — AdminSeedService (OnApplicationBootstrap) crée le compte
  admin initial si aucun admin n'existe en base, avec mustChangePassword = true
```

### `architecture.md`

**Section "Authentification & Sécurité" — ligne ajoutée dans la table :**

```
| Admin seed | AdminSeedService (OnApplicationBootstrap) — crée le compte admin depuis
  ADMIN_USERNAME + ADMIN_INITIAL_PASSWORD si aucun admin en base ; no-op sinon |
  Bootstrap déterministe, idempotent, sans endpoint dédié |
```

**Section "Infrastructure & Déploiement" — env vars ajoutées dans le bloc Docker Compose :**

```
ADMIN_USERNAME: ${ADMIN_USERNAME}
ADMIN_INITIAL_PASSWORD: ${ADMIN_INITIAL_PASSWORD}
```

---

## Section 5 — Classification et handoff

**Scope : Minor** — implémenté directement dans Story 2.2 par l'agent dev.

**Responsabilités :**
- Agent dev : implémenter `AdminSeedService` dans Story 2.2, mettre à jour la validation Joi pour inclure les 2 nouvelles vars, mettre à jour `.env.example`

**Critère de succès :** Au premier `docker-compose up` avec `ADMIN_USERNAME` et `ADMIN_INITIAL_PASSWORD` renseignés, un compte admin existe en base avec `mustChangePassword = true`. Au redémarrage suivant, aucun doublon créé.
