-- PRODUCTION WIPE (Waylo / ycdsxappysvjfhebskpc) ONLY.
-- Do NOT run on waylo-local.
-- Deletes all app data + auth users. Re-run schema.sql immediately after.
-- Do not DELETE storage.objects here — Supabase blocks it; clear files in Storage UI if needed.

drop schema if exists public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
grant all on schema public to public;

-- Clear auth without truncate ... cascade (that hits protected storage triggers)
delete from auth.refresh_tokens;
delete from auth.sessions;
delete from auth.identities;
delete from auth.users;
