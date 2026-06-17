-- =====================================================================
-- PolyRank — schéma initial (Phase 1)
-- Tables : profiles, sports, matches, match_participants, match_events
-- + triggers, seed des sports, Row-Level Security.
-- =====================================================================

create extension if not exists "pgcrypto";

-- =====================================================================
-- profiles : une ligne par utilisateur Supabase (auth.users)
-- =====================================================================
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  display_name text,
  promo        text,
  avatar_url   text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Création automatique du profil à l'inscription d'un utilisateur.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- sports
-- =====================================================================
create table public.sports (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique,
  slug              text not null unique,
  scoring_type      text not null check (scoring_type in ('SCORE_SIMPLE', 'SETS')),
  participant_mode  text not null check (participant_mode in ('INDIVIDUEL', 'EQUIPE')),
  default_team_size int not null default 1,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

-- Liste de départ (cf. DECISIONS.md — Tâche 2).
insert into public.sports (name, slug, scoring_type, participant_mode, default_team_size) values
  ('Football',        'football',        'SCORE_SIMPLE', 'EQUIPE',     5),
  ('Basketball',      'basketball',      'SCORE_SIMPLE', 'EQUIPE',     5),
  ('Handball',        'handball',        'SCORE_SIMPLE', 'EQUIPE',     7),
  ('Volleyball',      'volleyball',      'SETS',         'EQUIPE',     6),
  ('Tennis de table', 'tennis-de-table', 'SETS',         'INDIVIDUEL', 1),
  ('Badminton',       'badminton',       'SETS',         'INDIVIDUEL', 1),
  ('Tennis',          'tennis',          'SETS',         'INDIVIDUEL', 1);

-- =====================================================================
-- matches
-- =====================================================================
create table public.matches (
  id           uuid primary key default gen_random_uuid(),
  sport_id     uuid not null references public.sports (id),
  created_by   uuid not null references public.profiles (id),
  played_at    timestamptz not null default now(),
  location     text,
  status       text not null default 'SOUMIS'
                 check (status in ('SOUMIS', 'VALIDE', 'MODIFIE', 'REVALIDE', 'CONTESTE')),
  score_a      int,                 -- pour scoring_type = SCORE_SIMPLE
  score_b      int,
  sets         jsonb,               -- pour scoring_type = SETS, ex: [{"a":11,"b":7}, ...]
  winner_side  text check (winner_side in ('A', 'B', 'NUL')),
  side_a_label text,
  side_b_label text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index on public.matches (sport_id);
create index on public.matches (created_by);
create index on public.matches (status);

-- =====================================================================
-- match_participants : joueurs d'un match, côté A ou B
-- =====================================================================
create table public.match_participants (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches (id) on delete cascade,
  side       text not null check (side in ('A', 'B')),
  profile_id uuid references public.profiles (id),   -- joueur tagué (a un compte)
  guest_name text,                                    -- ou simple nom informatif
  is_creator boolean not null default false,
  created_at timestamptz not null default now(),
  constraint participant_identity check (profile_id is not null or guest_name is not null)
);

create index on public.match_participants (match_id);
create index on public.match_participants (profile_id);

-- =====================================================================
-- match_events : journal d'audit (cycle de vie d'un match)
-- =====================================================================
create table public.match_events (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches (id) on delete cascade,
  actor_id   uuid references public.profiles (id),
  type       text not null check (type in
               ('SOUMISSION', 'VALIDATION', 'MODIFICATION', 'CONTESTATION', 'REVALIDATION', 'ARBITRAGE_ADMIN')),
  note       text,
  created_at timestamptz not null default now()
);

create index on public.match_events (match_id);

-- =====================================================================
-- updated_at automatique sur matches
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Row-Level Security
-- =====================================================================
alter table public.profiles           enable row level security;
alter table public.sports             enable row level security;
alter table public.matches            enable row level security;
alter table public.match_participants enable row level security;
alter table public.match_events       enable row level security;

-- L'utilisateur courant est-il admin ? (security definer pour éviter la récursion RLS)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- profiles : lecture publique, chacun édite son profil, admin a tous les droits.
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_self" on public.profiles for update using (auth.uid() = id);
create policy "profiles_admin_all" on public.profiles for all using (public.is_admin());

-- sports : lecture publique, écriture admin.
create policy "sports_select_all" on public.sports for select using (true);
create policy "sports_admin_write" on public.sports for all
  using (public.is_admin()) with check (public.is_admin());

-- matches : lecture publique ; le créateur insère/édite les siens ; admin total.
-- (La validation/contestation par un adversaire passera par une RPC dédiée — Phase 3.)
create policy "matches_select_all" on public.matches for select using (true);
create policy "matches_insert_own" on public.matches for insert with check (auth.uid() = created_by);
create policy "matches_update_creator_or_admin" on public.matches for update
  using (auth.uid() = created_by or public.is_admin());
create policy "matches_delete_admin" on public.matches for delete using (public.is_admin());

-- match_participants : lecture publique ; écriture par le créateur du match ou un admin.
create policy "participants_select_all" on public.match_participants for select using (true);
create policy "participants_write_owner" on public.match_participants for all
  using (
    public.is_admin()
    or exists (select 1 from public.matches m where m.id = match_id and m.created_by = auth.uid())
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.matches m where m.id = match_id and m.created_by = auth.uid())
  );

-- match_events : lecture publique ; chacun journalise ses propres actions ; admin total.
create policy "events_select_all" on public.match_events for select using (true);
create policy "events_insert_self" on public.match_events for insert with check (auth.uid() = actor_id);
create policy "events_admin_all" on public.match_events for all using (public.is_admin());
