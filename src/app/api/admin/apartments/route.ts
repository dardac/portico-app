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
import { hasFullAdminAccess, isStaffSession } from "@/lib/auth/roles";
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

export async function GET() {
  const session = await getValidatedSession();

  if (!session || !isStaffSession(session) || !hasFullAdminAccess(session)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
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
          "No se pudieron cargar los apartamentos.",
        ),
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
        error: mapSupabaseError(
          profileError,
          "No se pudieron cargar los apartamentos.",
        ),
      },
      { status: 500 },
    );
  }

  const profileByApartment = new Map(
    (profileRows as ProfileRow[]).map((row) => [row.apartment_id, row]),
  );

  const towers = buildTowerSummary(
    apartments as ApartmentRow[],
    profileByApartment,
  );

  const profileCount = profileRows?.length ?? 0;
  const registeredInAppCount =
    apartments?.filter((row) => row.registered_at != null).length ?? 0;
  const uninhabitableCount =
    profileRows?.filter((row) => row.infrastructure_status === "uninhabitable")
      .length ?? 0;
  const severeDamageCount =
    profileRows?.filter((row) => row.infrastructure_status === "severe_damage")
      .length ?? 0;

  return NextResponse.json({
    totals: {
      apartments: apartments.length,
      withProfile: profileCount,
      registeredInApp: registeredInAppCount,
      uninhabitable: uninhabitableCount,
      severeDamage: severeDamageCount,
    },
    towers,
  });
}

function buildTowerSummary(
  apartments: ApartmentRow[],
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
            profile: ReturnType<typeof mapProfile> | null;
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
