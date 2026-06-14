-- Migration 0002: accounts, friends, series membership, invitations, game rules.
-- Additive and non-destructive. Run once in the Supabase SQL editor.
-- Safe to re-run.

create extension if not exists "pgcrypto";

-- ===== Accounts =====
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  username      text not null,                 -- as typed, for display
  username_ci   text not null unique,          -- lower(username), case-insensitive uniqueness
  password_hash text not null,                 -- scrypt$N$r$p$salt$hash
  created_at    timestamptz not null default now()
);

create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  token_hash  text not null unique,            -- sha256 of the opaque cookie token
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index if not exists sessions_user_idx on sessions(user_id);
create index if not exists sessions_expires_idx on sessions(expires_at);

-- ===== Friends =====
create table if not exists friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references users(id) on delete cascade,
  addressee_id uuid not null references users(id) on delete cascade,
  status       text not null default 'pending',  -- 'pending' | 'accepted'
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_distinct check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);
-- Block both A->B and B->A existing at once.
create unique index if not exists friendships_pair_idx
  on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

-- ===== Series membership =====
create table if not exists series_members (
  id        uuid primary key default gen_random_uuid(),
  series_id uuid not null references series(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  role      text not null default 'member',     -- 'owner' | 'member'
  joined_at timestamptz not null default now(),
  unique (series_id, user_id)
);
create index if not exists series_members_user_idx on series_members(user_id);
create index if not exists series_members_series_idx on series_members(series_id);

-- ===== Invitations =====
create table if not exists series_invitations (
  id           uuid primary key default gen_random_uuid(),
  series_id    uuid not null references series(id) on delete cascade,
  inviter_id   uuid not null references users(id) on delete cascade,
  invitee_id   uuid not null references users(id) on delete cascade,
  status       text not null default 'pending',  -- 'pending' | 'accepted' | 'declined'
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (series_id, invitee_id)
);
create index if not exists series_invitations_invitee_idx on series_invitations(invitee_id);
create index if not exists series_invitations_series_idx on series_invitations(series_id);

-- ===== Link players to user accounts =====
alter table players add column if not exists user_id uuid references users(id) on delete set null;
create unique index if not exists players_series_user_idx
  on players(series_id, user_id) where user_id is not null;

-- ===== Series ownership + default rules =====
alter table series add column if not exists created_by uuid references users(id) on delete set null;
alter table series add column if not exists default_buy_in numeric(10,2);
alter table series add column if not exists small_blind numeric(10,2);
alter table series add column if not exists big_blind numeric(10,2);
alter table series add column if not exists location text;
alter table series add column if not exists game_type text;
alter table series add column if not exists rules_notes text;

-- ===== Per-game rule overrides (null = inherit series default) =====
alter table games add column if not exists buy_in numeric(10,2);
alter table games add column if not exists small_blind numeric(10,2);
alter table games add column if not exists big_blind numeric(10,2);
alter table games add column if not exists location text;
alter table games add column if not exists game_type text;
alter table games add column if not exists rules_notes text;

-- ===== Lock new tables to anon (service-role bypasses RLS) =====
alter table users              enable row level security;
alter table sessions           enable row level security;
alter table friendships        enable row level security;
alter table series_members     enable row level security;
alter table series_invitations enable row level security;
