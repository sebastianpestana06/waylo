-- Booked stays only (if accommodation_searches already exists)
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
