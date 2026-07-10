# DEVOPS.md : plan de professionnalisation de la mise en production

Objectif : transformer PolyRank en projet vitrine DevOps, sans monter d'infra (serveur, Kubernetes, IaC) — ce volet est réservé à un autre projet. Ici, le périmètre est **zéro infra, déploiement Vercel**, et la vitrine repose sur tout ce qui entoure le code : CI, tests, sécurité, observabilité applicative.

Principe directeur : chaque brique doit être **visible depuis le repo GitHub** (workflows, badges, diagramme, runbook). Une pratique invisible ne sert à rien pour une carte de visite.

---

## 1. État des lieux

| Domaine | Actuel |
| --- | --- |
| CI | Aucune (pas de `.github/workflows/`) |
| Tests | Aucun (ni unitaires ni e2e) |
| Déploiement | Vercel prévu, non industrialisé |
| BDD / Auth | Supabase Cloud (Postgres + OTP email), migrations SQL versionnées |
| Monitoring | Aucun |
| Sécurité | RLS Supabase uniquement |

---

## 2. Ce qui reste indispensable sans infra

Rester sur Vercel ne dispense pas des pratiques qui ne dépendent pas du serveur : elles touchent au code, au processus, à la sécurité. C'est là que se concentre l'effort.

### 2.1 CI (GitHub Actions)

Le socle, sans lequel "professionnel" reste une déclaration d'intention.

