-- Migration 0003: poker trainer skill stats + leaderboard.
-- Additive, idempotent, safe to re-run. Run once in the Supabase SQL editor.

create table if not exists trainer_stats (
  user_id          uuid primary key references users(id) on delete cascade,
  hands_played     integer not null default 0,
  graded_decisions integer not null default 0,   -- rating denominator
  quality_sum      numeric not null default 0,    -- sum of per-decision quality (0..100)
  rating           numeric not null default 0,     -- quality_sum / graded_decisions
  -- per-difficulty breakdown
  easy_decisions   integer not null default 0,
  easy_quality_sum numeric not null default 0,
  med_decisions    integer not null default 0,
  med_quality_sum  numeric not null default 0,
  hard_decisions   integer not null default 0,
  hard_quality_sum numeric not null default 0,
  updated_at       timestamptz not null default now()
);

create index if not exists trainer_stats_rating_idx on trainer_stats(rating desc);

-- Locked to anon; the app (service-role) is the gate, like every other table.
alter table trainer_stats enable row level security;
