create table if not exists public.embedding_failure_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_record_id uuid references public.food_records(id) on delete set null,
  reason text not null check (
    reason in (
      'Gemini API Error',
      'Timeout',
      'Rate Limit',
      'Invalid Content',
      'Database Error',
      'Unknown'
    )
  ),
  error_message text,
  error_details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_embedding_failure_logs_user_created
on public.embedding_failure_logs (user_id, created_at desc);

create index if not exists idx_embedding_failure_logs_food_record
on public.embedding_failure_logs (food_record_id);

alter table public.embedding_failure_logs enable row level security;

drop policy if exists embedding_failure_logs_owner_policy on public.embedding_failure_logs;
create policy embedding_failure_logs_owner_policy
on public.embedding_failure_logs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
