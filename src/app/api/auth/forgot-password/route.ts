import { NextResponse } from "next/server";
import {
  FORGOT_PASSWORD_SUCCESS_MESSAGE,
  requestResidentPasswordReset,
} from "@/lib/auth/password-reset-service";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  exceedsMaxLength,
  isValidApartment,
  isValidEmail,
  MAX_EMAIL_LENGTH,
  normalizeApartmentCode,
} from "@/lib/validators";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(
    `forgot-password:${getClientIp(request)}`,
    5,
    15 * 60_000,
  );
  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfterSec);
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "La base de datos no está configurada." },
      { status: 503 },
    );
  }

  let body: { apartment?: string; email?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const apartment = normalizeApartmentCode(body.apartment ?? "");
  const email = body.email?.trim().toLowerCase() ?? "";

  if (!apartment || !email) {
    return NextResponse.json(
      { error: "Apartamento y correo son obligatorios." },
      { status: 400 },
    );
  }

  if (!isValidApartment(apartment)) {
    return NextResponse.json(
      { error: "Ingresa un apartamento válido (ej. 11-D)." },
      { status: 400 },
    );
  }

  if (!isValidEmail(email) || exceedsMaxLength(email, MAX_EMAIL_LENGTH)) {
    return NextResponse.json(
      { error: "Ingresa un correo electrónico válido." },
      { status: 400 },
    );
  }

  const result = await requestResidentPasswordReset({
    request,
    apartment,
    email,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: FORGOT_PASSWORD_SUCCESS_MESSAGE });
}
