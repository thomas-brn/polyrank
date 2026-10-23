# PolyRank

**Le classement Elo des jeux entre élèves ingénieurs.**

PolyRank permet aux étudiants du réseau Polytech de saisir leurs résultats en
fin de partie, depuis leur téléphone, et de suivre leur classement Elo par jeu,
par format et par école.

Deux jeux au lancement : **FifaChamp** (score et statistiques détaillées) et
**CoinCoin** (victoire ou défaite).

<!-- TODO captures mobiles : accueil, classement, saisie d'un match, profil -->

## Fonctionnalités

### Saisie des matchs

- Formats libres de 1v1 à 4v4, y compris asymétriques (1v2, 2v1…).
- Participants tagués par leur compte, ou ajoutés comme invités par simple nom.
- Score et statistiques détaillées pour FifaChamp (buts, cartons, blessures,
  retournées, coups francs directs), saisie rapide par défaut.
- Matchs amicaux : visibles dans l'historique, sans effet sur l'Elo.

### Validation et litiges

Un match est **validé dès sa création** et l'Elo est appliqué immédiatement.
Les adversaires gardent un droit de regard :

```
VALIDÉ (à la création)                   → Elo appliqué
  ├─ le créateur modifie son match        → Elo recalculé
  ├─ un adversaire conteste → CONTESTÉ    → correction proposée, Elo inchangé
  │     ├─ le créateur accepte            → correction appliquée, Elo recalculé
  │     └─ le créateur refuse → EN APPEL  → arbitrage admin
  └─ un adversaire demande la suppression → EN APPEL → arbitrage admin
```

Règle d'or : l'Elo ne bouge que si un match est modifié ou supprimé. Une
contestation seule ne change rien. Les admins tranchent les appels depuis un
back-office dédié.

### Classements

- Quatre classements par jeu : **Global** (tous les matchs), **1v1**,
  **2v2 par duo** (la paire est notée comme une entité propre) et **Villes**
  (score agrégé des meilleurs joueurs et duos de chaque école).
- Filtres par école et par promo, seuil minimum de matchs pour écarter les
  comptes fantômes.
- Page pédagogique qui explique le calcul, formules à l'appui. Le détail du
  moteur est décrit dans [`docs/ELO.md`](docs/ELO.md).

### Joueurs

- Profil public : Elo et rang sur chaque classement, record personnel, courbes
  d'évolution, moyennes par match, partenaire et rivaux les plus fréquents,
  historique des matchs, anciens pseudos. Filtrable par format et par période.
- **Comparaison** de deux joueurs : Elo en vis-à-vis, courbes superposées,
  radar de statistiques et bilan de leurs confrontations directes. Les deux
  joueurs sont dans l'URL, une comparaison se partage.
- Recherche de joueurs, historique global des matchs.

### Comptes

- Connexion **sans mot de passe**, par code OTP reçu par email.
- Inscription en quelques champs : pseudo public unique, école, année.
- Les joueurs déjà présents dans l'historique importé **réclament leur
  profil** à l'inscription et retrouvent tous leurs matchs.
- Pseudo modifiable une fois par mois, anciens pseudos conservés.
- Avertissement quand l'app est ouverte dans le navigateur intégré d'Instagram
  ou Messenger, où l'envoi du code OTP échoue.

## Sous le capot

- **Moteur Elo en SQL.** Le calcul vit dans une fonction PostgreSQL qui rejoue
  tout l'historique dans l'ordre chronologique. L'état des classements est
  donc toujours le résultat déterministe des matchs : modifier ou supprimer un
  match ancien suffit à tout remettre d'aplomb. Spécification complète :
  [`docs/ELO.md`](docs/ELO.md).
- **Sécurité au plus près de la donnée.** Row-Level Security sur toutes les
  tables, actions sensibles (contestation, arbitrage, réclamation de profil)
  exposées sous forme de fonctions RPC qui vérifient les droits côté base.
  L'email des joueurs n'est pas lisible par les clients.
- **Mobile d'abord.** Les scores se saisissent au bout de la table, juste après
  la partie : navigation en barre basse sur mobile, en barre haute sur desktop.
- **Rendu serveur et streaming.** React Server Components, Server Actions,
  squelettes de chargement via Suspense, requêtes dédupliquées avec
  `React.cache()`.
- **Thème par jeu.** Le jeu actif pilote à la fois les données affichées et la
  couleur de l'interface.

## Stack

| Couche          | Choix                                                     |
| --------------- | --------------------------------------------------------- |
| Framework       | Next.js 16 (App Router, TypeScript), React 19             |
| Style           | Tailwind CSS v4                                           |
| Base de données | PostgreSQL via Supabase, RLS, fonctions PL/pgSQL          |
| Authentification| Supabase Auth, OTP par email                              |
| Graphiques      | SVG maison (courbes Elo, radar), KaTeX pour les formules  |
| Outillage       | mise (Node 22), ESLint, GitHub Actions (lint + build)     |
| Hébergement     | Vercel + Supabase Cloud                                   |

## Démarrage local

```bash
mise install                 # Node 22
npm install
cp .env.example .env.local   # renseigner l'URL et la clé anon Supabase
npm run dev                  # http://localhost:3000
```

Sans Supabase configuré, l'application démarre quand même : les pages
s'affichent, l'authentification est désactivée. Le schéma de la base n'est pas
publié dans ce dépôt.

| Commande        | Rôle                          |
| --------------- | ----------------------------- |
| `npm run dev`   | Serveur de développement      |
| `npm run build` | Build de production (typage)  |
| `npm start`     | Lancer le build de production |
| `npm run lint`  | ESLint                        |

## Structure

```
src/
  app/                  routes (App Router)
    classement/         classements et page d'explication de l'Elo
    matchs/             historique, saisie, détail, modification, contestation
    joueurs/[id]/       profil public
    comparaison/        comparaison de deux joueurs
    profil/             mon profil
    inscription/        onboarding et réclamation d'un profil existant
    login/              connexion par code OTP
    admin/              arbitrage des matchs en appel
  components/           UI partagée (navigation, cartes de match, graphiques…)
  lib/                  clients Supabase, jeu actif, utilitaires
  proxy.ts              rafraîchissement de session (ex-middleware Next.js)
```

Conventions de branches et de commits : [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Statut

Projet personnel en cours de développement, utilisé par des élèves du réseau
Polytech. Prochaine grande étape : les tournois (poules, arbres, BO3/BO5).

Le code est consultable mais n'est pas sous licence libre : tous droits
réservés.
