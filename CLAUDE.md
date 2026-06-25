# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git conventions

Never add a `Co-Authored-By: Claude` trailer to commit messages.

## Project overview

**PolyRank**, a web app for engineering school students to submit match results and view leaderboards, organized by sport and by cohort (promo/classe). Future domain: **polyrank.fr**.

Phase 1 (cadrage & architecture) is complete and the app is scaffolded. Most features are still placeholder pages, built out in later phases.

## Tech stack

- **Next.js 16** (App Router, TypeScript) + **React 19**
- **Tailwind CSS v4** (mobile-first; the primary target is mobile browsers, so keep everything responsive)
- **Supabase**: PostgreSQL + Auth (email OTP) + Storage
- **mise** manages the Node version (22) — run tooling via `mise exec -- <cmd>` when the shell isn't mise-activated
- Deploy target: **Vercel** (app) + **Supabase Cloud** (DB/auth)

### Next.js 16 gotchas

- **Middleware is renamed to `proxy`**: the convention file is `src/proxy.ts` exporting a `proxy` function (not `middleware`). Runtime is nodejs (no edge). See `AGENTS.md`.
- Turbopack is the default for `next dev`/`next build`.
- `next lint` is removed — use `npm run lint` (ESLint flat config in `eslint.config.mjs`).
- Async request APIs are enforced: `cookies()`, `headers()`, `params`, `searchParams` must be awaited.

## Development

```bash
mise install        # Node 22
npm install
cp .env.example .env.local   # then fill Supabase keys (app runs without them; auth is disabled)
npm run dev         # http://localhost:3000
npm run build       # production build (also type-checks)
npm run lint
```

### Code structure

- `src/app/` — routes (App Router). `login/` holds the OTP flow; `classement/`, `matchs/`, `profil/`, `admin/` are placeholders.
- `src/components/` — shared UI (`site-nav` = responsive top/bottom nav, `page-header`).
- `src/lib/supabase/` — `client.ts` (browser), `server.ts` (RSC/actions), `middleware.ts` (`updateSession` helper used by `proxy.ts`), `config.ts` (`isSupabaseConfigured` guard).
- `supabase/migrations/` — versioned SQL schema (apply via Supabase SQL editor or `supabase db push`).
- `docs/SCHEMA.md` — **current DB schema reference** (tables, columns, relations, RLS, functions). Read this before touching the database or writing queries.
- `docs/` — `DECISIONS.md` (architecture decisions), `plan.md` / `plan.html` (project plan).

## Architecture decisions (see docs/DECISIONS.md)

### User roles

Two roles only: **Élève** (student) and **Admin**.

- Authentication: **OTP by email** — no password. Registration is open (email + promo/class).
- Admins are flagged via `is_admin` in the DB, not a separate registration flow.

### Match lifecycle

```
SOUMIS → VALIDÉ
                ↓ (if creator modifies a validated match)
             MODIFIÉ → RE-VALIDÉ
                ↓ (if an opponent contests)
             CONTESTÉ → admin intervenes
```

- **SOUMIS**: created by a student; freely editable by the creator.
- **VALIDÉ**: confirmed by any tagged opposing player.
- **MODIFIÉ**: a validated match edited by its creator reverts to pending validation.
- **RE-VALIDÉ**: re-confirmed by any tagged opposing player (not necessarily the original).
- **CONTESTÉ**: an opponent rejects the score; admin arbitrates and can delete/correct.

### Match participants

- A single player can submit a match.
- Other participants can be tagged if they have an account, or listed by name (informational, unlinked to a profile).
- Validation must come from a tagged player on the **opposing** side.

### Permissions summary


| Action                          | Élève                               | Admin |
| ------------------------------- | ----------------------------------- | ----- |
| Submit a score                  | ✅                                   | ✅     |
| Edit an unvalidated match       | ✅ (creator only)                    | ✅     |
| Edit a validated match          | ✅ (creator, triggers re-validation) | ✅     |
| Validate an opponent's score    | ✅                                   | ✅     |
| Contest a score                 | ✅                                   | ✅     |
| Delete/correct a disputed match | ❌                                   | ✅     |
| Manage accounts                 | ❌                                   | ✅     |


## Project plan (see docs/plan.md)

5 phases, 21 tasks, ~8 weeks total:

1. **Phase 1 — Cadrage & architecture** ✅ (complete): user roles, sports/match formats, tech stack, page structure
2. **Phase 2 — Authentication** (~1 week): OTP auth, student profiles, session management
3. **Phase 3 — Match entry & validation** (~2 weeks): submission form, validation system, notifications, contest/edit flow, match history
4. **Phase 4 — Leaderboards & stats** (~2 weeks): ranking metrics (points/Elo TBD), global leaderboard, per-promo filter, player profile/stats page
5. **Phase 5 — Admin & deployment** (~2 weeks): admin UI, mobile responsiveness, rate limiting/anti-cheat, deployment, beta test

