alter table public.food_analysis_results
drop constraint if exists food_analysis_results_analysis_source_check;

alter table public.food_analysis_results
add constraint food_analysis_results_analysis_source_check
check (analysis_source in ('gemini', 'fallback', 'user_edit'));
