# Polytech Sports Tracker — Décisions projet

## Phase 1 — Cadrage & architecture

### ✅ Tâche 1 : Rôles utilisateurs

#### Rôles

Deux rôles uniquement, pas de rôle "capitaine".

| | Élève | Admin |
|---|---|---|
| Inscription | Email + promo, ouvert à tous | Idem + flag `is_admin` en BDD |
| Connexion | Email → code OTP reçu par mail | Idem |
| Soumettre un score | ✅ | ✅ |
| Modifier un match non validé | ✅ (créateur uniquement) | ✅ |
| Modifier un match validé | ✅ (créateur, mais re-validation requise) | ✅ |
| Valider un score adverse | ✅ | ✅ |
| Contester un score | ✅ | ✅ |
| Supprimer/corriger un match litigieux | ❌ | ✅ |
| Gérer les comptes | ❌ | ✅ |

#### Authentification

- Connexion par **code OTP envoyé par email** (pas de mot de passe)
- Inscription **ouverte** (pas de code d'invitation pour l'instant)
- Champs à l'inscription : email, promo/classe

#### Cycle de vie d'un match

```
SOUMIS → VALIDÉ
           ↓ (si modification par le créateur)
        MODIFIÉ → RE-VALIDÉ
           ↓ (si refus par un adversaire)
        CONTESTÉ → intervention admin
```

- **Soumis** : créé par un élève, pas encore confirmé. Modifiable librement par le créateur.
- **Validé** : confirmé par n'importe quel joueur adverse tagué dans le match.
- **Modifié** : le créateur modifie un match déjà validé → repasse en attente de validation.
- **Re-validé** : confirmé par n'importe quel joueur adverse tagué (pas forcément le même qu'à l'origine).
- **Contesté** : un adversaire refuse le score → l'admin tranche.

#### Participants d'un match

- Un seul joueur suffit pour soumettre un match
- Il peut tagger les autres participants s'ils ont un compte
- Si un participant n'a pas de compte, son nom peut être renseigné à titre informatif (pas lié à un profil)
- La validation doit venir d'un joueur tagué côté adverse

---

### ✅ Tâche 2 : Sports & formats de matchs

#### Modèle générique

Plutôt que de coder chaque sport en dur, un sport est décrit par deux axes :

- **`participant_mode`** : `INDIVIDUEL` (1 joueur par côté, ex. ping-pong simple) ou `EQUIPE` (plusieurs joueurs). Le mode « double » (2v2) est géré comme une équipe de taille 2.
- **`scoring_type`** :
  - `SCORE_SIMPLE` : un score entier par côté (`score_a`, `score_b`). Vainqueur = score le plus élevé. Nul possible.
  - `SETS` : plusieurs manches, chacune avec un score par côté (stocké en JSON). Vainqueur = plus de sets gagnés.

#### Liste de départ (modifiable par un admin)

| Sport | Mode | Format de score | Vainqueur |
|---|---|---|---|
| Football | Équipe | Score simple (buts) | Plus de buts (nul possible) |
| Basketball | Équipe | Score simple (points) | Plus de points |
| Handball | Équipe | Score simple (buts) | Plus de buts |
| Volleyball | Équipe | Sets (BO3/BO5, 25 pts) | Plus de sets |
| Tennis de table | Individuel / Double | Sets (BO5, 11 pts) | Plus de sets |
| Badminton | Individuel / Double | Sets (BO3, 21 pts) | Plus de sets |
| Tennis | Individuel / Double | Sets (jeux) | Plus de sets |

> Le système de points de classement (Elo, points victoire/défaite…) est tranché en **Phase 4** ; il s'appuiera sur `winner_side` (`A` / `B` / `NUL`) calculé à la validation.

---

### ✅ Tâche 3 : Stack technique

| Couche | Choix | Pourquoi |
|---|---|---|
| Framework | **Next.js (App Router, TypeScript)** | Full-stack dans un seul repo, standard de l'industrie, très documenté |
| UI / style | **Tailwind CSS** (mobile-first) | Responsive garanti dès le départ (cible = navigateur mobile) |
| Base de données | **PostgreSQL** (via Supabase) | Vrai SQL, robuste, bon pour monter en compétence |
| Auth | **Supabase Auth — OTP email** | Correspond exactement à l'auth décidée (Tâche 1), clé en main |
| Stockage fichiers | **Supabase Storage** | Photos de profil |
| Sécurité données | **Row-Level Security (RLS)** Postgres | Règles d'accès au plus près de la donnée |
| Migrations | **Fichiers SQL versionnés** (`supabase/migrations`) | Schéma reproductible, bonne pratique DevOps |
| Versions runtime | **mise** | Node épinglé via `mise.toml` |
| Hébergement | **Vercel** (app) + **Supabase Cloud** (BDD/auth) | Gratuit, HTTPS auto, déploiement simple |
| Domaine | **polyrank.fr** | À brancher sur Vercel le moment venu |

> Piste DevOps ultérieure : self-hosting Supabase via Docker + CI/CD pour l'apprentissage.

---

### ✅ Tâche 4 : Architecture des pages

| Route | Page | Accès |
|---|---|---|
| `/` | Accueil — aperçu du classement + accès rapide saisie | Public |
| `/login` | Saisie de l'email → envoi du code OTP | Public |
| `/login/verifier` | Saisie du code OTP reçu par mail | Public |
| `/classement` | Leaderboard, filtres par sport et par promo | Public |
| `/matchs` | Historique des matchs, filtrable | Public |
| `/matchs/nouveau` | Formulaire de saisie d'un match | Élève connecté |
| `/matchs/[id]` | Détail d'un match : valider / contester / modifier | Public (actions selon rôle) |
| `/joueurs/[id]` | Profil public d'un joueur + stats | Public |
| `/profil` | Mon profil (édition) | Connecté |
| `/admin` | Back-office : comptes, matchs litigieux | Admin |

**Navigation responsive :**
- **Mobile** : barre de navigation fixe en bas — Accueil · Classement · ➕ Match · Profil.
- **Desktop** : barre de navigation en haut.