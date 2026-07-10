import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getSessionTokenFromRequest,
  validateSessionToken,
} from "@/lib/auth/session";
import {
  hasFullAdminAccess,
  isStaffSession,
} from "@/lib/auth/roles";

const PUBLIC_PATHS = [
  "/",
  "/admin",
  "/olvide-contrasena",
  "/restablecer-contrasena",
  "/admin/olvide-contrasena",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = getSessionTokenFromRequest(request);
  const session = token ? await validateSessionToken(token) : null;

  if (
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/forgot-password"
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    if (session && pathname === "/") {
      return NextResponse.redirect(new URL("/registro", request.url));
    }

    if (isStaffSession(session) && pathname === "/admin") {
      return NextResponse.redirect(new URL("/registro", request.url));
    }

    return NextResponse.next();
  }

  if (
    pathname.startsWith("/registro") ||
    pathname.startsWith("/apartamento") ||
    pathname.startsWith("/protocolos") ||
    pathname.startsWith("/cartelera") ||
    pathname.startsWith("/perfil") ||
    pathname.startsWith("/api/census") ||
    pathname.startsWith("/api/apartment/") ||
    pathname.startsWith("/api/support-board")
  ) {
    if (!session) {
      const loginUrl = new URL("/", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/apartamentos")) {
    if (!session) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (!isStaffSession(session) || !hasFullAdminAccess(session)) {
      return NextResponse.redirect(new URL("/registro", request.url));
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/usuarios")) {
    if (!session) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (!isStaffSession(session) || !hasFullAdminAccess(session)) {
      return NextResponse.redirect(new URL("/registro", request.url));
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin/")) {
    if (pathname === "/api/admin/login") {
      return NextResponse.next();
    }

    if (!isStaffSession(session)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    if (
      pathname.startsWith("/api/admin/users") &&
      !hasFullAdminAccess(session)
    ) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    if (
      pathname.startsWith("/api/admin/apartments") &&
      !hasFullAdminAccess(session)
    ) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin",
    "/olvide-contrasena",
    "/restablecer-contrasena",
    "/admin/olvide-contrasena",
    "/registro/:path*",
    "/apartamento/:path*",
    "/apartamentos/:path*",
    "/protocolos/:path*",
    "/cartelera/:path*",
    "/perfil/:path*",
    "/usuarios/:path*",
    "/api/census/:path*",
    "/api/apartment/:path*",
    "/api/support-board/:path*",
    "/api/admin/:path*",
  ],
};
