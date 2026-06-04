create table if not exists public.health_connect_daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  summary_date date not null,
  steps integer check (steps >= 0),
  active_calories numeric(10,2) check (active_calories >= 0),
  total_calories_burned numeric(10,2) check (total_calories_burned >= 0),
  exercise_minutes integer check (exercise_minutes >= 0),
  distance_m numeric(12,2) check (distance_m >= 0),
  sleep_minutes integer check (sleep_minutes >= 0),
  heart_rate_avg numeric(6,2) check (heart_rate_avg >= 0),
  source text not null default 'manual',
  raw_data jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, summary_date)
);

create index if not exists idx_health_connect_daily_summaries_user_date
on public.health_connect_daily_summaries (user_id, summary_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_health_connect_daily_summaries_updated_at
on public.health_connect_daily_summaries;

create trigger set_health_connect_daily_summaries_updated_at
before update on public.health_connect_daily_summaries
for each row execute function public.set_updated_at();

alter table public.health_connect_daily_summaries enable row level security;

drop policy if exists health_connect_daily_summaries_owner_policy
on public.health_connect_daily_summaries;

create policy health_connect_daily_summaries_owner_policy
on public.health_connect_daily_summaries
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
