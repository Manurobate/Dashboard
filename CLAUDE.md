# CLAUDE.md — Dashboard

Instructions et contexte pour les agents IA (Claude Code) qui travaillent sur ce dépôt.
Langue de travail : **français** (échanges, documentation, messages de commit).

## Règles de travail

### Autonomie
Pour tout ce qui relève du développement, **pas besoin de demander l'autorisation** : lire et modifier des fichiers, lancer des commandes (install, build, tests, lint, migrations en local, Docker…), créer des fichiers, etc. Avance et rends compte du résultat.

### Commit et push : INTERDITS sans accord explicite
- **Ne jamais faire de `git commit` ni de `git push` sans que Manu ait explicitement donné son feu vert** pour ce commit ou ce push précis.
- Un accord donné une fois ne vaut pas pour les suivants : redemande à chaque fois.
- Il en va de même pour tout ce qui réécrit l'historique ou touche au dépôt distant (`--amend`, `rebase`, `reset --hard`, `push --force`, suppression de branche, création de PR, merge).
- Préparer le travail est autorisé (`git add`, `git status`, `git diff`). Attends le « go » avant de commiter.
- **Toujours montrer le message de commit avant de commiter**, même quand Manu demande explicitement un commit. Affiche le message complet et la liste des fichiers concernés, puis attends qu'il valide ou modifie le message. Ne lance `git commit` qu'après cette validation.

### Messages de commit : Conventional Commits obligatoires
Le pipeline CD (`.github/workflows/cd.yml`) calcule la version sémantique à partir du **sujet** des commits depuis le dernier tag. Le préfixe compte donc vraiment :

| Préfixe | Usage | Effet sur la version |
|---|---|---|
| `feat!:` | changement cassant | **major** |
| `feat:` | nouvelle fonctionnalité | **minor** |
| `fix:` | correction de bug | patch |
| `docs:` | documentation uniquement | patch |
| `test:` | ajout/correction de tests | patch |
| `refactor:` | refacto sans changement fonctionnel | patch |
| `style:` | formatage (Prettier…) | patch |
| `chore:` | maintenance, config, dépendances | patch |
| `ci:` | workflows GitHub Actions | patch |

Points d'attention liés au script du CD :
- **Pas de scope** : `feat(recette): …` n'est **pas** reconnu comme `feat:` (la regex est `^feat:`), il produirait un simple patch. Mets le contexte dans la description : `feat: ajout avant-propos sur les recettes`.
- Un changement cassant doit être signalé avec **`feat!:`** dans le sujet. Un `BREAKING CHANGE` placé dans le corps du message n'est pas détecté (seul le sujet est lu).
- Sujet en français, à l'impératif ou au nominal, concis. Référence la story si elle existe : `feat: onglet Notes avec iframe Trilium (story 7.3)`.
- **Aucune signature** : pas de ligne `Co-Authored-By:`, pas de mention « Generated with Claude Code », ni aucune autre attribution à la fin du message. Les commits doivent ressembler à ceux de Manu, qui ne signe pas les siens.

## Le projet

**Dashboard** est un tableau de bord personnel **auto-hébergé**, multi-utilisateurs (moins de 10 comptes). Il regroupe trois modules :
- **Liens** : favoris rangés par catégories, mode lecture/édition, drag & drop.
- **Recettes** : recettes avec ingrédients, étapes, nombre de convives ajustable, markdown, partage public par lien.
- **Notes** : intégration de **Trilium Notes** via iframe (Epic 7). Un module de notes natif est prévu plus tard (Epic 8).

### Stack
- **Monorepo** : `frontend/` (Angular 21, standalone, zoneless, Angular Material 21 / M3), `backend/` (NestJS 11, TypeScript strict, TypeORM), base **MariaDB**.
- **Déploiement** : Docker Compose (`docker-compose.yml`, variantes `override` et `external-db`). Images publiées sur GHCR.
- **E2E** : Playwright dans `e2e/`.
- **PWA** : app shell, manifest, icônes (sources de marque dans `brand/`).

