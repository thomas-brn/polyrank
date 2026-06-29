# PolyRank — Décisions projet

> **Domaine** — PolyRank classe des **jeux (à boire)** entre étudiants, pas des sports physiques. Au lancement : **FifaChamp** et **CoinCoin**.

## Phase 1 — Cadrage & architecture

### ✅ Tâche 1 : Rôles utilisateurs

#### Rôles

Deux rôles uniquement, pas de rôle "capitaine".

| | Élève | Admin |
|---|---|---|
| Inscription | Email + promo, ouvert à tous | Idem + flag `is_admin` en BDD |
| Connexion | Email → code OTP reçu par mail | Idem |
| Soumettre un score (validé automatiquement) | ✅ | ✅ |
| Modifier son propre match (→ recalcul Elo) | ✅ (créateur) | ✅ |
| Contester un match | ✅ (adversaire tagué) | ✅ |
| Accepter / refuser une contestation sur son match | ✅ (créateur) | ✅ |
| Faire appel à l'admin (preuve par mail) | ✅ (créateur) | — |
| Arbitrer / corriger / supprimer un match contesté | ❌ | ✅ |
| Gérer les comptes | ❌ | ✅ |

#### Authentification

- Connexion par **code OTP envoyé par email** (pas de mot de passe)
- Inscription **ouverte** (pas de code d'invitation pour l'instant)

#### Inscription — champs & garde-fous

Après l'email (OTP), l'utilisateur complète son profil :

- **Pseudo** (public) — affiché partout. ⚠️ On l'invite explicitement à **éviter ses nom/prénom** puisque c'est public.
- **École** — parmi les 16 du réseau (Angers, Annecy, Chambéry, Clermont, Dijon, Grenoble, Lille, Lyon, Marseille, Montpellier, Nancy, Nantes, Nice Sophia, Orléans, Paris-Saclay, Sorbonne, Tours, Gavy, Le Creusot) **ou** « Exté » (extérieur au réseau).
- **Année** — obligatoire **si une école est choisie** (pas pour les Exté) : `Peip1`, `Peip2`, `3A`, `4A`, `5A`, ou `Vieux con` (anciens).
- **Majorité** — case obligatoire « J'ai plus de 18 ans ».
- **Prévention alcool** : message de modération affiché (cf. encart en tête).

#### Profil joueur (consultation & édition)

- **Pseudo unique** (insensible à la casse) ; disponibilité vérifiée en direct à la saisie.
- L'utilisateur peut modifier **école, année et pseudo**. Le **pseudo est limité à 1 changement par mois** ; les anciens pseudos sont historisés.
- Les matchs référencent l'**`id`** du compte (pas le pseudo) : un changement de pseudo se répercute partout automatiquement.
- **Recherche de joueurs** (barre dans le Classement) menant au **profil public** `/joueurs/[id]` : stats (matchs par jeu, victoires, école, année, coéquipiers les plus fréquents) et anciens pseudos (champ dépliable sous le pseudo actuel).
- **Anti-doublon** : un même joueur ne peut pas être ajouté deux fois dans un match.

#### Cycle de vie d'un match

> 🔄 **Révision (post-Phase 1).** Le flux initial « SOUMIS → en attente de validation par l'adversaire » est abandonné au profit d'une **validation automatique**. Raison : l'Elo se calcule **dès la fin du match** et ne peut pas attendre une validation manuelle. Détail du calcul dans `docs/ELO.md`.

```
VALIDÉ (auto à la création)              → Elo appliqué immédiatement
   │
   ├─ le créateur modifie son match ───────────────→ Elo recalculé
   │
   └─ un adversaire CONTESTE → CONTESTÉ   (Elo inchangé)
         │
         ├─ le créateur accepte → match corrigé/supprimé → Elo recalculé
         └─ le créateur refuse → EN APPEL : formulaire in-app (message + photo)
               → l'app envoie un mail à arbitre@polyrank.fr (infos du match + photo)
               │
               ├─ l'admin corrige / supprime ─────→ Elo recalculé
               └─ l'admin confirme l'original ────→ aucun changement
```

