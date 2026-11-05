---
title: 'ADMIN_USERNAME → ADMIN_EMAIL — validation email + renommage cohérent'
type: 'bugfix'
created: '2026-05-22'
status: 'done'
route: 'one-shot'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La variable `ADMIN_USERNAME=admin` dans `.env.example` ne subissait aucune validation email, alors que toute l'application (formulaire de login Angular `Validators.email`, messages d'erreur UsersService, E2E `autocomplete="email"`) traite ce champ comme une adresse email. Résultat : un opérateur suivant l'exemple crée un compte admin non-connectable.

**Approach:** Renommer `ADMIN_USERNAME` → `ADMIN_EMAIL` dans la codebase (backend config Joi, AdminSeedService, .env.example × 2, ci.yml, E2E × 7) avec validation `Joi.string().email()` ; nom d'affichage initial = partie locale de l'email.

## Boundaries & Constraints

**Always:**
- `ADMIN_EMAIL: Joi.string().email().trim().lowercase().required()` dans `app.config.ts`
- Nom d'affichage admin = `email.split('@')[0]`
- Renommage `E2E_ADMIN_USERNAME` → `E2E_ADMIN_EMAIL` dans ci.yml et les 7 fichiers E2E
- Aucune migration DB — colonne `username` inchangée

**Ask First:** Aucune décision ouverte.

**Never:**
- Toucher la colonne DB `username` → différé dans `deferred-work.md`
- Modifier la logique de reset de mot de passe

</frozen-after-approval>

## Suggested Review Order

1. [app.config.ts](../../backend/src/config/app.config.ts) — validation `Joi.string().email()` sur `ADMIN_EMAIL`
2. [admin-seed.service.ts](../../backend/src/auth/admin-seed.service.ts) — lecture `ADMIN_EMAIL`, calcul `name = email.split('@')[0]`
3. [.env.example](../../.env.example) + [backend/.env.example](../../backend/.env.example) — exemples mis à jour
4. [ci.yml](../../.github/workflows/ci.yml) — 4 remplacements `ADMIN_EMAIL` / `E2E_ADMIN_EMAIL`
5. [e2e/tests/auth.spec.ts](../../e2e/tests/auth.spec.ts) — variable renommée
6. [e2e/tests/admin.spec.ts](../../e2e/tests/admin.spec.ts) — `adminEmail` remplace `adminUsername`
7. [e2e/tests/profile.spec.ts](../../e2e/tests/profile.spec.ts) — `adminEmail` remplace `adminUsername`
8. [e2e/tests/admin-responsive.spec.ts](../../e2e/tests/admin-responsive.spec.ts) — `adminEmail` remplace `adminUsername`
9. [e2e/tests/links-drag-drop.spec.ts](../../e2e/tests/links-drag-drop.spec.ts) — variable renommée
10. [e2e/tests/links-grid-settings.spec.ts](../../e2e/tests/links-grid-settings.spec.ts) — variable renommée
11. [e2e/tests/links-icon-picker.spec.ts](../../e2e/tests/links-icon-picker.spec.ts) — variable renommée
12. [epics.md](../planning-artifacts/epics.md) + [architecture.md](../planning-artifacts/architecture.md) — libellés mis à jour
