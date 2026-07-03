-- Si npm run db:migrate no conecta, pega esto en Supabase → SQL Editor
-- Corrige permisos: solo service_role accede a las tablas vía PostgREST

grant usage on schema public to postgres, anon, authenticated, service_role;

revoke all on table public.towers from anon, authenticated;
revoke all on table public.apartments from anon, authenticated;

grant all on table public.towers to service_role;
grant all on table public.apartments to service_role;

alter table public.towers enable row level security;
alter table public.apartments enable row level security;

grant select, insert, update, delete on table public.daily_census to service_role;
grant select, insert, update, delete on table public.daily_apartment_profile to service_role;
grant select, insert, update, delete on table public.apartment_profiles to service_role;
grant select, insert, update, delete on table public.admin_users to service_role;
