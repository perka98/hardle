-- Separate preview-only rounds. No writes to live puzzles/results/leaderboard.
begin;
create table if not exists hardle_private.preview_rounds (
 id uuid primary key default gen_random_uuid(),
 player_id text not null,
 game text not null check(game in ('daily','djdle','artist','orderdle')),
 public_payload jsonb not null,
 secret_solution jsonb not null,
 guesses jsonb not null default '[]'::jsonb,
 completed boolean not null default false,
 created_at timestamptz not null default now()
);
alter table hardle_private.preview_rounds enable row level security;
revoke all on hardle_private.preview_rounds from public,anon,authenticated;
grant select,insert,update on hardle_private.preview_rounds to hardle_validator;
drop policy if exists preview_round_owner on hardle_private.preview_rounds;
create policy preview_round_owner on hardle_private.preview_rounds to hardle_validator
 using(player_id=current_setting('hardle.player_id',true))
 with check(player_id=current_setting('hardle.player_id',true));
commit;
