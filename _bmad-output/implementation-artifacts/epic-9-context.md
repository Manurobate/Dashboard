# Epic 9 Context: Refonte visuelle Ember (desktop)

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Habiller toute l'application desktop avec la direction visuelle Ember (tokens, typographie Inter, icônes Material Symbols, logo, micro-interactions) avant la release 1.0.0. Aucun changement fonctionnel, sauf l'interrupteur « Animations » ; aucune refonte de la structure du code.

## Stories

- Story 9.1: Fondations Ember (tokens, polices, icônes, logo, PWA)
- Story 9.2: Coque de l'application
- Story 9.3: Liens en lecture
- Story 9.4: Liens en édition
- Story 9.5: Recettes
- Story 9.6: Partage et vues publiques
- Story 9.7: Notes, Paramètres, Admin, Login, mots de passe et Profil
- Story 9.8: Finitions, accessibilité, parité et non-régression

## Requirements & Constraints

- Les maquettes de `_bmad-output/planning-artifacts/refonte-ember/` font foi ; sur un écran sans maquette, ne pas improviser, demander à Manu (exception : états sans maquette, structure inchangée + tokens Ember).
- Aucune modification du backend, de l'API, des routes ni des règles métier. E2E existants verts.
- Contraste AA : variante conforme choisie (rouges ajustés, tokens `--color-primary-fill` et `--color-on-primary-soft`).
- Chaque story : vérification manuelle aux maquettes dans les deux thèmes ; une branche et une PR par story ; commits `feat:` sans scope (dernier commit de 9.8 en `feat!:`).
- Plus aucune dépendance externe (Google Fonts) : polices et icônes auto-hébergées.

## Technical Decisions

- Noms de tokens libres mais cohérents ; `--color-error`, `--color-warning`, `--color-on-primary`, `--color-text-primary`, `--color-text-secondary`, `--color-divider` conservés.
- Material 21 M3 : `mat.theme()` + overrides `--mat-sys-*` ; fond des `mat-flat-button` branché sur `--color-primary-fill`.
- Icônes : Material Symbols Outlined, graisse 300, FILL 0, mêmes noms qu'avant (pas de reprise en base), `printer` devient `print`.
- Grille Liens : `repeat(var(--link-columns, 3), minmax(0, var(--link-card-width, 280px)))`, écart par défaut 16px.
- Thème sombre porté par la classe `dark-theme` sur `body`.

## UX & Interaction Patterns

- Top bar 60px, rayon de carte 16px, tuile favicon 26×26 rayon 7px, bouton clair/sombre dans toutes les top bars.
- Motion : transitions 140 à 200ms (jamais > 250ms), apparition de cartes en cascade, neutralisées par le réglage « Animations ».

## Cross-Story Dependencies

- 9.1 est le socle de toutes les autres stories (tokens, polices, icônes).
- 9.7 ajoute l'interrupteur « Animations » consommé par les animations des stories 9.3 à 9.6.
