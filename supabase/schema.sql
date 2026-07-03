-- Pórtico del Ávila — Torres C y D
-- Catálogo real: 248 apartamentos
--   NT1–NT8 × torres C y D  →  16
--   PH1–PH4 × torres C y D  →  8
--   Pisos 1–14, unidades 1–8 × torres C y D  →  224
--
-- Estándar: código = piso + unidad, guión, torre
-- Ejemplo: piso 1, unidad 1 → 11-D | piso 10, unidad 6 → 106-C
-- Excepciones: NT1-D, PH3-C, etc.
--
-- Después de crear las tablas:
--   npm run db:migrate
--   npm run db:seed

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tablas base
-- ---------------------------------------------------------------------------

create table towers (
  id uuid primary key default gen_random_uuid(),
  code char(1) not null unique check (code in ('C', 'D')),
  name text not null,
  floors smallint not null default 14 check (floors > 0),
  units_per_floor smallint not null default 8 check (units_per_floor > 0),
  created_at timestamptz not null default now()
);

create table apartments (
  id uuid primary key default gen_random_uuid(),
  tower_id uuid not null references towers (id) on delete cascade,
  apartment_type text not null default 'standard'
    check (apartment_type in ('standard', 'nt', 'ph')),
  floor smallint,
  unit smallint not null check (unit between 1 and 8),
  code text not null unique,
  email text,
  phone text,
  password_hash text not null,
  registered_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (apartment_type = 'standard' and floor between 1 and 14 and unit between 1 and 8)
    or (apartment_type = 'nt' and floor is null and unit between 1 and 8)
    or (apartment_type = 'ph' and floor is null and unit between 1 and 4)
  )
);

create index apartments_code_idx on apartments (code);
create index apartments_tower_floor_idx on apartments (tower_id, floor);
create index apartments_type_idx on apartments (apartment_type);

create unique index apartments_standard_unique_idx
  on apartments (tower_id, floor, unit)
  where apartment_type = 'standard';

create unique index apartments_exception_unique_idx
  on apartments (tower_id, apartment_type, unit)
  where apartment_type in ('nt', 'ph');

insert into towers (code, name, floors, units_per_floor) values
  ('C', 'Torre C', 14, 8),
  ('D', 'Torre D', 14, 8);

-- ---------------------------------------------------------------------------
-- Seguridad (RLS) — ver migración 020_row_level_security.sql
-- PostgREST (anon/authenticated) bloqueado; la app usa portico_app + service_role.
-- ---------------------------------------------------------------------------

alter table towers enable row level security;
alter table apartments enable row level security;

-- daily_apartment_profile se crea y evoluciona en las migraciones (009+).

-- Los permisos reales se aplican en las migraciones (npm run db:migrate)
