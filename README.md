# PolyRank

Application web de suivi des résultats sportifs pour élèves ingénieurs : saisie
des matchs, validation entre joueurs, et classements par sport et par promo.

Futur domaine : **polyrank.fr**

## Stack

- **Next.js 16** (App Router, TypeScript) + **React 19**
- **Tailwind CSS v4** (mobile-first, 100 % responsive)
- **Supabase** : PostgreSQL + Auth (OTP par email) + Storage
- **mise** pour la version de Node (22)
- Déploiement visé : **Vercel** (app) + **Supabase Cloud** (BDD/auth)

Décisions d'architecture détaillées dans [`docs/DECISIONS.md`](docs/DECISIONS.md),
plan projet dans [`docs/plan.md`](docs/plan.md).

Conventions de branches, de commits et de merge : [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Démarrage local

```bash
# 1. Installer la bonne version de Node (via mise)
mise install

# 2. Installer les dépendances
npm install

# 3. Configurer Supabase (voir section ci-dessous), puis :
cp .env.example .env.local   # et remplir les valeurs

# 4. Lancer le serveur de dev
npm run dev
```

Ouvre http://localhost:3000. **L'app démarre même sans Supabase configuré** :
les pages publiques s'affichent, seules les fonctions d'authentification sont
désactivées tant que `.env.local` n'est pas rempli.

## Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Dans **Project Settings → API**, copier l'**URL** et la clé **anon public**
   dans `.env.local` :
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
3. Appliquer le schéma : copier-coller le contenu de
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) dans
   l'éditeur SQL Supabase (ou via la Supabase CLI : `supabase db push`).
4. **Auth → Email** : pour recevoir un **code OTP** (et pas seulement un lien
   magique), s'assurer que le template d'email « Magic Link » contient le jeton
   `{{ .Token }}`.

## Scripts

| Commande        | Rôle                              |
| --------------- | --------------------------------- |
| `npm run dev`   | Serveur de développement          |
| `npm run build` | Build de production               |
| `npm start`     | Lancer le build de production     |
| `npm run lint`  | ESLint                            |

## Structure

```
src/
  app/                 # routes (App Router)
    page.tsx           # accueil
    login/             # connexion OTP (email → code)
    classement/        # leaderboard (à venir)
    matchs/            # historique + saisie (à venir)
    profil/            # profil utilisateur
    admin/             # back-office (à venir)
  components/          # composants partagés (navigation, etc.)
  lib/supabase/        # clients Supabase (navigateur / serveur / proxy)
  proxy.ts             # rafraîchissement de session (ex-« middleware »)
supabase/migrations/   # schéma SQL versionné
docs/                  # décisions & plan projet
```

## Déploiement (à venir)

Le déploiement sur Vercel et le branchement du domaine `polyrank.fr` seront
documentés ici le moment venu.
