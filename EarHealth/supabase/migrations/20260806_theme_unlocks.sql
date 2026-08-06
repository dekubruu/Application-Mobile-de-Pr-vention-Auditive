-- ─────────────────────────────────────────────────────────────────────────────
-- Move theme ownership out of profiles.owned_tiers (an array column) into a
-- dedicated "reward" table, one row per unlocked theme — same pattern as
-- user_badges. profiles keeps total_points (balance) and active_theme
-- (current selection): those are single-value state, not a list of rewards.
--
-- APPLIED: 2026-08-06 (via Supabase SQL Editor). owned_tiers has since been
-- dropped from profiles — this file is kept for traceability/reproducibility,
-- not meant to be re-run as-is against the current schema.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Table ────────────────────────────────────────────────────────────────────
create table if not exists public.user_theme_unlocks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  theme       text not null check (theme in ('bronze', 'argent', 'or')),
  unlocked_at timestamptz not null default now(),
  unique (user_id, theme)
);

-- 2. RLS ────────────────────────────────────────────────────────────────────
alter table public.user_theme_unlocks enable row level security;

create policy "Users see own theme unlocks"
  on public.user_theme_unlocks
  for select
  using (auth.uid() = user_id);

-- No client-side INSERT policy on purpose: unlocking a theme only ever
-- happens through the purchase_theme() function below (security definer),
-- never via a direct client insert. This prevents a user from granting
-- themselves a theme for free by calling the table's REST endpoint directly.

-- 3. Migrate existing data from profiles.owned_tiers ─────────────────────────
-- Adjust `unnest(owned_tiers)` to `jsonb_array_elements_text(owned_tiers)` if
-- owned_tiers is a jsonb column rather than text[] in your schema.
insert into public.user_theme_unlocks (user_id, theme)
select id, unnest(owned_tiers)
from public.profiles
where owned_tiers is not null and array_length(owned_tiers, 1) > 0
on conflict (user_id, theme) do nothing;

-- 4. Atomic purchase function ─────────────────────────────────────────────────
-- Runs as a single DB transaction: deduct points + grant the theme together,
-- or neither. security definer + explicit auth.uid() scoping means a caller
-- can only ever affect their own row, regardless of RLS on the two tables.
create or replace function public.purchase_theme(target_theme text, target_cost int)
returns table (total_points int)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_points int;
begin
  select p.total_points into current_points
  from profiles p
  where p.id = auth.uid()
  for update; -- lock the row: a concurrent purchase waits here, not races

  if current_points is null then
    raise exception 'profile_not_found';
  end if;

  if current_points < target_cost then
    raise exception 'insufficient_points';
  end if;

  update profiles
  set total_points = current_points - target_cost,
      updated_at   = now()
  where id = auth.uid();

  insert into user_theme_unlocks (user_id, theme)
  values (auth.uid(), target_theme)
  on conflict (user_id, theme) do nothing;

  return query select (current_points - target_cost) as total_points;
end;
$$;

grant execute on function public.purchase_theme(text, int) to authenticated;

-- 5. Drop the old column — APPLIED 2026-08-06.
alter table public.profiles drop column owned_tiers;
