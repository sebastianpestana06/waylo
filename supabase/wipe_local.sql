-- LOCAL ONLY (waylo-local). Do NOT run on production (Waylo).
-- Wipes app tables. Re-run schema.sql afterwards.

drop schema if exists public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
grant all on schema public to public;

-- Optional: clear users (avoid truncate ... cascade — it hits protected storage tables)
-- delete from auth.identities;
-- delete from auth.sessions;
-- delete from auth.refresh_tokens;
-- delete from auth.users;
