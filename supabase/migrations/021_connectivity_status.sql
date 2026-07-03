-- Servicios de telefonía fija, TV e internet en el perfil diario del apartamento

alter table daily_apartment_profile
  add column if not exists connectivity_status text;

alter table daily_apartment_profile
  drop constraint if exists daily_apartment_profile_connectivity_status_check;

alter table daily_apartment_profile
  add constraint daily_apartment_profile_connectivity_status_check
  check (
    connectivity_status is null
    or connectivity_status in ('full', 'partial', 'none')
  );
