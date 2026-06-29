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
| `status` | text | `VALIDE` (défaut), `CONTESTE`, `EN_APPEL`. Voir cycle de vie ci-dessous |
| `winner_side` | text | `A`, `B`, ou `NUL` |
| `score_a` / `score_b` | int | Score chiffré, `null` pour les jeux sans score |
| `stats` | jsonb | Infos additionnelles extensibles |
| `proposed_changes` | jsonb | Correction proposée par l'adversaire (CONTESTE) ou demande de suppression (`{"action":"DELETE","reason":...}` en EN_APPEL). `null` hors litige |
| `side_a_label` / `side_b_label` | text | Libellé libre par camp |
| `created_at` / `updated_at` | timestamptz | `updated_at` mis à jour automatiquement par trigger |

**Cycle de vie du statut (validation automatique) :**
```
VALIDE (auto à la création)            → Elo appliqué immédiatement
  ├─ créateur modifie son match        → reste VALIDE (Elo recalculé)
  ├─ adversaire conteste → CONTESTE    → correction proposée stockée dans proposed_changes
  │     ├─ créateur accepte            → applique la correction (Elo recalculé)
  │     └─ créateur refuse → EN_APPEL  → admin arbitre (supprime ou rétablit)
  └─ adversaire demande la suppression → EN_APPEL  → admin tranche (supprime ou rétablit)
        (motif stocké dans proposed_changes.reason)
```
Seul un joueur tagué côté **adverse** peut contester ou demander la suppression.
L'Elo ne change que si le match est modifié ou supprimé. Voir `docs/ELO.md` et `docs/DECISIONS.md`.

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
| `type` | text | `SOUMISSION`, `VALIDATION`, `MODIFICATION`, `CONTESTATION`, `REVALIDATION`, `ARBITRAGE_ADMIN`, `DEMANDE_SUPPRESSION` |
| `note` | text | |
| `created_at` | timestamptz | |

---

### `player_ratings`
Note Elo par joueur, par jeu et par périmètre. Écrite uniquement par `recompute_ratings()`. Voir `docs/ELO.md`.

| Colonne | Type | Notes |
|---|---|---|
| `game_id` | uuid | FK → `games` (clé primaire composite) |
| `profile_id` | uuid | FK → `profiles` (clé primaire composite) |
| `scope` | text | `GLOBAL` (tous les matchs) ou `1V1` (clé primaire composite) |
| `rating` | numeric(8,2) | Elo, défaut 1000 |
| `played` / `won` / `lost` | int | Compteurs |
| `updated_at` | timestamptz | |

Le « meilleur 2v2 » d'un joueur se dérive de `duo_ratings` (max sur ses duos).

---

### `duo_ratings`
Note Elo par duo (paire de joueurs) et par jeu, sur les matchs stricts 2v2. La paire est stockée triée (`profile_lo < profile_hi`). Écrite uniquement par `recompute_ratings()`.

| Colonne | Type | Notes |
|---|---|---|
| `game_id` | uuid | FK → `games` (clé primaire composite) |
| `profile_lo` / `profile_hi` | uuid | FK → `profiles`, paire triée (clé primaire composite) |
| `rating` | numeric(8,2) | Elo du duo, défaut 1000 |
| `played` / `won` / `lost` | int | Compteurs |
| `updated_at` | timestamptz | |

---

### `rating_history`
Série temporelle des notes Elo après chaque match, par joueur et par périmètre. Alimente la courbe d'évolution sur le profil. Écrite uniquement par `recompute_ratings()` (entièrement reconstruite à chaque appel). Voir `docs/ELO.md`.

| Colonne | Type | Notes |
|---|---|---|
| `id` | bigint PK | generated always as identity |
| `game_id` | uuid | FK → `games` |
| `profile_id` | uuid | FK → `profiles` (cascade delete) |
| `scope` | text | `GLOBAL` ou `1V1` |
| `match_id` | uuid | FK → `matches` (set null on delete) — match source |
| `rating` | numeric(8,2) | Note du joueur après ce match |
| `played_at` | timestamptz | Date du match (axe X de la courbe) |
| `created_at` | timestamptz | |

Index : `(game_id, profile_id, scope, played_at)`.

---

## Fonctions & triggers

| Nom | Type | Rôle |
|---|---|---|
| `handle_new_user()` | trigger (after insert on `auth.users`) | Crée automatiquement un `profiles` vide au signup |
| `set_updated_at()` | trigger (before update on `matches`) | Met à jour `matches.updated_at` |
| `recompute_ratings()` | RPC (security definer) | Recalcule toutes les notes (`player_ratings`, `duo_ratings`, `rating_history`) par rejeu chronologique (Elo K=40, départ 1000). Appelée par l'app après création / modification / suppression d'un match. Voir `docs/ELO.md` |
| `contest_match(match_id, proposed)` | RPC (security definer) | Adversaire tagué conteste un match VALIDE → CONTESTE, stocke la correction proposée |
| `accept_contest(match_id)` | RPC (security definer) | Créateur (ou admin) accepte la correction → applique `proposed_changes`, repasse en VALIDE |
| `refuse_contest(match_id)` | RPC (security definer) | Créateur (ou admin) refuse la contestation → EN_APPEL |
| `request_deletion(match_id, reason)` | RPC (security definer) | Adversaire tagué demande la suppression d'un match VALIDE → EN_APPEL, motif stocké |
| `approve_deletion(match_id)` | RPC (security definer, admin) | Admin approuve → supprime le match (cascade) |
| `reject_deletion(match_id)` | RPC (security definer, admin) | Admin rejette la demande/l'appel → rétablit le match en VALIDE |
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
| `player_ratings` | publique | aucune (écrites par `recompute_ratings()`, security definer) |
| `duo_ratings` | publique | aucune (écrites par `recompute_ratings()`, security definer) |
| `rating_history` | publique | aucune (écrite par `recompute_ratings()`, security definer) |

> Note : la RLS agit au niveau ligne. Pour masquer une colonne précise (`profiles.email`) on utilise les privilèges au niveau colonne (`GRANT SELECT (cols)`), pas une policy.
