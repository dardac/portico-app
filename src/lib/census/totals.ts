type ApartmentForTotals = {
  registered_at: string | null;
};

type CensusRowForTotals = {
  will_stay_overnight: boolean;
  adult_count: number | null;
  children_count: number | null;
};

export type CensusTotals = {
  apartments: number;
  registeredInApp: number;
  answered: number;
  staying: number;
  adults: number;
  children: number;
  people: number;
};

export function buildCensusTotals(
  apartments: ApartmentForTotals[],
  censusRows: CensusRowForTotals[],
): CensusTotals {
  return {
    apartments: apartments.length,
    registeredInApp: apartments.filter((row) => row.registered_at != null).length,
    answered: censusRows.length,
    staying: censusRows.filter((row) => row.will_stay_overnight).length,
    adults: censusRows.reduce(
      (sum, row) =>
        sum + (row.will_stay_overnight ? (row.adult_count ?? 0) : 0),
      0,
    ),
    children: censusRows.reduce(
      (sum, row) =>
        sum + (row.will_stay_overnight ? (row.children_count ?? 0) : 0),
      0,
    ),
    people: censusRows.reduce(
      (sum, row) =>
        sum +
        (row.will_stay_overnight
          ? (row.adult_count ?? 0) + (row.children_count ?? 0)
          : 0),
      0,
    ),
  };
}
