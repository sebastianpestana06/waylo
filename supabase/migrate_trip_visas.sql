-- Shared passport summaries for trip mates (no passport numbers / scans)
-- Plus multi-country visa check results on trips

alter table public.trips
  add column if not exists visa_checks jsonb not null default '[]'::jsonb;

create or replace function public.trip_passport_summaries(p_trip_id uuid)
returns table (
  user_id uuid,
  display_name text,
  issuing_country text,
  expiry_date date,
  has_scan boolean
)
language sql
security definer
set search_path = public
as $$
  select
    p.user_id,
    coalesce(nullif(pr.display_name, ''), 'Traveller') as display_name,
    p.issuing_country,
    p.expiry_date,
    (p.storage_path is not null) as has_scan
  from public.trip_members tm
  join public.passports p on p.user_id = tm.user_id
  left join public.profiles pr on pr.id = tm.user_id
  where tm.trip_id = p_trip_id
    and exists (
      select 1
      from public.trip_members me
      where me.trip_id = p_trip_id
        and me.user_id = auth.uid()
    );
$$;

revoke all on function public.trip_passport_summaries(uuid) from public;
grant execute on function public.trip_passport_summaries(uuid) to authenticated;
