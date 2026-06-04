create extension if not exists pgcrypto;
create extension if not exists vector;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  age integer check (age > 0 and age < 130),
  gender text check (gender in ('male', 'female', 'other', 'unknown')),
  height_cm numeric(5,2) check (height_cm > 0),
  target_weight_kg numeric(5,2) check (target_weight_kg > 0),
  activity_level text check (activity_level in ('low', 'medium', 'high')),
  goal_type text check (goal_type in ('lose_weight', 'maintain_weight', 'gain_muscle', 'improve_health')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.food_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_type text not null check (input_type in ('image', 'text', 'image_text')),
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'late_night', 'other')),
  raw_text text,
  image_url text,
  memo text,
  eaten_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.food_analysis_results (
  id uuid primary key default gen_random_uuid(),
  food_record_id uuid not null references public.food_records(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  food_name text not null,
  serving_description text,
  calories numeric(8,2) check (calories >= 0),
  carbohydrate_g numeric(8,2) check (carbohydrate_g >= 0),
  protein_g numeric(8,2) check (protein_g >= 0),
  fat_g numeric(8,2) check (fat_g >= 0),
  sugar_g numeric(8,2) check (sugar_g >= 0),
  fiber_g numeric(8,2) check (fiber_g >= 0),
  sodium_mg numeric(10,2) check (sodium_mg >= 0),
  cholesterol_mg numeric(10,2) check (cholesterol_mg >= 0),
  saturated_fat_g numeric(8,2) check (saturated_fat_g >= 0),
  confidence_score numeric(4,3) check (confidence_score >= 0 and confidence_score <= 1),
  ai_model text not null default 'gemini-2.5-flash',
  raw_ai_response jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.emotion_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.situation_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.food_record_emotion_tags (
  food_record_id uuid not null references public.food_records(id) on delete cascade,
  emotion_tag_id uuid not null references public.emotion_tags(id) on delete cascade,
  intensity integer check (intensity >= 1 and intensity <= 10),
  created_at timestamptz not null default now(),
  primary key (food_record_id, emotion_tag_id)
);

create table if not exists public.food_record_situation_tags (
  food_record_id uuid not null references public.food_records(id) on delete cascade,
  situation_tag_id uuid not null references public.situation_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (food_record_id, situation_tag_id)
);

create table if not exists public.health_connect_daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_date date not null,
  steps integer check (steps >= 0),
  active_calories numeric(10,2) check (active_calories >= 0),
  total_calories_burned numeric(10,2) check (total_calories_burned >= 0),
  exercise_minutes integer check (exercise_minutes >= 0),
  distance_m numeric(12,2) check (distance_m >= 0),
  sleep_minutes integer check (sleep_minutes >= 0),
  heart_rate_avg numeric(6,2) check (heart_rate_avg >= 0),
  heart_rate_min numeric(6,2) check (heart_rate_min >= 0),
  heart_rate_max numeric(6,2) check (heart_rate_max >= 0),
  source text not null default 'health_connect',
  raw_data jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, logged_date)
);

create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric(5,2) not null check (weight_kg > 0),
  body_fat_percentage numeric(5,2) check (body_fat_percentage >= 0 and body_fat_percentage <= 100),
  skeletal_muscle_kg numeric(5,2) check (skeletal_muscle_kg >= 0),
  memo text,
  logged_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, logged_date)
);

create table if not exists public.weight_prediction_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  base_date date not null,
  current_weight_kg numeric(5,2) not null check (current_weight_kg > 0),
  predicted_7d_kg numeric(5,2) check (predicted_7d_kg > 0),
  predicted_14d_kg numeric(5,2) check (predicted_14d_kg > 0),
  predicted_30d_kg numeric(5,2) check (predicted_30d_kg > 0),
  trend text check (trend in ('increasing', 'decreasing', 'stable', 'unknown')),
  confidence text check (confidence in ('low', 'medium', 'high')),
  avg_daily_intake_calories numeric(10,2),
  avg_daily_burn_calories numeric(10,2),
  avg_daily_calorie_balance numeric(10,2),
  model_version text not null default 'rule-based-v1',
  explanation text,
  input_snapshot jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (
    source_type in (
      'food_record',
      'food_analysis',
      'emotion',
      'situation',
      'health_connect',
      'weight_log',
      'weight_prediction',
      'chat_message',
      'summary'
    )
  ),
  source_id uuid,
  title text,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(768),
  embedding_model text not null default 'text-embedding-004',
  content_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  retrieved_document_ids uuid[],
  ai_model text,
  token_usage jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_food_records_user_eaten_at
on public.food_records (user_id, eaten_at desc);

create index if not exists idx_food_analysis_results_record
on public.food_analysis_results (food_record_id);

create index if not exists idx_food_analysis_results_user
on public.food_analysis_results (user_id);

create index if not exists idx_emotion_tags_user
on public.emotion_tags (user_id);

create index if not exists idx_situation_tags_user
on public.situation_tags (user_id);

create index if not exists idx_food_record_emotion_tags_tag
on public.food_record_emotion_tags (emotion_tag_id);

create index if not exists idx_food_record_situation_tags_tag
on public.food_record_situation_tags (situation_tag_id);

create index if not exists idx_health_connect_daily_logs_user_date
on public.health_connect_daily_logs (user_id, logged_date desc);

create index if not exists idx_weight_logs_user_date
on public.weight_logs (user_id, logged_date desc);

create index if not exists idx_weight_prediction_results_user_date
on public.weight_prediction_results (user_id, base_date desc);

create index if not exists idx_rag_documents_user_source
on public.rag_documents (user_id, source_type, source_id);

create unique index if not exists idx_rag_documents_unique_source
on public.rag_documents (user_id, source_type, source_id)
where source_id is not null;

