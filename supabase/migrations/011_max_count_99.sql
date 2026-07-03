-- Límites de cantidad: máximo 99 en lugar de 999

update daily_census
set adult_count = 99
where adult_count > 99;

update daily_census
set children_count = 99
where children_count > 99;

-- vehicle_count/pet_count viven en daily_apartment_profile solo hasta la 015.
-- Si la tabla viene de schema.sql (forma final), esas columnas no existen aún.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_apartment_profile'
      and column_name = 'vehicle_count'
  ) then
    update daily_apartment_profile
    set vehicle_count = 99
    where vehicle_count > 99;

    update daily_apartment_profile
    set pet_count = 99
    where pet_count > 99;

    alter table daily_apartment_profile
      drop constraint if exists daily_apartment_profile_vehicle_count_check;

    alter table daily_apartment_profile
      drop constraint if exists daily_apartment_profile_pet_count_check;

    alter table daily_apartment_profile
      add constraint daily_apartment_profile_vehicle_count_check
      check (vehicle_count >= 0 and vehicle_count <= 99);

    alter table daily_apartment_profile
      add constraint daily_apartment_profile_pet_count_check
      check (pet_count >= 0 and pet_count <= 99);
  end if;
end $$;

alter table daily_census
  drop constraint if exists daily_census_people_check;

alter table daily_census
  add constraint daily_census_people_check
  check (
    (
      will_stay_overnight = false
      and adult_count is null
      and children_count is null
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
    )
  );
