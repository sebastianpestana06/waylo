-- Add rooms filter to saved Stay searches
alter table public.accommodation_searches
  add column if not exists rooms int not null default 1
  check (rooms > 0);
