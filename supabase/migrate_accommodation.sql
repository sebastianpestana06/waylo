-- Accommodation AI search history (run in Supabase SQL editor)
create table if not exists public.accommodation_searches (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  city text not null,
  check_in date not null,
  check_out date not null,
  max_station_km numeric(8,2),
  budget_per_person_night numeric(12,2) not null check (budget_per_person_night > 0),
  currency text not null default 'EUR',
  adults int not null default 2 check (adults > 0),
  rooms int not null default 1 check (rooms > 0),
  notes text,
  ai_summary text,
  site_links jsonb not null default '[]'::jsonb,
  results jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

create index if not exists accommodation_searches_trip_idx
  on public.accommodation_searches (trip_id, created_at desc);

alter table public.accommodation_searches enable row level security;

drop policy if exists "accommodation select" on public.accommodation_searches;
create policy "accommodation select" on public.accommodation_searches
  for select using (is_trip_member(trip_id));

drop policy if exists "accommodation write" on public.accommodation_searches;
create policy "accommodation write" on public.accommodation_searches
  for all using (can_edit_trip(trip_id)) with check (can_edit_trip(trip_id));

-- Booked stays (confirmation records)
create table if not exists public.booked_stays (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  site_id text not null,
  site_label text not null,
  booking_id text not null,
  property_name text,
  city text,
  check_in date,
  check_out date,
  notes text,
  created_at timestamptz default now()
);

create index if not exists booked_stays_trip_idx
  on public.booked_stays (trip_id, check_in nulls last, created_at desc);

alter table public.booked_stays enable row level security;

drop policy if exists "booked stays select" on public.booked_stays;
create policy "booked stays select" on public.booked_stays
  for select using (is_trip_member(trip_id));

drop policy if exists "booked stays write" on public.booked_stays;
create policy "booked stays write" on public.booked_stays
  for all using (can_edit_trip(trip_id)) with check (can_edit_trip(trip_id));
