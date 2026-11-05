---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
status: complete
completedAt: '2026-04-21'
workflowType: 'prd'
inputDocuments:
  - '_bmad-output/planning-artifacts/product-brief-Dashboard.md'
  - '_bmad-output/planning-artifacts/product-brief-Dashboard-distillate.md'
  - '_bmad-output/planning-artifacts/ux-design-Dashboard.md'
  - '_bmad-output/planning-artifacts/ux-briefing-Dashboard.md'
briefCount: 2
researchCount: 0
brainstormingCount: 0
projectDocsCount: 0
classification:
  projectType: web_app
  domain: personal_productivity
  complexity: low
  projectContext: greenfield
---

# Product Requirements Document - Dashboard

**Author:** Manu
**Date:** 2026-04-21

## Résumé Exécutif

Dashboard est une application web personnelle auto-hébergée qui remplace l'onglet par défaut du navigateur. Elle centralise trois usages quotidiens — gestion de liens favoris, recettes de cuisine, notes personnelles — sous une interface unique et cohérente, déployable en une commande (`docker-compose up`). Aucune donnée ne quitte le serveur de l'utilisateur : pas d'abonnement, pas de cloud tiers, pas de dépendance externe.

**Utilisateurs cibles :**
- *Admin / utilisateur principal* — développeur auto-hébergeur, accès desktop (page d'accueil) et mobile (recettes en cuisine, partage ponctuel)
- *Utilisateurs secondaires* (< 10 comptes) — famille et amis proches, profils non techniques, reçoivent des liens partagés ou accèdent à leur propre espace

**Problème résolu :** La vie numérique personnelle est fragmentée entre outils mono-fonction (Dashy pour les liens, Mealie pour les recettes, Joplin pour les notes) et services cloud dont l'utilisateur ne maîtrise ni les données ni la pérennité. Nextcloud propose un tout-en-un mais avec une complexité opérationnelle disproportionnée pour un usage familial.

### Ce qui rend ce produit spécial

Aucun outil self-hosted existant ne combine ces trois modules sous une interface cohérente utilisable comme page d'accueil quotidienne. La différenciation repose sur trois axes :

1. **Convergence** : liens + recettes + notes dans une URL unique, navigation unifiée, design system cohérent — l'outil s'efface derrière l'usage
2. **Souveraineté** : toutes les données sur le serveur de l'utilisateur, aucun tracking, aucun abonnement, aucune dépendance à une infrastructure tierce
3. **Minimalisme opérationnel** : un seul `docker-compose.yml`, stack standard (NestJS + Angular + MariaDB), maintenable par une seule personne sans infrastructure additionnelle (pas de Redis, pas d'Elasticsearch)

L'insight fondamental : minimalisme opérationnel et couverture fonctionnelle utile ne sont pas contradictoires — à condition de choisir précisément le périmètre et de refuser tout scope creep.

## Classification du projet

| Dimension | Valeur |
|-----------|--------|
| Type | Application web (SPA + PWA basique) |
| Domaine | Productivité personnelle / auto-hébergement |
| Complexité | Faible (stack standard, pas de conformité réglementaire) |
| Contexte | Greenfield |

## Critères de succès

### Succès utilisateur

- Dashboard est défini comme page d'accueil du navigateur et consulté chaque jour pendant 4 semaines consécutives après le lancement
- Au moins 2 modules V1 utilisés activement chaque semaine (ajout d'un lien, consultation ou création d'une recette, note rédigée)
- Au moins 1 lien public partagé avec un membre de la famille ou un ami dans le mois suivant le lancement
- Un visiteur accède à un contenu partagé sans créer de compte et sans friction

### Succès business / projet

- L'instance tourne sans intervention pendant 4 semaines après déploiement initial

### Succès technique

Pas de seuils de performance formels — projet personnel, optimisation au mieux plutôt que par contrat. Objectif qualitatif : les opérations courantes (chargement du module Liens, filtrage de recettes, sauvegarde d'une note) ne doivent pas produire de latence visible dans des conditions normales d'usage.

Sécurité minimale suffisante pour un outil familial fermé : mots de passe hashés, protection brute-force sur le login, jetons de partage non devinables, vues publiques strictement en lecture seule, isolation des données entre comptes. Détails en [Exigences Non-Fonctionnelles — Sécurité](#sécurité).

### Résultats mesurables

| Résultat | Critère |
|----------|---------|
| Adoption | Page d'accueil navigateur pendant 4 semaines consécutives |
| Engagement | ≥ 2 modules utilisés chaque semaine |
| Partage | ≥ 1 partage externe dans le 1er mois |
| Stabilité | 4 semaines sans intervention post-déploiement |

## Périmètre du produit

### MVP — V1 (déploiement progressif : Liens → Recettes → Notes)

- Authentification multi-comptes : JWT + bcrypt, rate limiting anti-brute-force
- Rôles : admin instance (gestion des comptes, config globale) / utilisateur (espace personnel indépendant)
- **Module Liens** *(livré en premier)* : catégories configurables, fiches de liens (URL + titre + favicon auto-récupéré), interface d'édition inline, drag & drop pour réorganiser
- **Module Recettes** *(livré en second)* : CRUD complet, ingrédients structurés avec adaptation indicative des quantités par nombre de convives, partage par lien public (jeton CSPRNG, expiration configurable : 24h / 7j / 30j / permanent, révocable)
- **Module Notes** *(livré en troisième)* : CRUD, éditeur WYSIWYG (TipTap), organisation en dossiers/sous-dossiers, privé par défaut, partage par lien public avec expiration
- Design responsive : desktop-first pour Liens, mobile-first pour Recettes et Notes
- **PWA basique** : app shell mis en cache — l'application s'affiche sans erreur en cas d'absence de réseau ; pas d'offline data en V1
- Déploiement Docker Compose avec dumps automatisés de la base de données
- TLS via reverse proxy existant (Traefik / Nginx)

### Fonctionnalités post-MVP (V2+)

- Module Liste de courses collaborative (cases à cocher depuis le téléphone)
- Module Todo list
- Module Suivi de budget partagé (style Tricount)
- **Notes collaboratives** : édition simultanée d'une note entre plusieurs utilisateurs de l'instance
- **Whiteboard** : espace de dessin/écriture libre collaboratif en temps réel (à explorer — complexité à évaluer)
- **Widgets page d'accueil** : blocs configurables sur la page Liens — météo, cours de bourse (valeur paramétrable), statut de serveurs personnels
- PWA offline data et synchronisation complète
- Import depuis outils existants (favoris navigateur, Joplin, OneNote)

### Vision long terme (V3+)

- **Module Courrier (IMAP)** : accès à plusieurs boîtes mail depuis un seul endroit, connexion via IMAP. Complexité de sécurité plus élevée (stockage de credentials IMAP, chiffrement) — à traiter comme un module distinct avec des exigences de sécurité renforcées par rapport au reste de l'application.

**Explicitement hors scope V1 :** application mobile native, notifications push, monitoring et alerting, import d'outils tiers, accès en modification sur les vues publiques.

## Parcours Utilisateurs

### J1 — Manu : l'usage quotidien (parcours principal)

Manu travaille depuis son bureau. Il ouvre un nouvel onglet — Dashboard s'affiche immédiatement, sa session JWT est toujours active. Pas d'écran de login, pas d'attente. La page Liens s'ouvre par défaut : ses catégories (Dev, Outils, Cuisine, Jeux) sont là, compactes, familières. Il cherche l'interface de son routeur. Trois secondes plus tard, il a cliqué. C'est tout.

Le soir, depuis le téléphone, il consulte une recette pendant qu'il cuisine. Il tape "risotto" dans la barre de recherche — les résultats filtrent en temps réel dès la deuxième lettre. Il ouvre la recette, tape "+" deux fois sur le stepper convives : les quantités se recalculent immédiatement. Il n'a pas eu à sortir du four pour reposer le téléphone.

**Capacités révélées :** session persistante (JWT), module Liens comme vue par défaut, recherche temps réel, stepper convives, design responsive mobile.

---

### J2 — Manu : ajout de contenu (parcours contribution)

Manu tombe sur un outil de monitoring qu'il veut retrouver plus tard. Il est sur la page Liens. Il clique "Modifier" — les contrôles d'édition apparaissent sans changer de page. Il clique "Ajouter un lien" dans la catégorie Dev. Il colle l'URL : le titre se pré-remplit depuis les meta OG, le favicon apparaît en aperçu. Il sauvegarde — snackbar "Lien ajouté", le lien est là. Il clique "Terminer" : retour à la vue propre.

Plus tard, il crée une nouvelle recette de pain maison. Il ouvre le module Recettes, clique "Nouvelle recette", remplit le titre, ajoute les ingrédients ligne par ligne (quantité, unité, nom), réorganise les étapes par drag & drop. Il sauvegarde. La recette apparaît dans sa catégorie Boulangerie.

**Capacités révélées :** toggle lecture/édition inline, fetch meta OG, formulaire de recette avec FormArray dynamique, drag & drop, sauvegarde optimiste avec feedback.

---

### J3 — Clara : l'espace personnel d'un utilisateur secondaire

Clara, la conjointe de Manu, a son propre compte sur l'instance. Son espace est entièrement indépendant : ses liens à elle (recettes qu'elle suit, boutiques, sites de jardinage), ses propres notes. Elle n'a pas accès aux contenus de Manu, et lui n'a pas accès aux siens.

Elle utilise Dashboard sur mobile comme page d'accueil. Le matin, elle ouvre un onglet, ses liens s'affichent. L'interface est identique à celle de Manu — mêmes composants, même navigation — mais son contenu à elle. Elle n'a jamais eu à configurer quoi que ce soit : Manu a créé son compte, elle a reçu un mot de passe temporaire, elle l'a changé à la première connexion, et c'est tout.

**Capacités révélées :** isolation des données par compte, espace utilisateur indépendant, même interface pour tous les rôles utilisateur.

---

### J4 — Thomas : visiteur qui reçoit un lien partagé

Thomas, un ami de Manu, reçoit un lien WhatsApp : "ma recette de brioche, essaie ça ce week-end". Il clique. Une page s'ouvre — la recette, complète, avec les ingrédients et les étapes. Une mini barre en haut identifie l'origine ("Dashboard") mais ne propose aucun lien vers le reste de l'application. Pas de popup d'inscription, pas de mur de login.

Il ajuste le stepper à 8 personnes — les quantités se recalculent. Il met la page en favori sur son téléphone. Le lendemain, il revient : la page s'ouvre toujours (le lien est permanent). Si Manu avait mis une expiration à 7 jours, Thomas verrait à la place une page sobre indiquant que le lien a expiré — sans révéler aucune information sur l'instance.

**Capacités révélées :** vue publique lecture seule, aucune navigation vers l'intérieur de l'app, stepper fonctionnel sans authentification, expiration de jeton, page d'expiration neutre.

---

### J5 — Manu admin : onboarding et réinitialisation de mot de passe

Manu veut donner un accès à sa sœur. Il va dans le panneau d'administration (accessible via le menu utilisateur), clique "Nouvel utilisateur", saisit le nom et l'identifiant. Le système génère un mot de passe temporaire affiché une seule fois à l'écran — Manu le copie et l'envoie par message. Aucune configuration SMTP, aucune dépendance externe.

Sa sœur se connecte avec ce mot de passe. L'application la redirige immédiatement vers un écran "Choisissez votre mot de passe" — elle ne peut accéder à aucune fonctionnalité avant de l'avoir changé. Une fois fait, elle arrive sur sa page Liens vide avec un état vide actionnable : "Aucun lien pour l'instant — Ajouter une catégorie".

En cas de mot de passe oublié, l'utilisateur contacte Manu. Pas de système "mot de passe oublié" automatique — pas de SMTP configuré, pas de dépendance externe. Manu retrouve le compte dans le panneau admin et clique "Réinitialiser le mot de passe" : nouveau mot de passe temporaire généré, affiché une seule fois, transmis par le canal de son choix. L'utilisateur est à nouveau forcé de définir un nouveau mot de passe à la prochaine connexion — même mécanique que l'onboarding.

**Capacités révélées :** panneau admin (création et gestion de comptes), génération de mot de passe temporaire affiché une seule fois, réinitialisation de mot de passe par l'admin, flag `mustChangePassword`, redirection forcée avant accès, états vides actionnables par module.

---

### Synthèse des capacités révélées par les parcours

| Capacité | Journeys |
|----------|---------|
| Session JWT persistante + refresh silencieux | J1 |
| Module Liens comme vue par défaut | J1 |
| Recherche temps réel (debounce) | J1, J3 |
| Stepper convives avec recalcul immédiat | J1, J4 |
| Toggle lecture/édition inline (Liens) | J2 |
| Fetch meta OG à la saisie d'URL | J2 |
| Formulaire recette avec ingrédients dynamiques + drag & drop | J2 |
| Isolation des données entre comptes | J3 |
| Vue publique lecture seule sans navigation interne | J4 |
| Expiration de jeton + page neutre à l'expiration | J4 |
| Panneau admin (création et gestion de comptes) | J5 |
| Génération de mot de passe temporaire affiché une seule fois | J5 |
| Réinitialisation de mot de passe par l'admin | J5 |
| Flag `mustChangePassword` + redirection forcée | J5 |
| États vides actionnables par module | J5 |

## Exigences spécifiques — Application Web

### Vue d'ensemble

Application web SPA (Single-Page Application) Angular avec PWA basique, auto-hébergée, accès via navigateur desktop et mobile. Aucune indexation publique souhaitée.

### Compatibilité navigateurs

| Navigateur | Plateforme | Niveau de support |
|------------|------------|-------------------|
| Chrome | Desktop (Linux/Windows/Mac) | Primaire — support complet garanti |
| Firefox | Desktop | Primaire — support complet co-égal à Chrome |
| Chrome | Android | Secondaire — responsive mobile, vues partagées |
| Safari | iOS | Vues publiques uniquement (liens partagés reçus par des tiers) |

Pas de support IE ni d'anciens navigateurs. Les deux navigateurs primaires (Chrome et Firefox) doivent être testés à parité sur chaque fonctionnalité avant livraison.

### Design responsive

Stratégie hybride par module (déjà définie dans l'UX design) :
- **Desktop-first** : module Liens (usage principal = page d'accueil navigateur)
- **Mobile-first** : modules Recettes et Notes, vues publiques

Deux breakpoints uniquement : `< 768px` (mobile) / `≥ 768px` (desktop).

### SEO et indexation

Aucun besoin de référencement — application privée auto-hébergée. Les vues publiques (contenu partagé) ne doivent pas être indexées par les moteurs de recherche (`noindex` sur les routes publiques). Pas de sitemap, pas de balises Open Graph côté serveur.

### Temps réel et synchronisation

Pas de WebSocket ni de push en V1. Interactions "temps réel" entièrement côté client :
- Filtrage de recettes : debounce 200 ms après saisie
- Sauvegarde automatique des notes : debounce 1 s après arrêt de frappe
- Stepper convives : recalcul immédiat (synchrone, côté client)
- Récupération favicon : requête async au chargement du formulaire d'ajout de lien

### Considérations d'implémentation

- **Angular Universal / SSR** : non requis — application privée, pas de SEO
- **PWA** : `ng add @angular/pwa` pour l'app shell ; service worker mis en cache pour éviter les erreurs en cas d'absence réseau. Pas d'offline data en V1
- **Performance** : lazy loading des modules Angular, `loading="lazy"` sur les images de recettes — optimisation au mieux sans seuils formels
- **TLS** : délégué au reverse proxy existant (Traefik / Nginx) — l'application ne gère pas de certificats
- **Accessibilité** : cible WCAG 2.1 AA — détails en [Exigences Non-Fonctionnelles — Accessibilité](#accessibilité)

## Scoping et développement par phases

### Stratégie MVP et philosophie

**Approche MVP :** MVP d'expérience — le produit doit être utilisable au quotidien dès sa première livraison. La valeur principale (remplacer l'onglet par défaut) est validée dès que le module Liens fonctionne, mais les trois modules sont nécessaires pour que la promesse de convergence soit tenue.

**Équipe :** projet solo en vibe coding, Manu en rôle de tech lead validant les implémentations produites par les agents de développement.

### Fonctionnalités MVP (Phase 1 — V1)

**Parcours utilisateurs couverts :**
- J1 — Usage quotidien (Liens + Recettes)
- J2 — Ajout de contenu (tous modules)
- J3 — Espace personnel utilisateur secondaire
- J4 — Visiteur destinataire d'un lien partagé
- J5 — Admin onboarding et réinitialisation de mot de passe

**Livraison progressive :**

| Livraison | Contenu |
|-----------|---------|
| **1 — Module Liens** | Authentification + rôles + panneau admin + module Liens complet (catégories, fiches, favicon, édition inline, drag & drop) + infrastructure Docker Compose + PWA app shell |
| **2 — Module Recettes** | CRUD recettes + ingrédients structurés + stepper convives + partage par lien public (CSPRNG, expiration, révocation) |
| **3 — Intégration Notes (Trilium)** | Page `/settings` + intégration Trilium Notes via iframe + configuration URL par utilisateur + activation/désactivation |
| **4 — Module Notes intégré** | CRUD notes + éditeur TipTap + arborescence dossiers + partage par lien public + sauvegarde auto + sélecteur 3 états dans `/settings` |

L'authentification, les rôles et le panneau admin sont livrés avec le module Liens — pas de phase infrastructure séparée.

### Stratégie de gestion des risques

**Risques techniques V1 :**

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Intégration TipTap (module Notes intégré) | Moyen — éditeur WYSIWYG tiers à wrapper dans Angular (`ControlValueAccessor`) | Livré en Epic 8 — la complexité est isolée et n'impacte pas les livraisons précédentes |
| Embedding iframe Trilium | Faible — configuration CSP côté Trilium requise par l'utilisateur | Documenté dans les notes de déploiement + message d'aide contextuel dans l'état d'erreur |
| Sécurité du partage public (CSPRNG + lecture seule stricte) | Moyen — le jeton ne doit pas être devinable, la vue publique ne doit jamais exposer d'accès en modification | Validation explicite lors de la code review : espace de tokens, middleware de lecture seule sur toutes les routes publiques |
| Fetch favicon / meta OG | Faible — requête vers des URLs tierces potentiellement lentes ou indisponibles | Timeout court côté serveur, fallback gracieux (lettre initiale du titre) |

Les risques V2 (collaboration temps réel, whiteboard) sont traités lors de la planification V2.

## Exigences Fonctionnelles

### Gestion des comptes et authentification

- **FR1** : Un utilisateur non authentifié peut se connecter avec son adresse email et un mot de passe
- **FR2** : Le système protège le formulaire de connexion contre les tentatives de brute-force par rate limiting
- **FR3** : Un utilisateur authentifié reste connecté entre les sessions (token JWT persistant avec refresh silencieux)
- **FR4** : Un utilisateur peut se déconnecter
- **FR5** : Un utilisateur dont le mot de passe est temporaire est contraint de le changer avant d'accéder à toute fonctionnalité
- **FR6** : Un utilisateur peut modifier son propre mot de passe
- **FR6b** : Un utilisateur peut modifier son nom d'affichage depuis sa page profil (`/profile`)
- **FR6c** : L'accès au changement de mot de passe se fait depuis la page profil — le menu utilisateur expose "Mon profil" et non plus "Changer le mot de passe"
- **FR7** : Les données de chaque utilisateur sont strictement isolées des autres comptes

### Administration de l'instance

- **FR8** : L'administrateur peut créer un compte utilisateur (adresse email + nom d'affichage)
- **FR9** : La création d'un compte génère automatiquement un mot de passe temporaire affiché une seule fois
- **FR10** : L'administrateur peut réinitialiser le mot de passe d'un utilisateur (génère un nouveau mot de passe temporaire affiché une seule fois)
- **FR11** : L'administrateur peut désactiver ou supprimer un compte utilisateur
- **FR12** : L'administrateur peut consulter la liste des comptes de l'instance

### Module Liens

- **FR13** : Un utilisateur peut créer une catégorie de liens (nom, icône Material optionnelle)
- **FR14** : Un utilisateur peut modifier et supprimer une catégorie de liens
- **FR15** : Un utilisateur peut réorganiser ses catégories par drag & drop
- **FR16** : Un utilisateur peut replier et déplier une catégorie
- **FR17** : Un utilisateur peut créer une fiche de lien (URL, titre, description optionnelle)
- **FR18** : Le système récupère automatiquement le favicon et les métadonnées OG d'une URL lors de la création d'un lien
- **FR19** : Un utilisateur peut modifier et supprimer un lien
- **FR20** : Un utilisateur peut réorganiser ses liens au sein d'une catégorie par drag & drop
- **FR20b** : Un utilisateur peut déplacer un lien d'une catégorie vers une autre par drag & drop
- **FR21** : Un utilisateur peut basculer entre un mode lecture (sans contrôles d'édition) et un mode édition sur la page Liens
- **FR22** : La page d'accueil (`/dashboard`) est la vue affichée par défaut après connexion

### Module Recettes

- **FR23** : Un utilisateur peut créer une recette (titre, avant-propos optionnel avec mise en forme basique, ingrédients structurés, étapes avec mise en forme textuelle basique — gras, italique, souligné — catégorie)
- **FR24** : Un utilisateur peut modifier et supprimer une recette
- **FR25** : Un utilisateur peut organiser ses recettes par catégories
- **FR26** : Un utilisateur peut rechercher ses recettes en temps réel
- **FR27** : Un utilisateur peut ajuster le nombre de convives d'une recette et voir les quantités des ingrédients recalculées en conséquence
- **FR28** : Un utilisateur peut réorganiser les ingrédients et les étapes d'une recette par drag & drop

### Module Notes — Intégration Trilium (Epic 7)

- **FR_S1** : Une page `/settings` accessible à tous les utilisateurs authentifiés est créée, accessible depuis le menu utilisateur de la top bar — elle contient initialement les paramètres du module Notes et est extensible à d'autres paramètres dans les épics futurs
- **FR_T1** : Un utilisateur peut saisir l'URL de son instance Trilium Notes dans sa page `/settings`
- **FR_T2** : Un utilisateur peut activer ou désactiver le module Notes depuis `/settings` — l'onglet Notes est masqué dans la navigation si désactivé
- **FR_T4** : L'onglet Notes affiche l'interface web de l'instance Trilium de l'utilisateur dans une iframe
- **FR_T5** : L'utilisateur peut tester la connectivité de son instance Trilium depuis `/settings` (le backend effectue un HEAD sur l'URL fournie, sans token)
- **FR_T6** : Si aucune instance Trilium n'est configurée ou si l'URL ne répond pas, un état d'erreur explicite s'affiche dans l'onglet Notes avec un lien vers `/settings`

### Module Notes intégré Dashboard (Epic 8)

- **FR_N0** : En Epic 8, la section Notes de `/settings` évolue vers un sélecteur à trois états (Désactivé / Trilium / Notes intégrées Dashboard) — remplace le toggle binaire et le champ URL distincts introduits en Epic 7
- **FR29** : Un utilisateur peut créer une note avec un contenu texte enrichi (WYSIWYG)
- **FR30** : Un utilisateur peut modifier et supprimer une note
- **FR31** : Un utilisateur peut organiser ses notes dans des dossiers et sous-dossiers
- **FR32** : Un utilisateur peut créer, renommer et supprimer des dossiers de notes
- **FR33** : Le contenu d'une note est sauvegardé automatiquement pendant la saisie
- **FR34** : Un utilisateur peut naviguer entre ses notes et dossiers depuis un panneau latéral

### Partage public

- **FR35** : Un utilisateur peut générer un lien public pour partager une recette (Epic 6) ou une note intégrée Dashboard (Epic 8)
- **FR36** : Un utilisateur peut choisir une durée d'expiration pour un lien partagé (24h, 7j, 30j, permanent)
- **FR37** : Un utilisateur peut révoquer un lien partagé actif
- **FR38** : Un visiteur non authentifié peut accéder au contenu d'un lien partagé valide en lecture seule — recettes (Epic 6), notes intégrées (Epic 8)
- **FR39** : Un visiteur accédant à une recette partagée peut utiliser le stepper de convives
- **FR40** : Un visiteur accédant à un lien expiré ou invalide voit une page d'erreur neutre sans information sur l'instance
- **FR41** : Les vues publiques n'exposent aucune navigation vers le reste de l'application — recettes (Epic 6), notes intégrées (Epic 8)

### Personnalisation et expérience

- **FR42** : Un utilisateur peut basculer entre un thème clair et un thème sombre
- **FR43** : Le thème choisi est persisté entre les sessions
- **FR44** : L'application affiche un état vide actionnable lorsqu'un module ne contient pas encore de contenu
- **FR49** : Un utilisateur peut configurer l'affichage du module Liens en mode lecture — nombre de colonnes (1–6) et espacement horizontal/vertical (8–48 px, pas de 4 px) — depuis un widget discret (icône ⚙️) visible uniquement sur viewport ≥ 600 px. Le paramétrage est persisté dans localStorage (par device, par navigateur).

### Infrastructure et déploiement

- **FR45** : L'application est déployable via un seul fichier `docker-compose.yml`
- **FR46** : La base de données fait l'objet de dumps automatisés
- **FR47** : L'application expose une PWA avec app shell mis en cache (affichage sans erreur en l'absence de réseau)
- **FR48** : Les routes publiques (contenu partagé) sont configurées pour ne pas être indexées par les moteurs de recherche

## Exigences Non-Fonctionnelles

### Sécurité

- Les mots de passe sont hashés avec bcrypt (facteur de coût ≥ 12) — jamais stockés ou loggés en clair
- Les tokens JWT ont une durée de vie limitée et sont rafraîchis silencieusement côté client
- Les jetons de partage public sont générés avec un CSPRNG et ont une entropie minimale de 128 bits — toute tentative d'énumération est impraticable
- Toutes les communications transitent en HTTPS (TLS assuré par le reverse proxy — l'application n'accepte pas de trafic HTTP en clair en production)
- Le formulaire de connexion est protégé par rate limiting (blocage temporaire après N tentatives échouées consécutives)
- L'accès en lecture/écriture sur les données d'un utilisateur est systématiquement vérifié côté serveur — aucune donnée d'un compte n'est accessible depuis un autre compte
- Les routes publiques (contenu partagé) sont strictement en lecture seule, vérifiées et enforced côté API — pas de reliance sur le seul comportement du client

### Performance

Pas de seuils formels — projet personnel sans SLA. Lignes directrices qualitatives :

- Les interactions côté client (filtrage recettes, stepper convives, collapse catégories) doivent être imperceptibles (< 100 ms)
- Les requêtes API en lecture courantes (chargement d'un module, ouverture d'une recette) ne doivent pas produire de latence visible dans les conditions normales d'usage (serveur local ou réseau domestique)
- La récupération de favicon/meta OG est effectuée avec un timeout court côté serveur — un échec ne bloque pas la sauvegarde du lien
- Les images de recettes sont chargées en lazy loading

### Accessibilité

- Cible : WCAG 2.1 niveau AA
- Ratios de contraste respectés sur les deux thèmes (clair et sombre), vérifiés dans le design system
- Tous les éléments interactifs sont accessibles au clavier (Tab, Shift+Tab, Entrée, Échap)
- Touch targets minimum 44×44 px sur mobile
- `aria-label` sur tous les boutons icônes, `aria-expanded` sur les éléments collapsibles, `aria-live` sur les zones mises à jour dynamiquement
- Pas de test avec lecteur d'écran en V1 (hors scope pour un outil personnel)

### Fiabilité et maintenabilité

- L'instance doit fonctionner sans intervention manuelle pendant au moins 4 semaines après déploiement initial
- Des dumps automatisés de la base de données sont configurés dans le Docker Compose pour permettre une restauration en cas de défaillance
- Le déploiement complet se fait via un seul `docker-compose.yml` sans dépendances externes supplémentaires (pas de Redis, pas d'Elasticsearch)
- Les conteneurs Docker intègrent des healthchecks pour permettre la détection automatique d'un service défaillant