- **Workflow `ci.yml`** sur PR et push main : install (cache npm), `lint`, `tsc --noEmit`, `build`, tests.
- **Branch protection** sur `main` : CI verte obligatoire, pas de push direct. Nécessite un repo public.
- **Renovate** (plutôt que Dependabot : regroupement des PR, dashboard, config plus fine).
- **commitlint** en CI (l'historique suit déjà des conventional commits) + **release-please** pour changelog et tags de version automatiques.

### 2.2 Tests

Une CI sans tests est une coquille vide.

- **Vitest** + React Testing Library pour l'unitaire. Cible prioritaire : la logique Elo (pure, testable, cœur métier).
- **Playwright** pour un smoke e2e (login OTP mocké, soumission d'un match, affichage du classement), exécuté en CI contre un build local + **Supabase local** (`supabase start` via Docker en CI — le seul usage de Docker ici, cantonné à la CI, jamais en déploiement).
- **pgTAP** (optionnel) : tester les policies RLS et `recompute_ratings()` côté SQL.

### 2.3 Sécurité (supply chain et code)

Peu d'effort, gros signal, zéro serveur à gérer.

- **CodeQL** (gratuit sur repo public) : SAST en CI.
- **Gitleaks** en CI (+ hook pre-commit) : détection de secrets.
- `npm audit` en job non bloquant, **OSSF Scorecard** en badge.
- **Lighthouse CI** : budget perf/accessibilité sur les PR (cohérent avec la cible mobile).

### 2.4 Observabilité applicative

Sans serveur à monitorer, l'observabilité se limite à l'app et à sa disponibilité — ce qui suffit largement pour un free tier.

- **Sentry** (`@sentry/nextjs`, free tier) : erreurs front + serveur, source maps en CI, releases corrélées aux commits. Vercel ne fournit pas de suivi d'erreurs applicatif avec contexte ; ~1h de setup pour un gros gain.
- **Uptime externe** : **Uptime Kuma** (hébergé gratuitement ailleurs, ex. Fly.io/Render free tier) ou **Better Stack** free, avec status page publique `status.polyrank.fr`. Indépendant de Vercel, montre que tu surveilles la dispo réelle et pas seulement le build.
- **Vercel Analytics** (inclus) pour les Web Vitals, à mentionner dans le README plutôt qu'à réimplémenter.

### 2.5 IaC minimal (le seul qui garde du sens ici)

Pas de VPS, mais la config Vercel + DNS peut quand même être versionnée plutôt que cliquée dans une UI :

- **Terraform** avec le provider Vercel (projet, env vars, domaines) + provider DNS (Cloudflare/OVH) pour `polyrank.fr`. Petit scope, mais montre le réflexe "tout en code" sans mentir sur l'usage réel (pas de serveur à provisionner derrière).

### 2.6 La vitrine elle-même

Ce que le recruteur regarde en premier :

- **README refondu** : badges (CI, coverage, release, uptime, Scorecard), capture d'écran, diagramme simple (Mermaid : GitHub Actions → Vercel → Supabase, plus Sentry / Uptime Kuma en périphérie).
- **docs/RUNBOOK.md** court : que faire si le site est down (page Vercel/Sentry à consulter), comment restaurer un backup Supabase, comment rotater un secret.
- **Assumer le choix zéro-infra** explicitement dans le README : "déploiement PaaS assumé, l'infra Kubernetes/IaC complète est démontrée sur [autre projet]". Ça évite qu'un recruteur DevOps s'étonne de l'absence de Docker/K8s ici.

---

## 3. Hors périmètre (volontairement)

Pour mémoire, ce qu'on **ne** fait pas ici et qui part sur l'autre projet : Docker en déploiement, Kubernetes/k3s, Argo CD/GitOps, Terraform de provisioning serveur, Ansible, stack Prometheus/Grafana/Loki auto-hébergée. Le seul Docker de ce repo sera celui de `supabase start` en CI, qui n'est pas un choix d'infra mais un outil de test.

---

## 4. Ordre de mise en place

**Étape 1 : CI de base (1 à 2 jours)**
`ci.yml` (lint + tsc + build), branch protection, Renovate, commitlint. Repo public.

**Étape 2 : Tests (3 à 5 jours)**
Vitest sur la logique Elo, Playwright smoke avec Supabase local en CI, coverage en badge.

**Étape 3 : Sécurité (1 jour)**
CodeQL, Gitleaks, npm audit, Scorecard, Lighthouse CI — tout se branche sur la CI existante, coût marginal faible.

**Étape 4 : Observabilité applicative (1 à 2 jours)**
Sentry (front + serveur), Uptime Kuma/Better Stack + status page publique.

**Étape 5 : IaC minimal (1 jour)**
Terraform pour le projet Vercel + DNS `polyrank.fr`.

**Étape 6 : Vitrine (continu)**
README + diagramme + runbook, release-please, backups Supabase testés (voir section 5).

---

## 5. Base de données et auth

Contexte : l'app dépend de Supabase à trois niveaux : Postgres (+ migrations), Auth OTP (`@supabase/ssr`), et RLS (policies basées sur `auth.uid()`).

**Recommandation : rester sur Supabase Cloud.** Zéro maintenance, backups gérés, auth email qui marche, free tier suffisant pour l'usage réel (une école). Deux points d'attention à traiter, indépendants de toute infra :

- Le free tier **met le projet en pause après 7 jours d'inactivité** — problématique pour une vitrine. Si ça devient gênant, un plan Pro à 25 $/mois est la solution la plus simple (pas besoin d'auto-héberger Supabase, ce qui rouvrirait la question infra qu'on met de côté).
- **Pipeline de migrations en CI** : `supabase db push` automatisé vers un projet staging puis prod, avec `supabase db diff` en vérification.
- **Backups logiques externalisés** : `pg_dump` quotidien via GitHub Actions (cron) vers un bucket S3 compatible (Cloudflare R2, free tier généreux), chiffré. Externaliser les backups d'un service managé est un bon réflexe à montrer, sans nécessiter de serveur.

Ne pas envisager l'auto-hébergement de Supabase ni la sortie vers un Postgres/auth applicative dans ce projet : les deux impliquent de la gestion d'infra ou une réécriture lourde de `src/lib/supabase/` et des policies RLS, pour un gain de signal DevOps faible par rapport à l'effort — exactement le type de scope que ce projet met de côté.

---

## 6. Coût total estimé

| Poste | Coût |
| --- | --- |
| Domaine polyrank.fr | ~7 €/an |
| Bucket S3 backups (Cloudflare R2) | ~0 €/mois (free tier) |
| Supabase, Sentry, GitHub Actions, Vercel, Uptime Kuma/Better Stack | 0 € (free tiers) |
| **Total** | **~0,60 €/mois** |

Argument de README : "CI complète, tests, sécurité supply-chain, observabilité et backups, pour moins d'1 €/mois" — un signal de rigueur plutôt que de moyens.
