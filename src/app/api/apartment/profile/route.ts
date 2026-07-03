import { NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/auth/session";
import {
  isValidInfrastructureStatus,
  type InfrastructureStatus,
} from "@/lib/apartment/infrastructure-status";
import {
  isValidConnectivityStatus,
  type ConnectivityStatus,
} from "@/lib/apartment/connectivity-status";
import {
  isValidPipeStatus,
  type PipeStatus,
} from "@/lib/apartment/pipe-status";
import { mapSupabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  MAX_PHONE_LENGTH,
  MAX_TEXT_FIELD_LENGTH,
  exceedsMaxLength,
  isValidPhone,
} from "@/lib/validators";

function mapEntry(row: {
  occupation: string;
  infrastructure_status: string | null;
  gas_pipe_status: string | null;
  water_pipe_status: string | null;
  connectivity_status: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  updated_at: string;
}) {
  return {
    occupation: row.occupation,
    infrastructureStatus: row.infrastructure_status as InfrastructureStatus | null,
    gasPipeStatus: row.gas_pipe_status as PipeStatus | null,
    waterPipeStatus: row.water_pipe_status as PipeStatus | null,
    connectivityStatus: row.connectivity_status as ConnectivityStatus | null,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    updatedAt: row.updated_at,
  };
}

const PROFILE_SELECT =
  "occupation, infrastructure_status, gas_pipe_status, water_pipe_status, connectivity_status, emergency_contact_name, emergency_contact_phone, updated_at";

export async function GET() {
  const session = await getValidatedSession();

  if (!session || session.type !== "resident") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();

  const { data: row, error } = await supabase
    .from("apartment_profiles")
    .select(PROFILE_SELECT)
    .eq("apartment_id", session.apartmentId)
    .maybeSingle();

  if (error) {
    console.error("Error al leer perfil:", error.message);
    return NextResponse.json(
      {
        error: mapSupabaseError(
          error,
          "No se pudo cargar los datos del apartamento.",
        ),
      },
      { status: 500 },
    );
  }

  if (row) {
    return NextResponse.json({
      entry: mapEntry(row),
      isSaved: true,
    });
  }

  return NextResponse.json({
    entry: null,
    isSaved: false,
  });
}

export async function PUT(request: Request) {
  const session = await getValidatedSession();

  if (!session || session.type !== "resident") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: {
    occupation?: string;
    infrastructureStatus?: string;
    gasPipeStatus?: string;
    waterPipeStatus?: string;
    connectivityStatus?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const occupation = body.occupation?.trim() ?? "";
  const infrastructureStatus = body.infrastructureStatus ?? "";
  const gasPipeStatus = body.gasPipeStatus ?? "";
  const waterPipeStatus = body.waterPipeStatus ?? "";
  const connectivityStatus = body.connectivityStatus ?? "";
  const emergencyContactName = body.emergencyContactName?.trim() ?? "";
  const emergencyContactPhone = body.emergencyContactPhone?.trim() ?? "";

  if (occupation && exceedsMaxLength(occupation, MAX_TEXT_FIELD_LENGTH)) {
    return NextResponse.json(
      { error: "La ocupación es demasiado larga." },
      { status: 400 },
    );
  }

  if (!isValidInfrastructureStatus(infrastructureStatus)) {
    return NextResponse.json(
      { error: "Indica el estado del apartamento (infraestructura)." },
      { status: 400 },
    );
  }

  if (!isValidPipeStatus(gasPipeStatus)) {
    return NextResponse.json(
      { error: "Indica el estado de las tuberías de gas." },
      { status: 400 },
    );
  }

  if (!isValidPipeStatus(waterPipeStatus)) {
    return NextResponse.json(
      { error: "Indica el estado de las tuberías de agua." },
      { status: 400 },
    );
  }

  if (!isValidConnectivityStatus(connectivityStatus)) {
    return NextResponse.json(
      {
        error:
          "Indica si cuentas con servicios de telefonía fija, TV o internet.",
      },
      { status: 400 },
    );
  }

  if (!emergencyContactName) {
    return NextResponse.json(
      { error: "Indica el nombre y apellido del contacto de emergencia." },
      { status: 400 },
    );
  }

  if (exceedsMaxLength(emergencyContactName, MAX_TEXT_FIELD_LENGTH)) {
    return NextResponse.json(
      { error: "El nombre del contacto de emergencia es demasiado largo." },
      { status: 400 },
    );
  }

  if (!emergencyContactPhone) {
    return NextResponse.json(
      { error: "Indica el teléfono del contacto de emergencia." },
      { status: 400 },
    );
  }

  if (
    !isValidPhone(emergencyContactPhone) ||
    exceedsMaxLength(emergencyContactPhone, MAX_PHONE_LENGTH)
  ) {
    return NextResponse.json(
      { error: "Ingresa un teléfono de emergencia válido (mínimo 10 dígitos)." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("apartment_profiles")
    .upsert(
      {
        apartment_id: session.apartmentId,
        occupation,
        infrastructure_status: infrastructureStatus,
        gas_pipe_status: gasPipeStatus,
        water_pipe_status: waterPipeStatus,
        connectivity_status: connectivityStatus,
        emergency_contact_name: emergencyContactName,
        emergency_contact_phone: emergencyContactPhone,
        updated_at: now,
      },
      { onConflict: "apartment_id" },
    )
    .select(PROFILE_SELECT)
    .single();

  if (error) {
    console.error("Error al guardar perfil:", error.message);
    return NextResponse.json(
      {
        error: mapSupabaseError(
          error,
          "No se pudieron guardar los datos del apartamento.",
        ),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    entry: mapEntry(data),
    isSaved: true,
  });
}
