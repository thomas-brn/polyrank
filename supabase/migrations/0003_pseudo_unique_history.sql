-- =====================================================================
-- PolyRank — pseudos uniques, limite de changement, historique
-- =====================================================================

-- Unicité du pseudo, insensible à la casse.
create unique index if not exists profiles_pseudo_unique
  on public.profiles (lower(pseudo))
  where pseudo is not null;

-- Date du dernier changement de pseudo (pour la limite de 1 / mois).
alter table public.profiles
  add column if not exists pseudo_changed_at timestamptz;

-- Historique des anciens pseudos.
create table if not exists public.pseudo_history (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  pseudo     text not null,
  changed_at timestamptz not null default now()
);

create index if not exists pseudo_history_profile_idx
  on public.pseudo_history (profile_id);

alter table public.pseudo_history enable row level security;

create policy "pseudo_history_select_all"
  on public.pseudo_history for select using (true);
create policy "pseudo_history_insert_self"
  on public.pseudo_history for insert with check (auth.uid() = profile_id);
