# PolyRank — Décisions projet

> **Domaine** — PolyRank classe des **jeux (à boire)** entre étudiants, pas des sports physiques. Au lancement : **FifaChamp** et **CoinCoin**.
>
> ⚠️ **Jeux d'alcool — réservés aux +18 ans.** L'inscription exige une confirmation de majorité et affiche un message de prévention : « L'abus d'alcool est dangereux pour la santé, à consommer avec modération ».

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

#### Inscription — champs & garde-fous

Après l'email (OTP), l'utilisateur complète son profil :

- **Pseudo** (public) — affiché partout. ⚠️ On l'invite explicitement à **éviter ses nom/prénom** puisque c'est public.
- **École** — parmi les 16 du réseau Polytech (Angers, Annecy-Chambéry, Clermont, Dijon, Grenoble, Lille, Lyon, Marseille, Montpellier, Nancy, Nantes, Nice Sophia, Orléans, Paris-Saclay, Sorbonne, Tours) **ou** « Exté » (extérieur au réseau).
- **Année** — obligatoire **si une école est choisie** (pas pour les Exté) : `Peip1`, `Peip2`, `3A`, `4A`, `5A`, ou `Vieux con` (anciens).
- **Majorité** — case obligatoire « J'ai plus de 18 ans ».
- **Prévention alcool** — message de modération affiché (cf. encart en tête).

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

### ✅ Tâche 2 : Jeux & formats de matchs

Au lancement, **2 jeux** seulement :

| Jeu | Description |
|---|---|
| **FifaChamp** | Tournoi sur le jeu vidéo FIFA |
| **CoinCoin** | Jeu à boire |

**Format** (par match, pas par jeu) : chaque jeu se joue en **1v1** ou **2v2** ; le **1v2** est possible mais rare.

**Score** : un match se joue en plusieurs **manches**. Le joueur indique le **nombre de manches** ; on enregistre les manches gagnées par chaque camp (`manches_a` / `manches_b`), d'où `winner_side` (`A` / `B`). *(Modèle provisoire — à affiner avec les prochains points du parcours.)*

> Système de points de classement (Elo, points V/D…) : tranché en **Phase 4**, basé sur `winner_side`.

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
| `/inscription` | Complétion du profil après 1ère connexion (pseudo, école, année, +18) | Connecté, profil incomplet |
| `/classement` | Leaderboard, filtres par jeu et par école | Public |
| `/matchs` | Historique des matchs, filtrable | Public |
| `/matchs/nouveau` | Formulaire de saisie d'un match | Élève connecté |
| `/matchs/[id]` | Détail d'un match : valider / contester / modifier | Public (actions selon rôle) |
| `/joueurs/[id]` | Profil public d'un joueur + stats | Public |
| `/profil` | Mon profil (édition) | Connecté |
| `/admin` | Back-office : comptes, matchs litigieux | Admin |

**Navigation responsive :**
- **Mobile** : barre de navigation fixe en bas — Accueil · Classement · ➕ Match · Profil.
- **Desktop** : barre de navigation en haut.