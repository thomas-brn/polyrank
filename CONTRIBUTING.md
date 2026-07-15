# Contribuer à PolyRank

Ce document décrit les conventions de branches, de commits et de merge utilisées sur ce repo. Objectif : garder `main` toujours releasable, même en solo.

## Branches

- `main` : production, déployée par Vercel. Toujours stable.
- `develop` : branche d'intégration. Toutes les branches de travail en partent, et y retournent via PR.
- `<type>/<description-en-kebab-case>` : branche de travail, créée depuis `develop`.

### Règle d'or

Aucun commit direct sur `main` ou `develop`, même seul sur le projet. On part toujours d'une branche dédiée, même pour un fix d'une ligne. Ça coûte deux commandes (`git checkout -b`, `git push -u`) et ça évite qu'une CI cassée atterrisse en prod, ou qu'un historique de `develop` devienne illisible.

Seule exception : un `hotfix/...` urgent peut partir de `main` directement (bug en prod bloquant), mais passe quand même par une PR, jamais par un push direct.

### Types de branche

Mêmes types que pour les commits (voir ci-dessous) :

```
feat/<description>       # nouvelle fonctionnalité
fix/<description>        # correction de bug
refactor/<description>   # refonte sans changement de comportement
chore/<description>      # config, dépendances, tooling
docs/<description>       # documentation
test/<description>       # tests
hotfix/<description>     # urgence sur main
```

Exemples : `fix/onboarding-duplicate-claims`, `feat/leaderboard-filter-promo`.

## Commits

Format [Conventional Commits](https://www.conventionalcommits.org/), déjà en usage sur ce repo :

```
<type>(<scope>): <description au présent, à l'impératif>
```

- **type** : `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`
- **scope** : la feature ou le module concerné (`onboarding`, `joueurs`, `match-card`...), optionnel mais recommandé
- **description** : courte, au présent, sans majuscule ni point final

Exemples tirés de l'historique :
```
fix(onboarding): enhance pseudo validation in ClaimFlow
refactor(joueurs): optimize match queries to prevent oversized URLs
feat(form): add legacy player claim flow and OTP code step to onboarding form
```

## Pull requests

- Toute branche de travail est mergée dans `develop` via PR, même en solo : ça garde un point de passage pour relire son propre diff avant merge, et une trace claire dans l'historique.
- Stratégie de merge : **merge commit** (pas de squash, pas de rebase) : conserve l'historique complet de la branche.
- `develop` est mergée dans `main` périodiquement, quand l'état est jugé stable pour une release, également via PR.
- La CI (`.github/workflows/ci.yml`, lint + build) doit passer avant tout merge.

## Résumé du flux

```
feat/ma-feature  ──PR──▶  develop  ──PR (release)──▶  main ──▶ déploiement Vercel
fix/mon-fix      ──PR──▶  develop
hotfix/urgence   ──PR──▶  main (+ back-merge vers develop)
```