create index if not exists idx_rag_documents_user_created
on public.rag_documents (user_id, created_at desc);

create index if not exists idx_rag_documents_metadata
on public.rag_documents using gin (metadata);

create index if not exists idx_rag_documents_embedding
on public.rag_documents using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

create or replace function public.match_rag_documents(
  query_embedding vector(768),
  match_user_id uuid,
  match_count integer default 8,
  match_threshold double precision default 0.2,
  match_source_type text default null
)
returns table (
  id uuid,
  user_id uuid,
  source_type text,
  source_id uuid,
  title text,
  content text,
  metadata jsonb,
  similarity double precision,
  created_at timestamptz
)
language sql
stable
as $$
  select
    rd.id,
    rd.user_id,
    rd.source_type,
    rd.source_id,
    rd.title,
    rd.content,
    rd.metadata,
    1 - (rd.embedding <=> query_embedding) as similarity,
    rd.created_at
  from public.rag_documents rd
  where rd.user_id = auth.uid()
    and rd.user_id = match_user_id
    and rd.embedding is not null
    and (match_source_type is null or rd.source_type = match_source_type)
    and 1 - (rd.embedding <=> query_embedding) >= match_threshold
  order by rd.embedding <=> query_embedding
  limit greatest(1, least(match_count, 20));
$$;

create index if not exists idx_chat_sessions_user_updated
on public.chat_sessions (user_id, updated_at desc);

create index if not exists idx_chat_messages_session_created
on public.chat_messages (session_id, created_at asc);

create index if not exists idx_chat_messages_user_created
on public.chat_messages (user_id, created_at desc);

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_food_records_updated_at on public.food_records;
create trigger set_food_records_updated_at
before update on public.food_records
for each row execute function public.set_updated_at();

drop trigger if exists set_health_connect_daily_logs_updated_at on public.health_connect_daily_logs;
create trigger set_health_connect_daily_logs_updated_at
before update on public.health_connect_daily_logs
for each row execute function public.set_updated_at();

drop trigger if exists set_weight_logs_updated_at on public.weight_logs;
create trigger set_weight_logs_updated_at
before update on public.weight_logs
for each row execute function public.set_updated_at();

drop trigger if exists set_rag_documents_updated_at on public.rag_documents;
create trigger set_rag_documents_updated_at
before update on public.rag_documents
for each row execute function public.set_updated_at();

drop trigger if exists set_chat_sessions_updated_at on public.chat_sessions;
create trigger set_chat_sessions_updated_at
before update on public.chat_sessions
for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.food_records enable row level security;
alter table public.food_analysis_results enable row level security;
alter table public.emotion_tags enable row level security;
alter table public.situation_tags enable row level security;
alter table public.food_record_emotion_tags enable row level security;
alter table public.food_record_situation_tags enable row level security;
alter table public.health_connect_daily_logs enable row level security;
alter table public.weight_logs enable row level security;
alter table public.weight_prediction_results enable row level security;
alter table public.rag_documents enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists user_profiles_owner_policy on public.user_profiles;
create policy user_profiles_owner_policy
on public.user_profiles
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists food_records_owner_policy on public.food_records;
create policy food_records_owner_policy
on public.food_records
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists food_analysis_results_owner_policy on public.food_analysis_results;
create policy food_analysis_results_owner_policy
on public.food_analysis_results
for all
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.food_records fr
    where fr.id = food_record_id
      and fr.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.food_records fr
    where fr.id = food_record_id
      and fr.user_id = auth.uid()
  )
);

drop policy if exists emotion_tags_owner_policy on public.emotion_tags;
create policy emotion_tags_owner_policy
on public.emotion_tags
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists situation_tags_owner_policy on public.situation_tags;
create policy situation_tags_owner_policy
on public.situation_tags
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists food_record_emotion_tags_owner_policy on public.food_record_emotion_tags;
create policy food_record_emotion_tags_owner_policy
on public.food_record_emotion_tags
for all
using (
  exists (
    select 1
    from public.food_records fr
    where fr.id = food_record_id
      and fr.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.emotion_tags et
    where et.id = emotion_tag_id
      and et.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.food_records fr
    where fr.id = food_record_id
      and fr.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.emotion_tags et
    where et.id = emotion_tag_id
      and et.user_id = auth.uid()
  )
);

drop policy if exists food_record_situation_tags_owner_policy on public.food_record_situation_tags;
create policy food_record_situation_tags_owner_policy
on public.food_record_situation_tags
for all
using (
  exists (
    select 1
    from public.food_records fr
    where fr.id = food_record_id
      and fr.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.situation_tags st
    where st.id = situation_tag_id
      and st.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.food_records fr
    where fr.id = food_record_id
      and fr.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.situation_tags st
    where st.id = situation_tag_id
      and st.user_id = auth.uid()
  )
);

drop policy if exists health_connect_daily_logs_owner_policy on public.health_connect_daily_logs;
create policy health_connect_daily_logs_owner_policy
on public.health_connect_daily_logs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists weight_logs_owner_policy on public.weight_logs;
create policy weight_logs_owner_policy
on public.weight_logs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists weight_prediction_results_owner_policy on public.weight_prediction_results;
create policy weight_prediction_results_owner_policy
on public.weight_prediction_results
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists rag_documents_owner_policy on public.rag_documents;
create policy rag_documents_owner_policy
on public.rag_documents
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists chat_sessions_owner_policy on public.chat_sessions;
create policy chat_sessions_owner_policy
on public.chat_sessions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists chat_messages_owner_policy on public.chat_messages;
create policy chat_messages_owner_policy
on public.chat_messages
for all
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.chat_sessions cs
    where cs.id = session_id
      and cs.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.chat_sessions cs
    where cs.id = session_id
      and cs.user_id = auth.uid()
  )
);