- **Validé (auto)** : tout match est validé dès sa création. L'Elo des joueurs est mis à jour immédiatement (présomption de validité).
- **Modifié par le créateur** : le créateur peut corriger son propre match ; l'Elo est recalculé. Pas de re-validation par l'adversaire.
- **Contesté** : un joueur tagué côté adverse refuse le score. Le match passe en CONTESTÉ, mais **l'Elo ne bouge pas** tant que le litige n'est pas tranché.
- **Résolution** : c'est au **créateur** d'accepter ou de refuser la contestation.
  - S'il accepte → il corrige ou supprime le match → l'Elo est recalculé.
  - S'il refuse → il **fait appel depuis l'app** : un formulaire lui permet de joindre un message et une **photo du tableau final**. L'application **envoie alors automatiquement un mail à arbitre@polyrank.fr** contenant les informations du match et la photo. Le match passe en EN APPEL.
- **Arbitrage admin** : l'admin tranche. S'il corrige ou supprime le match, l'Elo est recalculé ; s'il confirme le résultat d'origine, rien ne change.

**Règle d'or** : l'Elo ne change **que** si le match est **modifié ou supprimé**. Une contestation, à elle seule, ne modifie jamais l'Elo.

> **Implémentation de l'appel** : interface entièrement dans l'app. La photo est stockée dans **Supabase Storage** ; l'envoi du mail à `arbitre@polyrank.fr` (infos + photo en pièce jointe ou lien signé) passe par un service d'email transactionnel appelé côté serveur (Server Action / route Next.js). Provider à confirmer (recommandation : **Resend**, qui s'intègre bien avec Next.js/Vercel). Un enregistrement de l'appel est conservé (table dédiée `match_appeals` : match, auteur, message, photo, date d'envoi).

#### Participants d'un match

- Un seul joueur suffit pour soumettre un match
- Il peut tagger les autres participants s'ils ont un compte
- Si un participant n'a pas de compte, son nom peut être renseigné à titre informatif (pas lié à un profil)
- Seul un joueur tagué côté adverse peut **contester** le match (il n'y a plus de validation manuelle : le match est validé automatiquement)

---

### ✅ Tâche 2 : Jeux & formats de matchs

Au lancement, **2 jeux** seulement :

| Jeu | Score chiffré ? | Résultat enregistré |
|---|---|---|
| **FifaChamp** | ✅ (buts) | score par camp + vainqueur |
| **CoinCoin** | ❌ | vainqueur / perdant seulement |

**Format** (par match) : nombre de joueurs libre, **jusqu'à 4 par camp** (1v1, 2v2, 1v2, 3v3…), saisi en ajoutant les participants. Stocké en `format` (ex. `2V2`).

**Une seule manche par match** (pas de manches multiples).

**Résultat minimal** : pour l'instant on ne note que **les gagnants et les perdants** (+ le score pour les jeux à score). Le **calcul du classement** (points/Elo) viendra plus tard.

**Extensibilité** : le modèle prévoit d'ajouter plus d'infos/stats par match **sans migration** (colonne `stats` JSONB). UX visée : saisie **rapide** d'un résultat, avec une **option « ajouter plus de stats »** pour qui le souhaite.

**Règles** : un bouton « Règles » renvoie vers la page de règles de chaque jeu (contenu rédigé plus tard — champ `rules` sur `games`).

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
| `/regles/[jeu]` | Règles d'un jeu (bouton « Règles ») | Public |
| `/joueurs/[id]` | Profil public d'un joueur + stats | Public |
| `/profil` | Mon profil (édition) | Connecté |
| `/admin` | Back-office : comptes, matchs litigieux | Admin |

**Navigation responsive :**
- **Mobile** : barre de navigation fixe en bas — Accueil · Classement · ➕ Match · Profil.
- **Desktop** : barre de navigation en haut.