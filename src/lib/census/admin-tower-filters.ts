import {
  formatApartmentInput,
  isValidApartment,
  normalizeApartmentCode,
} from "@/lib/validators";

export type TowerFilter = "all" | "C" | "D";

export type RegisteredInAppFilter = "all" | "registered" | "not_registered";

export type OvernightFilter = "all" | "staying" | "not_staying" | "no_answer";

export type TowerWithApartments<TApartment> = {
  code: string;
  floors: Array<{
    label: string;
    apartments: TApartment[];
  }>;
};

export function filterTowers<TApartment extends { code: string }>(
  towers: TowerWithApartments<TApartment>[],
  towerFilter: TowerFilter,
  apartmentFilter: string,
): TowerWithApartments<TApartment>[] {
  let filtered = towers;

  if (towerFilter !== "all") {
    filtered = filtered.filter((tower) => tower.code === towerFilter);
  }

  const normalizedApartment = apartmentFilter.trim()
    ? normalizeApartmentCode(apartmentFilter)
    : "";

  if (normalizedApartment && isValidApartment(apartmentFilter)) {
    filtered = filtered
      .map((tower) => ({
        ...tower,
        floors: tower.floors
          .map((floor) => ({
            ...floor,
            apartments: floor.apartments.filter(
              (apartment) =>
                normalizeApartmentCode(apartment.code) === normalizedApartment,
            ),
          }))
          .filter((floor) => floor.apartments.length > 0),
      }))
      .filter((tower) => tower.floors.length > 0);
  }

  return filtered;
}

type FilterableApartment = {
  code: string;
  isRegisteredInApp: boolean;
  census?: { willStayOvernight: boolean } | null;
};

function matchesRegisteredInAppFilter(
  apartment: FilterableApartment,
  registeredFilter: RegisteredInAppFilter,
): boolean {
  if (registeredFilter === "all") return true;
  if (registeredFilter === "registered") return apartment.isRegisteredInApp;
  return !apartment.isRegisteredInApp;
}

function matchesOvernightFilter(
  apartment: FilterableApartment,
  overnightFilter: OvernightFilter,
): boolean {
  if (overnightFilter === "all") return true;
  if (overnightFilter === "no_answer") return apartment.census == null;
  if (overnightFilter === "staying") {
    return apartment.census?.willStayOvernight === true;
  }
  return apartment.census?.willStayOvernight === false;
}

function apartmentMatchesAdminFilters<TApartment extends FilterableApartment>(
  apartment: TApartment,
  registeredFilter: RegisteredInAppFilter,
  overnightFilter: OvernightFilter,
): boolean {
  return (
    matchesRegisteredInAppFilter(apartment, registeredFilter) &&
    matchesOvernightFilter(apartment, overnightFilter)
  );
}

export function filterAdminTowers<TApartment extends FilterableApartment>(
  towers: TowerWithApartments<TApartment>[],
  options: {
    towerFilter: TowerFilter;
    apartmentFilter: string;
    registeredFilter: RegisteredInAppFilter;
    overnightFilter?: OvernightFilter;
  },
): TowerWithApartments<TApartment>[] {
  const {
    towerFilter,
    apartmentFilter,
    registeredFilter,
    overnightFilter = "all",
  } = options;

  const towerFiltered = filterTowers(towers, towerFilter, apartmentFilter);

  if (registeredFilter === "all" && overnightFilter === "all") {
    return towerFiltered;
  }

  return towerFiltered
    .map((tower) => ({
      ...tower,
      floors: tower.floors
        .map((floor) => ({
          ...floor,
          apartments: floor.apartments.filter((apartment) =>
            apartmentMatchesAdminFilters(
              apartment,
              registeredFilter,
              overnightFilter,
            ),
          ),
        }))
        .filter((floor) => floor.apartments.length > 0),
    }))
    .filter((tower) => tower.floors.length > 0);
}

export function countVisibleApartments<TApartment>(
  towers: TowerWithApartments<TApartment>[],
): number {
  return towers.reduce(
    (total, tower) =>
      total +
      tower.floors.reduce(
        (floorTotal, floor) => floorTotal + floor.apartments.length,
        0,
      ),
    0,
  );
}

export function formatApartmentFilterInput(value: string): string {
  return formatApartmentInput(value);
}

export function getApartmentFilterError(apartmentFilter: string): string | null {
  if (apartmentFilter.trim() && !isValidApartment(apartmentFilter)) {
    return "Usa el formato piso+unidad-letra (ej. 11-D), NT/PH + número + letra (ej. NT1-D).";
  }
  return null;
}

export function findMatchingTowerCode<TApartment extends { code: string }>(
  towers: TowerWithApartments<TApartment>[],
  apartmentFilter: string,
): string | null {
  if (!apartmentFilter.trim() || !isValidApartment(apartmentFilter)) {
    return null;
  }

  const normalized = normalizeApartmentCode(apartmentFilter);

  for (const tower of towers) {
    const hasMatch = tower.floors.some((floor) =>
      floor.apartments.some(
        (apartment) => normalizeApartmentCode(apartment.code) === normalized,
      ),
    );
    if (hasMatch) return tower.code;
  }

  return null;
}
