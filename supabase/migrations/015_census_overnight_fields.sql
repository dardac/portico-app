-- Censo: nombres de ocupantes y datos que solo aplican si pernocta
-- Perfil: estado de infraestructura; discapacidad/vehículos/mascotas pasan al censo

alter table daily_census
  add column if not exists occupant_names text,
  add column if not exists has_disability boolean,
  add column if not exists disability_type text,
  add column if not exists vehicle_count smallint,
  add column if not exists pet_count smallint;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_apartment_profile'
      and column_name = 'vehicle_count'
  ) then
    update daily_census c
    set
      has_disability = p.has_disability,
      disability_type = p.disability_type,
      vehicle_count = p.vehicle_count,
      pet_count = p.pet_count
    from daily_apartment_profile p
    where c.apartment_id = p.apartment_id
      and c.census_date = p.profile_date
      and c.will_stay_overnight = true
      and c.has_disability is null;
  end if;
end $$;

alter table daily_apartment_profile
  add column if not exists infrastructure_status text;

alter table daily_apartment_profile
  drop constraint if exists daily_apartment_profile_check;

alter table daily_apartment_profile
  drop constraint if exists daily_apartment_profile_vehicle_count_check;

alter table daily_apartment_profile
  drop constraint if exists daily_apartment_profile_pet_count_check;

alter table daily_apartment_profile
  drop column if exists has_disability,
  drop column if exists disability_type,
  drop column if exists vehicle_count,
  drop column if exists pet_count;

-- alter table daily_apartment_profile
--   add constraint daily_apartment_profile_infrastructure_status_check
--   check (
--     infrastructure_status is null
--     or infrastructure_status in (
--       'none',
--       'minor_cracks',
--       'severe_damage',
--       'uninhabitable'
--     )
--   );

alter table daily_census
  drop constraint if exists daily_census_people_check;

alter table daily_census
  add constraint daily_census_people_check
  check (
    (
      will_stay_overnight = false
      and adult_count is null
      and children_count is null
      and occupant_names is null
      and has_disability is null
      and disability_type is null
      and vehicle_count is null
      and pet_count is null
    )
    or (
      will_stay_overnight = true
      and adult_count is not null
      and children_count is not null
      and adult_count >= 0
      and children_count >= 0
      and adult_count <= 99
      and children_count <= 99
      and adult_count + children_count >= 1
      and occupant_names is not null
      and length(trim(occupant_names)) > 0
      and length(occupant_names) <= 400
      and has_disability is not null
      and vehicle_count is not null
      and pet_count is not null
      and vehicle_count >= 0
      and vehicle_count <= 99
      and pet_count >= 0
      and pet_count <= 99
      and (
        (has_disability = false and disability_type is null)
        or (
          has_disability = true
          and disability_type is not null
          and length(trim(disability_type)) > 0
        )
      )
    )
  );
