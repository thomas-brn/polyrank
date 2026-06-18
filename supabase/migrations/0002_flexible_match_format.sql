-- =====================================================================
-- PolyRank — formats de match flexibles
-- Le nombre de joueurs est désormais dynamique (1 à 4 par côté).
-- On remplace la contrainte figée ('1V1','2V2','1V2') par un motif générique.
-- =====================================================================

alter table public.matches drop constraint if exists matches_format_check;

alter table public.matches
  add constraint matches_format_check check (format ~ '^[1-4]V[1-4]$');
