alter table public.food_analysis_results
add column if not exists analysis_source text
check (analysis_source in ('gemini', 'fallback'));

update public.food_analysis_results
set analysis_source = raw_ai_response->>'analysis_source'
where analysis_source is null
  and raw_ai_response ? 'analysis_source'
  and raw_ai_response->>'analysis_source' in ('gemini', 'fallback');

create index if not exists idx_food_analysis_results_source
on public.food_analysis_results (user_id, analysis_source);
