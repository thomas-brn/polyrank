# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git conventions

Never add a `Co-Authored-By: Claude` trailer to commit messages.

## Project overview

**Polytech Sports Tracker** — a web app for engineering school students to submit match results and view leaderboards, organized by sport and by cohort (promo/classe).

The tech stack has not been decided yet (Phase 1, Task 3 is pending). No code exists yet; the repo is in the planning/architecture phase.

## Architecture decisions (see DECISIONS.md)

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

| Action | Élève | Admin |
|---|---|---|
| Submit a score | ✅ | ✅ |
| Edit an unvalidated match | ✅ (creator only) | ✅ |
| Edit a validated match | ✅ (creator, triggers re-validation) | ✅ |
| Validate an opponent's score | ✅ | ✅ |
| Contest a score | ✅ | ✅ |
| Delete/correct a disputed match | ❌ | ✅ |
| Manage accounts | ❌ | ✅ |

## Project plan (see plan.html)

5 phases, 21 tasks, ~8 weeks total:

1. **Phase 1 — Cadrage & architecture** (~1 week): user roles ✅, sports/match formats 🔄, tech stack ⬜, page structure ⬜
2. **Phase 2 — Authentication** (~1 week): OTP auth, student profiles, session management
3. **Phase 3 — Match entry & validation** (~2 weeks): submission form, validation system, notifications, contest/edit flow, match history
4. **Phase 4 — Leaderboards & stats** (~2 weeks): ranking metrics (points/Elo TBD), global leaderboard, per-promo filter, player profile/stats page
5. **Phase 5 — Admin & deployment** (~2 weeks): admin UI, mobile responsiveness, rate limiting/anti-cheat, deployment, beta test
