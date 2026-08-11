-- Waylo schema: run in Supabase SQL editor
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  home_timezone text default 'UTC',
  memberships jsonb default '{}'::jsonb,
  booking_prefs jsonb default '{"skyscanner": true, "booking": true, "agoda": false}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.passports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  issuing_country text not null,
  passport_number text,
  expiry_date date not null,
  storage_path text,
  created_at timestamptz default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_date date,
  end_date date,
  status text default 'planning',
  owner_id uuid not null references public.profiles(id) on delete cascade,
  invite_token text unique default encode(gen_random_bytes(16), 'hex'),
  destinations text[] default '{}',
  template_key text,
  last_visa_check jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  joined_at timestamptz default now(),
  primary key (trip_id, user_id)
);

create table if not exists public.travel_segments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  mode text not null check (mode in ('plane', 'train_hs', 'train_regional', 'car', 'bus', 'ferry', 'other')),
  from_place text not null,
  to_place text not null,
  depart_at timestamptz,
  arrive_at timestamptz,
  booking_status text default 'idea',
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.booking_deadlines (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  label text not null,
  due_date date not null,
  related_segment_id uuid references public.travel_segments(id) on delete set null,
  done boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  text text not null,
  done boolean default false,
  sort_order int default 0,
  assignee_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_date date not null,
  title text not null,
  notes text,
  maps_url text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists public.trip_documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  label text not null,
  category text default 'other',
  storage_path text not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.expense_payments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'EUR',
  created_at timestamptz default now()
);

create table if not exists public.expense_shares (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.expense_payments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  share_amount numeric(12,2) not null check (share_amount >= 0),
  paid boolean default false,
  paid_at timestamptz,
  marked_paid_by uuid references public.profiles(id) on delete set null,
  unique (payment_id, user_id)
);

create table if not exists public.meeting_proposals (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  candidate_slots jsonb not null default '[]'::jsonb,
  availability jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

-- helpers
create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from trip_members tm
    where tm.trip_id = p_trip_id and tm.user_id = auth.uid()
  );
$$;

create or replace function public.trip_role(p_trip_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select tm.role from trip_members tm
  where tm.trip_id = p_trip_id and tm.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_edit_trip(p_trip_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from trip_members tm
    where tm.trip_id = p_trip_id and tm.user_id = auth.uid()
      and tm.role in ('owner', 'editor')
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table profiles enable row level security;
alter table passports enable row level security;
alter table trips enable row level security;
alter table trip_members enable row level security;
alter table travel_segments enable row level security;
alter table booking_deadlines enable row level security;
alter table checklist_items enable row level security;
alter table itinerary_items enable row level security;
alter table trip_documents enable row level security;
alter table expense_payments enable row level security;
alter table expense_shares enable row level security;
alter table meeting_proposals enable row level security;

create policy "profiles read own or trip mates" on profiles for select using (
  id = auth.uid() or exists (
    select 1 from trip_members me
    join trip_members other on me.trip_id = other.trip_id
    where me.user_id = auth.uid() and other.user_id = profiles.id
  )
);
create policy "profiles update own" on profiles for update using (id = auth.uid());
create policy "profiles insert own" on profiles for insert with check (id = auth.uid());

create policy "passports own all" on passports for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "trips select members" on trips for select using (is_trip_member(id) or owner_id = auth.uid());
create policy "trips insert owner" on trips for insert with check (owner_id = auth.uid());
create policy "trips update editors" on trips for update using (can_edit_trip(id));
create policy "trips delete owner" on trips for delete using (owner_id = auth.uid());

create policy "members select" on trip_members for select using (is_trip_member(trip_id));
create policy "members insert join" on trip_members for insert with check (
  user_id = auth.uid() or trip_role(trip_id) = 'owner'
);
create policy "members update owner" on trip_members for update using (trip_role(trip_id) = 'owner');
create policy "members delete owner or self" on trip_members for delete using (
  trip_role(trip_id) = 'owner' or user_id = auth.uid()
);

create policy "segments select" on travel_segments for select using (is_trip_member(trip_id));
create policy "segments write" on travel_segments for all using (can_edit_trip(trip_id)) with check (can_edit_trip(trip_id));

create policy "deadlines select" on booking_deadlines for select using (is_trip_member(trip_id));
create policy "deadlines write" on booking_deadlines for all using (can_edit_trip(trip_id)) with check (can_edit_trip(trip_id));

create policy "checklist select" on checklist_items for select using (is_trip_member(trip_id));
create policy "checklist write" on checklist_items for all using (can_edit_trip(trip_id)) with check (can_edit_trip(trip_id));

create policy "itinerary select" on itinerary_items for select using (is_trip_member(trip_id));
create policy "itinerary write" on itinerary_items for all using (can_edit_trip(trip_id)) with check (can_edit_trip(trip_id));

create policy "docs select" on trip_documents for select using (is_trip_member(trip_id));
create policy "docs write" on trip_documents for all using (can_edit_trip(trip_id)) with check (can_edit_trip(trip_id));

create policy "payments select" on expense_payments for select using (is_trip_member(trip_id));
create policy "payments insert" on expense_payments for insert with check (can_edit_trip(trip_id) and created_by = auth.uid());
create policy "payments update creator" on expense_payments for update using (
  created_by = auth.uid() or trip_role(trip_id) = 'owner'
);
create policy "payments delete creator" on expense_payments for delete using (
  created_by = auth.uid() or trip_role(trip_id) = 'owner'
);

create policy "shares select" on expense_shares for select using (
  exists (
    select 1 from expense_payments ep
    where ep.id = payment_id and is_trip_member(ep.trip_id)
  )
);
create policy "shares insert" on expense_shares for insert with check (
  exists (
    select 1 from expense_payments ep
    where ep.id = payment_id and can_edit_trip(ep.trip_id)
  )
);
create policy "shares update mark paid" on expense_shares for update using (
  exists (
    select 1 from expense_payments ep
    where ep.id = payment_id
      and (ep.created_by = auth.uid() or trip_role(ep.trip_id) = 'owner')
  )
);

create policy "meetings select" on meeting_proposals for select using (is_trip_member(trip_id));
create policy "meetings write" on meeting_proposals for all using (can_edit_trip(trip_id)) with check (can_edit_trip(trip_id));

-- storage buckets (create via dashboard or storage API): passports, trip-docs (private)
insert into storage.buckets (id, name, public)
values ('passports', 'passports', false), ('trip-docs', 'trip-docs', false)
on conflict (id) do nothing;

create policy "passport files own" on storage.objects for all using (
  bucket_id = 'passports' and auth.uid()::text = (storage.foldername(name))[1]
) with check (
  bucket_id = 'passports' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "trip docs members read" on storage.objects for select using (
  bucket_id = 'trip-docs' and is_trip_member(((storage.foldername(name))[1])::uuid)
);
create policy "trip docs editors write" on storage.objects for insert with check (
  bucket_id = 'trip-docs' and can_edit_trip(((storage.foldername(name))[1])::uuid)
);
create policy "trip docs editors update" on storage.objects for update using (
  bucket_id = 'trip-docs' and can_edit_trip(((storage.foldername(name))[1])::uuid)
);
create policy "trip docs editors delete" on storage.objects for delete using (
  bucket_id = 'trip-docs' and can_edit_trip(((storage.foldername(name))[1])::uuid)
);

-- realtime
alter publication supabase_realtime add table checklist_items;
alter publication supabase_realtime add table expense_payments;
alter publication supabase_realtime add table expense_shares;
alter publication supabase_realtime add table itinerary_items;
