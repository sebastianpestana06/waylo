-- Run in Supabase SQL editor if your project already exists
alter table public.trips
  add column if not exists countries text[] default '{}',
  add column if not exists cities text[] default '{}';
