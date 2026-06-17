-- =====================================================================
-- PolyRank — schéma initial (Phase 1)
-- App de classement de JEUX (à boire) entre étudiants. Réservé aux +18.
-- Tables : schools, profiles, games, matches, match_participants, match_events
-- + triggers, seeds, Row-Level Security.
-- =====================================================================

create extension if not exists "pgcrypto";

-- =====================================================================
-- schools : écoles du réseau Polytech (référentiel)
-- =====================================================================
create table public.schools (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

insert into public.schools (name, slug) values
  ('Polytech Angers',            'angers'),
  ('Polytech Annecy-Chambéry',   'annecy-chambery'),
  ('Polytech Clermont',          'clermont'),
  ('Polytech Dijon',             'dijon'),
  ('Polytech Grenoble',          'grenoble'),
  ('Polytech Lille',             'lille'),
  ('Polytech Lyon',              'lyon'),
  ('Polytech Marseille',         'marseille'),
  ('Polytech Montpellier',       'montpellier'),
  ('Polytech Nancy',             'nancy'),
  ('Polytech Nantes',            'nantes'),
  ('Polytech Nice Sophia',       'nice-sophia'),
  ('Polytech Orléans',           'orleans'),
  ('Polytech Paris-Saclay',      'paris-saclay'),
  ('Polytech Sorbonne',          'sorbonne'),
  ('Polytech Tours',             'tours');

-- =====================================================================
-- profiles : une ligne par utilisateur Supabase (auth.users)
-- =====================================================================
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  pseudo      text,                                   -- public ; on déconseille les nom/prénom réels
  school_id   uuid references public.schools (id),    -- null si « Exté »
  is_external boolean not null default false,         -- true = extérieur au réseau (pas d'année)
  annee       text check (annee in ('PEIP1', 'PEIP2', '3A', '4A', '5A', 'VIEUX_CON')),
  is_adult    boolean not null default false,         -- confirmation +18 ans (requise par l'app)
  avatar_url  text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);
-- Règle métier (école XOR exté, année requise si école) appliquée à l'onboarding,
-- pas via CHECK : le profil est créé incomplet à l'inscription puis complété.

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
-- games : jeux disponibles (au lancement : FifaChamp, CoinCoin)
-- =====================================================================
create table public.games (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.games (name, slug) values
  ('FifaChamp', 'fifachamp'),
  ('CoinCoin',  'coincoin');

-- =====================================================================
-- matches
-- Format par match (1v1 / 2v2 / 1v2). Score = manches gagnées par camp.
-- =====================================================================
create table public.matches (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null references public.games (id),
  created_by   uuid not null references public.profiles (id),
  format       text not null check (format in ('1V1', '2V2', '1V2')),
  played_at    timestamptz not null default now(),
  location     text,
  status       text not null default 'SOUMIS'
                 check (status in ('SOUMIS', 'VALIDE', 'MODIFIE', 'REVALIDE', 'CONTESTE')),
  manches_a    int,                 -- manches gagnées côté A
  manches_b    int,                 -- manches gagnées côté B
  winner_side  text check (winner_side in ('A', 'B', 'NUL')),
  side_a_label text,
  side_b_label text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index on public.matches (game_id);
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
alter table public.schools            enable row level security;
alter table public.profiles           enable row level security;
alter table public.games              enable row level security;
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

-- schools : lecture publique, écriture admin.
create policy "schools_select_all" on public.schools for select using (true);
create policy "schools_admin_write" on public.schools for all
  using (public.is_admin()) with check (public.is_admin());

-- profiles : lecture publique, chacun édite son profil, admin a tous les droits.
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_self" on public.profiles for update using (auth.uid() = id);
create policy "profiles_admin_all" on public.profiles for all using (public.is_admin());

-- games : lecture publique, écriture admin.
create policy "games_select_all" on public.games for select using (true);
create policy "games_admin_write" on public.games for all
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
