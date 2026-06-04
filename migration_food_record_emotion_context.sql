alter table public.food_records
add column if not exists emotion text
check (emotion in ('happy', 'normal', 'stress', 'tired', 'sad', 'angry'));

alter table public.food_records
add column if not exists context text
check (context in ('normal_meal', 'company_dinner', 'late_night', 'delivery', 'home_meal', 'rushed'));

create index if not exists idx_food_records_user_emotion
on public.food_records (user_id, emotion);

create index if not exists idx_food_records_user_context
on public.food_records (user_id, context);
