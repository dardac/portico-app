-- Datos del apartamento por día (ocupación, discapacidad, vehículos, mascotas)

create table if not exists daily_apartment_profile (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references apartments (id) on delete cascade,
  profile_date date not null,
  occupation text not null,
  has_disability boolean not null,
  disability_type text,
  vehicle_count smallint not null default 0
    check (vehicle_count >= 0 and vehicle_count <= 999),
  pet_count smallint not null default 0
    check (pet_count >= 0 and pet_count <= 999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (apartment_id, profile_date),
  check (
    (has_disability = false and disability_type is null)
    or (
      has_disability = true
      and disability_type is not null
      and length(trim(disability_type)) > 0
    )
  )
);

-- Si la tabla ya existía (p. ej. desde schema.sql en forma final), añadir columnas legacy.
alter table daily_apartment_profile
  add column if not exists has_disability boolean,
  add column if not exists disability_type text,
  add column if not exists vehicle_count smallint default 0,
  add column if not exists pet_count smallint default 0;

update daily_apartment_profile
set
  vehicle_count = coalesce(vehicle_count, 0),
  pet_count = coalesce(pet_count, 0)
where vehicle_count is null
   or pet_count is null;

create index if not exists daily_apartment_profile_date_idxa
  on daily_apartment_profile (profile_date);

create index if not exists daily_apartment_profile_apartment_date_idx
  on daily_apartment_profile (apartment_id, profile_date);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'apartments'
      and column_name = 'occupation'
  ) then
    insert into daily_apartment_profile (
      apartment_id,
      profile_date,
      occupation,
      has_disability,
      disability_type,
      vehicle_count,
      pet_count,
      updated_at
    )
    select
      id,
      coalesce((profile_updated_at at time zone 'America/Caracas')::date, current_date),
      occupation,
      has_disability,
      disability_type,
      coalesce(vehicle_count, 0),
      coalesce(pet_count, 0),
      profile_updated_at
    from apartments
    where profile_updated_at is not null
      and occupation is not null
      and has_disability is not null
      and not exists (
        select 1
        from daily_apartment_profile existing
        where existing.apartment_id = apartments.id
          and existing.profile_date = coalesce(
            (apartments.profile_updated_at at time zone 'America/Caracas')::date,
            current_date
          )
      );

    alter table apartments
      drop column if exists occupation,
      drop column if exists has_disability,
      drop column if exists disability_type,
      drop column if exists vehicle_count,
      drop column if exists pet_count,
      drop column if exists profile_updated_at;
  end if;
end $$;

grant select, insert, update, delete on table public.daily_apartment_profile to service_role;
