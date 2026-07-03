import { NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/auth/session";
import { buildCensusTotals, type CensusTotals } from "@/lib/census/totals";
import { getTodayInCaracas, getYesterdayInCaracas } from "@/lib/dates";
import { mapSupabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAX_COUNT,
  MAX_OCCUPANT_NAMES_LENGTH,
  MAX_TEXT_FIELD_LENGTH,
  exceedsMaxLength,
} from "@/lib/validators";

function mapEntry(row: {
  will_stay_overnight: boolean;
  adult_count: number | null;
  children_count: number | null;
  occupant_names: string | null;
  has_disability: boolean | null;
  disability_type: string | null;
  vehicle_count: number | null;
  pet_count: number | null;
  updated_at: string;
}) {
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

function validateOvernightFields(body: {
  willStayOvernight: boolean;
  adultCount?: number | null;
  childrenCount?: number | null;
  occupantNames?: string;
  hasDisability?: boolean;
  disabilityType?: string | null;
  vehicleCount?: number;
  petCount?: number;
}): string | null {
  if (!body.willStayOvernight) {
    return null;
  }

  const adultCount = body.adultCount;
  const childrenCount = body.childrenCount;

  if (
    typeof adultCount !== "number" ||
    typeof childrenCount !== "number" ||
    !Number.isInteger(adultCount) ||
    !Number.isInteger(childrenCount) ||
    adultCount < 0 ||
    childrenCount < 0 ||
    adultCount > MAX_COUNT ||
    childrenCount > MAX_COUNT
  ) {
    return `Indica cuántos adultos y niños/adolescentes pernoctarán (0 a ${MAX_COUNT} cada uno).`;
  }

  if (adultCount + childrenCount < 1) {
    return "Debe pernoctar al menos 1 persona (adulto o niño/adolescente).";
  }

  const occupantNames = body.occupantNames?.trim() ?? "";
  if (!occupantNames) {
    return "Indica los nombres de los ocupantes que pernoctarán.";
  }

  if (exceedsMaxLength(occupantNames, MAX_OCCUPANT_NAMES_LENGTH)) {
    return "Los nombres de los ocupantes son demasiado largos.";
  }

  if (typeof body.hasDisability !== "boolean") {
    return "Indica si algún ocupante posee discapacidad.";
  }

  const disabilityType = body.disabilityType?.trim() ?? "";
  if (body.hasDisability && !disabilityType) {
    return "Indica qué tipo de discapacidad presenta.";
  }

  if (
    body.hasDisability &&
    exceedsMaxLength(disabilityType, MAX_TEXT_FIELD_LENGTH)
  ) {
    return "El tipo de discapacidad es demasiado largo.";
  }

  const vehicleCount = body.vehicleCount;
  const petCount = body.petCount;

  if (
    typeof vehicleCount !== "number" ||
    vehicleCount < 0 ||
    vehicleCount > MAX_COUNT ||
    !Number.isInteger(vehicleCount)
  ) {
    return `Indica la cantidad de vehículos (0 a ${MAX_COUNT}).`;
  }

  if (
    typeof petCount !== "number" ||
    petCount < 0 ||
    petCount > MAX_COUNT ||
    !Number.isInteger(petCount)
  ) {
    return `Indica la cantidad de mascotas (0 a ${MAX_COUNT}).`;
  }

  return null;
}

const CENSUS_SELECT =
  "will_stay_overnight, adult_count, children_count, occupant_names, has_disability, disability_type, vehicle_count, pet_count, updated_at";

async function loadBuildingTotals(
  supabase: SupabaseClient,
  censusDate: string,
): Promise<{ totals: CensusTotals } | { error: string }> {
  const [apartmentsResult, censusResult] = await Promise.all([
    supabase.from("apartments").select("registered_at").eq("is_active", true),
    supabase
      .from("daily_census")
      .select("will_stay_overnight, adult_count, children_count")
      .eq("census_date", censusDate),
  ]);

  if (apartmentsResult.error) {
    console.error(
      "Error al cargar totales de apartamentos:",
      apartmentsResult.error.message,
    );
    return {
      error: mapSupabaseError(
        apartmentsResult.error,
        "No se pudo cargar el resumen del edificio.",
      ),
    };
  }

  if (censusResult.error) {
    console.error(
      "Error al cargar totales del registro:",
      censusResult.error.message,
    );
    return {
      error: mapSupabaseError(
        censusResult.error,
        "No se pudo cargar el resumen del edificio.",
      ),
    };
  }

  return {
    totals: buildCensusTotals(
      apartmentsResult.data ?? [],
      censusResult.data ?? [],
    ),
  };
}

export async function GET() {
  const session = await getValidatedSession();

  if (!session || session.type !== "resident") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const censusDate = getTodayInCaracas();
  const yesterdayDate = getYesterdayInCaracas();
  const supabase = createSupabaseServerClient();

  const totalsResult = await loadBuildingTotals(supabase, censusDate);
  if ("error" in totalsResult) {
    return NextResponse.json({ error: totalsResult.error }, { status: 500 });
  }

  const { data: todayRow, error: todayError } = await supabase
    .from("daily_census")
    .select(CENSUS_SELECT)
    .eq("apartment_id", session.apartmentId)
    .eq("census_date", censusDate)
    .maybeSingle();

  if (todayError) {
    console.error("Error al leer registro:", todayError.message);
    return NextResponse.json(
      {
        error: mapSupabaseError(
          todayError,
          "No se pudo cargar el registro de hoy.",
        ),
      },
      { status: 500 },
    );
  }

  if (todayRow) {
    return NextResponse.json({
      censusDate,
      entry: mapEntry(todayRow),
      isSaved: true,
      prefill: null,
      totals: totalsResult.totals,
    });
  }

  const { data: yesterdayRow, error: yesterdayError } = await supabase
    .from("daily_census")
    .select(CENSUS_SELECT)
    .eq("apartment_id", session.apartmentId)
    .eq("census_date", yesterdayDate)
    .maybeSingle();

  if (yesterdayError) {
    console.error("Error al leer registro de ayer:", yesterdayError.message);
    return NextResponse.json(
      {
        error: mapSupabaseError(
          yesterdayError,
          "No se pudo cargar el registro de hoy.",
        ),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    censusDate,
    entry: null,
    isSaved: false,
    prefill: yesterdayRow
      ? {
          fromDate: yesterdayDate,
          ...mapEntry(yesterdayRow),
        }
      : null,
    totals: totalsResult.totals,
  });
}

export async function PUT(request: Request) {
  const session = await getValidatedSession();

  if (!session || session.type !== "resident") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: {
    willStayOvernight?: boolean;
    adultCount?: number | null;
    childrenCount?: number | null;
    occupantNames?: string;
    hasDisability?: boolean;
    disabilityType?: string | null;
    vehicleCount?: number;
    petCount?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (typeof body.willStayOvernight !== "boolean") {
    return NextResponse.json(
      { error: "Indica si pernoctarás hoy en el edificio." },
      { status: 400 },
    );
  }

  const willStayOvernight = body.willStayOvernight;
  const validationError = validateOvernightFields({
    willStayOvernight,
    adultCount: willStayOvernight ? body.adultCount : null,
    childrenCount: willStayOvernight ? body.childrenCount : null,
    occupantNames: willStayOvernight ? body.occupantNames : undefined,
    hasDisability: willStayOvernight ? body.hasDisability : undefined,
    disabilityType: willStayOvernight ? body.disabilityType : undefined,
    vehicleCount: willStayOvernight ? body.vehicleCount : undefined,
    petCount: willStayOvernight ? body.petCount : undefined,
  });

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const censusDate = getTodayInCaracas();
  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("daily_census")
    .upsert(
      {
        apartment_id: session.apartmentId,
        census_date: censusDate,
        will_stay_overnight: willStayOvernight,
        adult_count: willStayOvernight ? body.adultCount : null,
        children_count: willStayOvernight ? body.childrenCount : null,
        occupant_names: willStayOvernight
          ? body.occupantNames?.trim() ?? null
          : null,
        has_disability: willStayOvernight ? body.hasDisability : null,
        disability_type:
          willStayOvernight && body.hasDisability
            ? body.disabilityType?.trim() ?? null
            : null,
        vehicle_count: willStayOvernight ? body.vehicleCount : null,
        pet_count: willStayOvernight ? body.petCount : null,
        updated_at: now,
      },
      { onConflict: "apartment_id,census_date" },
    )
    .select(CENSUS_SELECT)
    .single();

  if (error) {
    console.error("Error al guardar registro:", error.message);
    return NextResponse.json(
      {
        error: mapSupabaseError(error, "No se pudo guardar el registro."),
      },
      { status: 500 },
    );
  }

  const totalsResult = await loadBuildingTotals(supabase, censusDate);
  if ("error" in totalsResult) {
    return NextResponse.json({ error: totalsResult.error }, { status: 500 });
  }

  return NextResponse.json({
    censusDate,
    entry: mapEntry(data),
    isSaved: true,
    prefill: null,
    totals: totalsResult.totals,
  });
}
