import { NextResponse } from "next/server";
import {
  getConnectivityStatusLabel,
  type ConnectivityStatus,
} from "@/lib/apartment/connectivity-status";
import {
  getInfrastructureStatusLabel,
  type InfrastructureStatus,
} from "@/lib/apartment/infrastructure-status";
import {
  getPipeStatusLabel,
  type PipeStatus,
} from "@/lib/apartment/pipe-status";
import { getValidatedSession } from "@/lib/auth/session";
import { canViewResidentPii, isStaffSession } from "@/lib/auth/roles";
import { getTodayInCaracas } from "@/lib/dates";
import { mapSupabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ApartmentRow = {
  id: string;
  code: string;
  floor: number | null;
  unit: number;
  apartment_type: "standard" | "nt" | "ph";
  registered_at: string | null;
  towers: { code: string } | { code: string }[];
};

function getTowerCode(apartment: ApartmentRow): string {
  return Array.isArray(apartment.towers)
    ? apartment.towers[0].code
    : apartment.towers.code;
}

type CensusRow = {
  apartment_id: string;
  will_stay_overnight: boolean;
  adult_count: number | null;
  children_count: number | null;
  occupant_names: string | null;
  has_disability: boolean | null;
  disability_type: string | null;
  vehicle_count: number | null;
  pet_count: number | null;
  updated_at: string;
};

type ProfileRow = {
  apartment_id: string;
  occupation: string;
  infrastructure_status: string | null;
  gas_pipe_status: string | null;
  water_pipe_status: string | null;
  connectivity_status: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  updated_at: string;
};

function mapProfile(row: ProfileRow) {
  return {
    occupation: row.occupation,
    infrastructureStatus: row.infrastructure_status,
    infrastructureStatusLabel: getInfrastructureStatusLabel(
      row.infrastructure_status as InfrastructureStatus | null,
    ),
    gasPipeStatus: row.gas_pipe_status,
    gasPipeStatusLabel: getPipeStatusLabel(row.gas_pipe_status as PipeStatus | null),
    waterPipeStatus: row.water_pipe_status,
    waterPipeStatusLabel: getPipeStatusLabel(
      row.water_pipe_status as PipeStatus | null,
    ),
    connectivityStatus: row.connectivity_status,
    connectivityStatusLabel: getConnectivityStatusLabel(
      row.connectivity_status as ConnectivityStatus | null,
    ),
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    updatedAt: row.updated_at,
  };
}

function mapCensus(row: CensusRow) {
  return {
    willStayOvernight: row.will_stay_overnight,
    adultCount: row.adult_count,
    childrenCount: row.children_count,
    occupantNames: row.occupant_names,
    hasDisability: row.has_disability,
    disabilityType: row.disability_type,
    vehicleCount: row.vehicle_count,
    petCount: row.pet_count,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: Request) {
  const session = await getValidatedSession();

  if (!session || !isStaffSession(session)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const censusDate = searchParams.get("date") ?? getTodayInCaracas();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(censusDate)) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  const { data: apartments, error: apartmentsError } = await supabase
    .from("apartments")
    .select(
      "id, code, floor, unit, apartment_type, registered_at, towers!inner(code)",
    )
    .eq("is_active", true)
    .order("code");

  if (apartmentsError) {
    console.error("Error al cargar apartamentos:", apartmentsError.message);
    return NextResponse.json(
      {
        error: mapSupabaseError(
          apartmentsError,
          "No se pudo cargar el registro.",
        ),
      },
      { status: 500 },
    );
  }

  const { data: censusRows, error: censusError } = await supabase
    .from("daily_census")
    .select(
      "apartment_id, will_stay_overnight, adult_count, children_count, occupant_names, has_disability, disability_type, vehicle_count, pet_count, updated_at",
    )
    .eq("census_date", censusDate);

  if (censusError) {
    console.error("Error al cargar respuestas:", censusError.message);
    return NextResponse.json(
      {
        error: mapSupabaseError(censusError, "No se pudo cargar el registro."),
      },
      { status: 500 },
    );
  }

  const { data: profileRows, error: profileError } = await supabase
    .from("apartment_profiles")
    .select(
      "apartment_id, occupation, infrastructure_status, gas_pipe_status, water_pipe_status, connectivity_status, emergency_contact_name, emergency_contact_phone, updated_at",
    );

  if (profileError) {
    console.error("Error al cargar perfiles:", profileError.message);
    return NextResponse.json(
      {
        error: mapSupabaseError(profileError, "No se pudo cargar el registro."),
      },
      { status: 500 },
    );
  }

  const censusByApartment = new Map(
    (censusRows as CensusRow[]).map((row) => [row.apartment_id, row]),
  );

  const profileByApartment = new Map(
    (profileRows as ProfileRow[]).map((row) => [row.apartment_id, row]),
  );

  const towers = buildTowerSummary(
    apartments as ApartmentRow[],
    censusByApartment,
    profileByApartment,
  );

  const canViewPii = canViewResidentPii(session.role);

  const registeredInAppCount =
    apartments?.filter((row) => row.registered_at != null).length ?? 0;

  const adminTotals = {
    apartments: apartments.length,
    registeredInApp: registeredInAppCount,
    answered: censusRows?.length ?? 0,
    staying: censusRows?.filter((row) => row.will_stay_overnight).length ?? 0,
    adults:
      censusRows?.reduce(
        (sum, row) =>
          sum + (row.will_stay_overnight ? (row.adult_count ?? 0) : 0),
        0,
      ) ?? 0,
    children:
      censusRows?.reduce(
        (sum, row) =>
          sum + (row.will_stay_overnight ? (row.children_count ?? 0) : 0),
        0,
      ) ?? 0,
    pets:
      censusRows?.reduce(
        (sum, row) =>
          sum + (row.will_stay_overnight ? (row.pet_count ?? 0) : 0),
        0,
      ) ?? 0,
    people:
      censusRows?.reduce(
        (sum, row) =>
          sum +
          (row.will_stay_overnight
            ? (row.adult_count ?? 0) + (row.children_count ?? 0)
            : 0),
        0,
      ) ?? 0,
  };

  const totals = canViewPii
    ? adminTotals
    : {
        registeredInApp: adminTotals.registeredInApp,
        staying: adminTotals.staying,
        adults: adminTotals.adults,
        children: adminTotals.children,
        pets: adminTotals.pets,
      };

  return NextResponse.json({
    censusDate,
    totals,
    towers: canViewPii ? towers : sanitizeTowersForVigilante(towers),
  });
}

type VigilanteCensusSummary = {
  willStayOvernight: boolean;
  adultCount: number | null;
  childrenCount: number | null;
  petCount: number | null;
};

type MappedApartment = {
  id: string;
  code: string;
  unit: number;
  type: string;
  isRegisteredInApp: boolean;
  census: ReturnType<typeof mapCensus> | VigilanteCensusSummary | null;
  profile: ReturnType<typeof mapProfile> | null;
};

type MappedTower = {
  code: string;
  floors: Array<{
    label: string;
    apartments: MappedApartment[];
  }>;
};

function sanitizeTowersForVigilante(towers: MappedTower[]): MappedTower[] {
  return towers.map((tower) => ({
    ...tower,
    floors: tower.floors.map((floor) => ({
      ...floor,
      apartments: floor.apartments.map((apartment) => {
        const census = apartment.census;
        const vigilanteCensus =
          census && "willStayOvernight" in census
            ? {
                willStayOvernight: census.willStayOvernight,
                adultCount: census.willStayOvernight ? census.adultCount : null,
                childrenCount: census.willStayOvernight
                  ? census.childrenCount
                  : null,
                petCount: census.willStayOvernight ? census.petCount : null,
              }
            : null;

        return {
          id: apartment.id,
          code: apartment.code,
          unit: apartment.unit,
          type: apartment.type,
          isRegisteredInApp: apartment.isRegisteredInApp,
          census: vigilanteCensus,
          profile: null,
        };
      }),
    })),
  }));
}

function buildTowerSummary(
  apartments: ApartmentRow[],
  censusByApartment: Map<string, CensusRow>,
  profileByApartment: Map<string, ProfileRow>,
) {
  const towerMap = new Map<
    string,
    {
      code: string;
      floors: Map<
        string,
        {
          label: string;
          sortKey: number;
          apartments: Array<{
            id: string;
            code: string;
            unit: number;
            type: string;
            isRegisteredInApp: boolean;
            census: {
              willStayOvernight: boolean;
              adultCount: number | null;
              childrenCount: number | null;
              occupantNames: string | null;
              hasDisability: boolean | null;
              disabilityType: string | null;
              vehicleCount: number | null;
              petCount: number | null;
              updatedAt: string;
            } | null;
            profile: {
              occupation: string;
              infrastructureStatus: string | null;
              infrastructureStatusLabel: string;
              gasPipeStatus: string | null;
              gasPipeStatusLabel: string;
              waterPipeStatus: string | null;
              waterPipeStatusLabel: string;
              connectivityStatus: string | null;
              connectivityStatusLabel: string;
              emergencyContactName: string | null;
              emergencyContactPhone: string | null;
              updatedAt: string;
            } | null;
          }>;
        }
      >;
    }
  >();

  for (const apartment of apartments) {
    const towerCode = getTowerCode(apartment);

    if (!towerMap.has(towerCode)) {
      towerMap.set(towerCode, { code: towerCode, floors: new Map() });
    }

    const tower = towerMap.get(towerCode)!;
    const floorKey = getFloorKey(apartment);
    const census = censusByApartment.get(apartment.id);
    const profile = profileByApartment.get(apartment.id);

    if (!tower.floors.has(floorKey.key)) {
      tower.floors.set(floorKey.key, {
        label: floorKey.label,
        sortKey: floorKey.sortKey,
        apartments: [],
      });
    }

    tower.floors.get(floorKey.key)!.apartments.push({
      id: apartment.id,
      code: apartment.code,
      unit: apartment.unit,
      type: apartment.apartment_type,
      isRegisteredInApp: apartment.registered_at != null,
      census: census ? mapCensus(census) : null,
      profile: profile ? mapProfile(profile) : null,
    });
  }

  return ["C", "D"]
    .filter((code) => towerMap.has(code))
    .map((code) => {
      const tower = towerMap.get(code)!;
      const floors = [...tower.floors.values()]
        .sort((a, b) => a.sortKey - b.sortKey)
        .map((floor) => ({
          label: floor.label,
          apartments: floor.apartments.sort((a, b) => a.unit - b.unit),
        }));

      return { code, floors };
    });
}

function getFloorKey(apartment: ApartmentRow) {
  if (apartment.apartment_type === "nt") {
    return { key: "nt", label: "NT", sortKey: 100 };
  }

  if (apartment.apartment_type === "ph") {
    return { key: "ph", label: "PH", sortKey: 101 };
  }

  return {
    key: `floor-${apartment.floor}`,
    label: `Piso ${apartment.floor}`,
    sortKey: apartment.floor ?? 0,
  };
}
