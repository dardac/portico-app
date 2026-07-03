-- Perfil del apartamento: un registro fijo por unidad (no por fecha).

create table if not exists apartment_profiles (
  apartment_id uuid primary key references apartments (id) on delete cascade,
  occupation text not null,
  infrastructure_status text,
  gas_pipe_status text,
  water_pipe_status text,
  connectivity_status text,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint apartment_profiles_infrastructure_status_check
    check (
      infrastructure_status is null
      or infrastructure_status in (
        'none',
        'minor_cracks',
        'severe_damage',
        'uninhabitable'
      )
    ),
  constraint apartment_profiles_gas_pipe_status_check
    check (
      gas_pipe_status is null
      or gas_pipe_status in (
        'ok',
        'pending_review',
        'pending_repair',
        'repaired'
      )
    ),
  constraint apartment_profiles_water_pipe_status_check
    check (
      water_pipe_status is null
      or water_pipe_status in (
        'ok',
        'pending_review',
        'pending_repair',
        'repaired'
      )
    ),
  constraint apartment_profiles_connectivity_status_check
    check (
      connectivity_status is null
      or connectivity_status in ('full', 'partial', 'none')
    )
);

insert into apartment_profiles (
  apartment_id,
  occupation,
  infrastructure_status,
  gas_pipe_status,
  water_pipe_status,
  connectivity_status,
  emergency_contact_name,
  emergency_contact_phone,
  created_at,
  updated_at
)
select distinct on (apartment_id)
  apartment_id,
  occupation,
  infrastructure_status,
  gas_pipe_status,
  water_pipe_status,
  connectivity_status,
  emergency_contact_name,
  emergency_contact_phone,
  created_at,
  updated_at
from daily_apartment_profile
order by apartment_id, profile_date desc, updated_at desc
on conflict (apartment_id) do nothing;

grant select, insert, update, delete on table public.apartment_profiles to service_role;

revoke all on table public.apartment_profiles from anon, authenticated;

alter table public.apartment_profiles enable row level security;

drop policy if exists portico_apartment_profiles_select on public.apartment_profiles;
create policy portico_apartment_profiles_select on public.apartment_profiles
  for select to portico_app
  using (apartment_id = app_apartment_id() or app_is_staff());

drop policy if exists portico_apartment_profiles_insert on public.apartment_profiles;
create policy portico_apartment_profiles_insert on public.apartment_profiles
  for insert to portico_app
  with check (apartment_id = app_apartment_id() or app_is_staff());

drop policy if exists portico_apartment_profiles_update on public.apartment_profiles;
create policy portico_apartment_profiles_update on public.apartment_profiles
  for update to portico_app
  using (apartment_id = app_apartment_id() or app_is_staff())
  with check (apartment_id = app_apartment_id() or app_is_staff());
