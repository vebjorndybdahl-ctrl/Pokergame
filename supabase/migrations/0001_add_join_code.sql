-- Migration: add a short join code to existing series.
-- Run this once in the Supabase SQL editor if you created the database BEFORE
-- the "join by code" feature was added. Safe to re-run.

alter table series add column if not exists join_code text;

create unique index if not exists series_join_code_idx on series(join_code);

-- Backfill a code for any series that doesn't have one yet. Evaluated per row,
-- so each gets a distinct code. New series get their code from the app instead.
update series
set join_code = upper(
  substr(replace(replace(encode(gen_random_bytes(8), 'base64'), '/', ''), '+', ''), 1, 6)
)
where join_code is null;
