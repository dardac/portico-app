"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppLogo } from "@/components/layout/AppLogo";
import { UserMenu } from "@/components/layout/UserMenu";
import type { AppSession } from "@/lib/auth/session";
import {
  canViewResidentPii,
  hasFullAdminAccess,
  isStaffSession,
} from "@/lib/auth/roles";
import { getStaffRoleLabel } from "@/lib/auth/roles";
import { APP_NAME, BUILDING_NAME, BUILDING_SUBTITLE } from "@/lib/branding";

type AppShellProps = {
  session: AppSession;
  children: React.ReactNode;
};

type NavItem = { href: string; label: string };

function getNavItems(session: AppSession): NavItem[] {
  const items: NavItem[] = [
    { href: "/registro", label: "Registro Diario" },
  ];

  if (isStaffSession(session)) {
    if (canViewResidentPii(session.role)) {
      items.push({ href: "/apartamentos", label: "Apartamentos" });
    }
  } else {
    items.push({ href: "/apartamento", label: "Tu Apartamento" });
  }

  items.push(
    { href: "/cartelera", label: "Cartelera de Apoyo" },
    { href: "/protocolos", label: "Protocolos de Seguridad" },
  );

  if (isStaffSession(session) && hasFullAdminAccess(session)) {
    items.push({ href: "/usuarios", label: "Usuarios" });
  }

  return items;
}

const navLinkClass =
  "rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick/30";

export function AppShell({ session, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  async function handleLogout() {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(session.type === "admin" ? "/admin" : "/");
    router.refresh();
  }

  const sessionLabel = isStaffSession(session)
    ? `${getStaffRoleLabel(session.role)} · ${session.username}`
    : `Apto. ${session.apartmentCode}`;

  const navItems = getNavItems(session);

  return (
    <div className="app-bg">
      <header className="sticky top-0 z-40 border-b border-stone-200/60 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-stone-200/70 text-stone-500 transition hover:border-stone-300 hover:bg-stone-50/80 hover:text-stone-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900/20 md:hidden"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <div className="flex flex-col gap-[3px]" aria-hidden>
                <span
                  className={`block h-px w-3.5 bg-current transition ${menuOpen ? "translate-y-[4px] rotate-45" : ""}`}
                />
                <span
                  className={`block h-px w-3.5 bg-current transition ${menuOpen ? "opacity-0" : ""}`}
                />
                <span
                  className={`block h-px w-3.5 bg-current transition ${menuOpen ? "-translate-y-[4px] -rotate-45" : ""}`}
                />
              </div>
            </button>

            <Link
              href="/registro"
              className="shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick/30"
              aria-label={`Ir a inicio de ${APP_NAME}`}
            >
              <AppLogo variant="header" priority />
            </Link>

            <div className="hidden min-w-0 sm:block">
              <p className="text-xs font-semibold tracking-wide text-brick uppercase">
                {APP_NAME}
              </p>
              <p className="text-sm font-semibold tracking-tight text-stone-900">
                {BUILDING_NAME}
              </p>
              <p className="text-xs text-stone-500">{BUILDING_SUBTITLE}</p>
            </div>
          </div>

          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Navegación principal"
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`${navLinkClass} ${
                    isActive
                      ? "text-brick"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <UserMenu
            label={sessionLabel}
            onLogout={handleLogout}
            isLoggingOut={isLoggingOut}
          />
        </div>

        {menuOpen && (
          <nav
            className="border-t border-stone-200/60 px-4 py-3 md:hidden"
            aria-label="Navegación principal"
          >
            <p className="mb-2 text-xs text-stone-500">{sessionLabel}</p>
            <div className="space-y-0.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={`block ${navLinkClass} ${
                      isActive
                        ? "text-brick"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
