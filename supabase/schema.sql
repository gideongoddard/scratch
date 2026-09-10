-- Golf App Schema
-- Run this in the Supabase SQL editor: https://supabase.com/dashboard/project/ttqjwvnsepusukopxqrq/sql

-- ============================================================
-- COURSES
-- ============================================================
create table if not exists public.courses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  tee           text not null,
  course_par    integer not null,
  total_yards   integer,
  slope_rating  numeric(4,1),
  course_rating numeric(4,1),
  holes         jsonb not null,
  -- holes shape: [{ hole: int, si: int, par: int, yards: int }, ...]
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.courses enable row level security;

create policy "users manage own courses"
  on public.courses
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- ROUNDS
-- ============================================================
create table if not exists public.rounds (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  course_id       uuid references public.courses(id) on delete set null,
  played_at       date not null,
  handicap_index  numeric(4,1),
  status          text not null default 'complete' check (status in ('in_progress', 'complete')),
  holes           jsonb not null,
  -- holes shape: [{ hole: int, gross: int, putts: int, accuracy: 'hit'|'left'|'right'|'short'|'long', teeClub: str|null, sandShots: int|null, penalties: int|null }]
  -- while status='in_progress' (a draft, GOD-212), gross/putts/accuracy may be null on
  -- unplayed holes — that invariant is app-side (lib/validateRound.ts), not a DB constraint
  course_snapshot jsonb not null,
  -- course_snapshot shape: { name, tee, coursePar, totalYards, slopeRating, courseRating,
  --                          holes: [{ hole, si, par, yards }, ...] }
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.rounds enable row level security;

create policy "users manage own rounds"
  on public.rounds
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- updated_at trigger (shared)
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger courses_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

create trigger rounds_updated_at
  before update on public.rounds
  for each row execute function public.set_updated_at();

-- ============================================================
-- ROUNDS: draft status (GOD-212)
-- Run this against an existing database — the create table above only
-- applies to a fresh install. Existing rows are all finished rounds, so
-- the 'complete' default backfills them in the same statement.
-- ============================================================
alter table public.rounds
  add column if not exists status text not null default 'complete'
    check (status in ('in_progress', 'complete'));
