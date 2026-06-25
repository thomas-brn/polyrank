# Schéma base de données — PolyRank

Source de vérité : `supabase/migrations/` (appliquer dans l'ordre numérique).

---

## Tables

### `schools`
Référentiel des écoles. Inclut "Exté" (slug `exte`) — l'école de rattachement des joueurs externes au réseau. Prévu pour accueillir une colonne `color` (couleur par école).

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text unique | Ex. `"Grenoble"`, `"Angers"` (sans préfixe — migration 0008) |
| `slug` | text unique | Ex. `"grenoble"` — utilisé dans les URLs |
| `created_at` | timestamptz | |

---

### `profiles`
Une ligne par utilisateur Supabase. Créée automatiquement au signup via trigger, complétée à l'onboarding.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | FK → `auth.users` |
| `email` | text | **Non exposé aux clients** (privilège colonne révoqué pour anon/authenticated). Lisible seulement via `service_role`. L'app lit l'email via `auth.getUser()`, jamais depuis cette table |
| `pseudo` | text | Public, unique (insensible à la casse). Max: lettres/chiffres/-/_ |
| `pseudo_changed_at` | timestamptz | Limite : 1 changement par mois |
| `school_id` | uuid | FK → `schools`. Pointe vers l'école "Exté" (slug `exte`) pour les externes |
| `annee` | text | `PEIP1`, `PEIP2`, `3A`, `4A`, `5A`, `VIEUX_CON`. `null` pour les Exté |
| `avatar_url` | text | |
| `is_admin` | boolean | Rôle admin — pas de flux d'inscription séparé, positionné manuellement en DB |
| `created_at` | timestamptz | |

Index : `lower(pseudo)` unique (partiel sur `pseudo is not null`).

---

### `pseudo_history`
Historique des anciens pseudos d'un profil.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `profile_id` | uuid | FK → `profiles` (cascade delete) |
| `pseudo` | text | Ancien pseudo |
| `changed_at` | timestamptz | |

---

### `games`
Jeux disponibles. Géré par les admins.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text unique | Ex. `"FifaChamp"` |
| `slug` | text unique | Ex. `"fifachamp"` |
| `has_score` | boolean | `true` = score chiffré par camp (FifaChamp) ; `false` = vainqueur seul (CoinCoin) |
| `rules` | text | Règles en markdown |
| `is_active` | boolean | |
| `created_at` | timestamptz | |

Seeds : `FifaChamp` (has_score=true), `CoinCoin` (has_score=false).

---

### `matches`

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `game_id` | uuid | FK → `games` |
| `created_by` | uuid | FK → `profiles` |
| `format` | text | Regex `^[1-4]V[1-4]$` — ex. `"1V1"`, `"2V2"` |
| `played_at` | timestamptz | |
| `location` | text | |
| `status` | text | Cycle de vie (voir ci-dessous) |
| `winner_side` | text | `A`, `B`, ou `NUL` |
| `score_a` / `score_b` | int | Score chiffré, `null` pour les jeux sans score |
| `stats` | jsonb | Infos additionnelles extensibles |
| `side_a_label` / `side_b_label` | text | Libellé libre par camp |
| `created_at` / `updated_at` | timestamptz | `updated_at` mis à jour automatiquement par trigger |

**Cycle de vie du statut :**
```
SOUMIS → VALIDE
SOUMIS → MODIFIE → REVALIDE
SOUMIS ou MODIFIE → CONTESTE (admin arbitre)
```

---

### `match_participants`
Joueurs d'un match (tagués avec compte ou invités sans compte).

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `match_id` | uuid | FK → `matches` (cascade delete) |
| `side` | text | `A` ou `B` |
| `profile_id` | uuid | FK → `profiles`. `null` si invité |
| `guest_name` | text | Nom libre si pas de compte. `null` si profil lié |
| `is_creator` | boolean | |
| `created_at` | timestamptz | |

Contrainte : `profile_id` ou `guest_name` doit être non-null.

---

### `match_events`
Journal d'audit du cycle de vie des matchs.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `match_id` | uuid | FK → `matches` (cascade delete) |
| `actor_id` | uuid | FK → `profiles` |
| `type` | text | `SOUMISSION`, `VALIDATION`, `MODIFICATION`, `CONTESTATION`, `REVALIDATION`, `ARBITRAGE_ADMIN` |
| `note` | text | |
| `created_at` | timestamptz | |

---

## Fonctions & triggers

| Nom | Type | Rôle |
|---|---|---|
| `handle_new_user()` | trigger (after insert on `auth.users`) | Crée automatiquement un `profiles` vide au signup |
| `set_updated_at()` | trigger (before update on `matches`) | Met à jour `matches.updated_at` |
| `validate_match(p_match_id)` | RPC (security definer) | Valide un match côté adverse ; gère `SOUMIS→VALIDE` et `MODIFIE→REVALIDE` |
| `is_admin()` | fonction stable (security definer) | Utilisée dans les policies RLS |

---

## RLS — résumé des permissions

| Table | Lecture | Écriture |
|---|---|---|
| `schools` | publique | admin |
| `profiles` | publique au niveau ligne, **sauf colonne `email`** (privilège colonne révoqué pour anon/authenticated — voir migration `0007`) | soi-même ou admin |
| `pseudo_history` | publique | soi-même (insert) |
| `games` | publique | admin |
| `matches` | publique | créateur (insert/update/delete) ou admin |
| `match_participants` | publique | créateur du match ou admin |
| `match_events` | publique | acteur concerné (insert) ou admin |

> Note : la RLS agit au niveau ligne. Pour masquer une colonne précise (`profiles.email`) on utilise les privilèges au niveau colonne (`GRANT SELECT (cols)`), pas une policy.