### Historique et méthode : tout a été fait avec BMAD
Le projet a été conçu et développé avec la méthode **BMAD** (v6, config dans `_bmad/`, skills dans `.claude/skills/`) : product brief → PRD → UX → architecture → epics/stories → sprints, avec revue de code et rétrospectives. Toute la documentation générée est versionnée dans **`_bmad-output/`** et fait foi. **Consulte-la avant de coder** :

- `_bmad-output/planning-artifacts/` : `prd.md`, `architecture.md`, `epics.md`, `ux-design-Dashboard.md`, ainsi que les `sprint-change-proposal-*.md` qui tracent les changements de cap.
- `_bmad-output/implementation-artifacts/` : un fichier par story (`<epic>-<story>-<slug>.md`), les specs ponctuelles (`spec-*.md`), `deferred-work.md` (dette et travaux reportés) et surtout **`sprint-status.yaml`**, la source de vérité sur l'avancement.

Avancement (novembre 2026) :
- Epics 1 à 6 terminés : infra et design system, authentification, administration, Liens, Recettes, partage public des recettes.
- Epic 7 (Trilium), stories 7.1 à 7.3 terminées, développées sur la branche `feat/trilium`.
- Epic 8 (notes natives) en backlog.

Changement de cap notable (2026-06-18) : plutôt que de réimplémenter un système de notes, l'Epic 7 intègre l'instance Trilium existante de Manu dans une iframe. Il n'y a pas de token ETAPI : l'utilisateur se connecte à Trilium dans l'iframe. L'ancien Epic 7 (notes natives) est devenu l'Epic 8. Il remplacera le toggle binaire de `/settings` par un sélecteur à 3 états (Désactivé / Trilium / Notes intégrées).

### Git flow
- Branches `feat/*` / `fix/*` → PR vers **`develop`** (la CI y lance lint, Prettier, tests et build ; les E2E tournent au merge dans `develop`, ou sur une PR portant le label `run-e2e`) → PR `develop` → **`main`**.
- Un merge sur `main` déclenche le CD : tag semver, images GHCR, GitHub Release.

## Commandes utiles

- **Backend** (`backend/`) : `npx jest` (ou `npx jest <pattern>`), `npm run lint` (ESLint --fix), typecheck `npx tsc --noEmit -p tsconfig.build.json`.
- **Frontend** (`frontend/`) : tests via **`npx ng test --no-watch`**. Ne pas lancer `npx vitest` directement : ça échoue, car les globals sont fournis par le builder Angular. Il n'y a pas d'ESLint frontend, uniquement Prettier. Le typecheck des templates passe par `npx ng build`.
- **E2E** (`e2e/`) : `npx playwright test <pattern>`. Nécessite la stack lancée et les variables `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`. `--list` vérifie la compilation sans exécuter.
- Formater avec Prettier avant de proposer un commit : la CI le vérifie.

## Conventions techniques établies

- **Angular** : Material 21 en M3 (API `mat.theme()`, pas les API M2). `provideZonelessChangeDetection()`. État géré par Signals natifs et services (pas de NgRx).
- **Tests** : backend avec Jest (`jest.fn()`), frontend avec Vitest via le builder Angular (`vi.fn()`).
  - Piège : un composant standalone qui importe `MatDialogModule` masque le mock root de `MatDialog`. Il faut espionner `(component as any).dialog.open`.
- **Auth** : cookie httpOnly `SameSite=Strict` + header `X-Requested-With` (anti-CSRF). `username` = adresse email.
- **Base de données** : migrations TypeORM uniquement (jamais `synchronize: true`). Les agrégats `getRawOne()` peuvent revenir en string : caster avec `Number()`. Transactions via `dataSource.transaction(...)`.
- **Sécurité** : ownership obligatoire, `{ userId }` dans **tous** les `WHERE`. `@SkipThrottle()` au niveau contrôleur pour les CRUD. Protection anti-SSRF sur les appels sortants (cf. ping Trilium).
- **UX** : mises à jour optimistes (signal mis à jour immédiatement, rollback via `loadXxx()` en cas d'erreur HTTP).
- Ne jamais commiter de secrets : `.env` et `backups/*.sql` sont ignorés.
