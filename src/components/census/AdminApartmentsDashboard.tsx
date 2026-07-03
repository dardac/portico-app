"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { RetryErrorAlert } from "@/components/ui/RetryErrorAlert";
import { StatsBar } from "@/components/ui/StatsBar";
import { fetchJson } from "@/lib/fetch-client";
import {
  countVisibleApartments,
  filterTowers,
  findMatchingTowerCode,
  formatApartmentFilterInput,
  getApartmentFilterError,
  type TowerFilter,
} from "@/lib/census/admin-tower-filters";

type ApartmentProfile = {
  occupation: string;
  infrastructureStatus: string | null;
  infrastructureStatusLabel: string;
  gasPipeStatusLabel: string;
  waterPipeStatusLabel: string;
  connectivityStatusLabel: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  updatedAt: string;
};

type ProfileApartment = {
  id: string;
  code: string;
  unit: number;
  type: string;
  isRegisteredInApp: boolean;
  profile: ApartmentProfile | null;
};

type TowerData = {
  code: string;
  floors: Array<{
    label: string;
    apartments: ProfileApartment[];
  }>;
};

type ApartmentsResponse = {
  totals: {
    apartments: number;
    withProfile: number;
    registeredInApp: number;
    uninhabitable: number;
    severeDamage: number;
  };
  towers: TowerData[];
};

function DetailTag({
  label,
  value,
  short,
  full,
}: {
  label: string;
  value: string;
  short?: boolean;
  full?: boolean;
}) {
  const classes = [
    "admin-apt-tag",
    short && "admin-apt-tag--short",
    full && "admin-apt-tag--full",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <span className="admin-apt-tag-label">{label}</span>
      <span className="admin-apt-tag-value">{value}</span>
    </div>
  );
}

function DetailTagPair({ children }: { children: ReactNode }) {
  return <div className="admin-apt-tag-pair">{children}</div>;
}

function RegisteredAppBadge({
  isRegisteredInApp,
}: {
  isRegisteredInApp: boolean;
}) {
  if (isRegisteredInApp) {
    return <span className="badge-success">En la app</span>;
  }

  return <span className="badge-muted">Sin registro app</span>;
}

function InfrastructureBadge({ profile }: { profile: ApartmentProfile | null }) {
  if (!profile?.infrastructureStatus) {
    return <span className="badge-neutral">Sin perfil</span>;
  }

  if (profile.infrastructureStatus === "uninhabitable") {
    return <span className="badge-danger">Inhabitable</span>;
  }

  if (profile.infrastructureStatus === "severe_damage") {
    return <span className="badge-warning">Daño severo</span>;
  }

  return <span className="badge-success">Registrado</span>;
}

function AdminProfileApartmentRow({ apartment }: { apartment: ProfileApartment }) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();

  return (
    <div className={`admin-apt-row ${expanded ? "ring-1 ring-stone-200/80" : ""}`}>
      <button
        type="button"
        className="admin-apt-trigger"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={`Apartamento ${apartment.code}, ${expanded ? "ocultar" : "ver"} detalles`}
        onClick={() => setExpanded((open) => !open)}
      >
        <span className="admin-apt-trigger-left">
          <span className="admin-apt-code">{apartment.code}</span>
          {!expanded && (
            <span className="flex flex-wrap items-center gap-1.5">
              <RegisteredAppBadge
                isRegisteredInApp={apartment.isRegisteredInApp}
              />
              <InfrastructureBadge profile={apartment.profile} />
            </span>
          )}
        </span>
        <span className="admin-apt-trigger-right">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
            className={`admin-apt-chevron ${expanded ? "admin-apt-chevron-open" : ""}`}
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {expanded && (
        <div id={panelId} className="admin-apt-panel">
          <div className="admin-apt-tags">
            <section className="admin-apt-tag-group">
              <h4 className="admin-apt-panel-title">Apartamento</h4>
              {apartment.profile ? (
                <div className="admin-apt-tag-list">
                  <DetailTag
                    full
                    label="Registro en app"
                    value={apartment.isRegisteredInApp ? "Sí" : "No"}
                  />
                  <DetailTag
                    full
                    label="Ocupación"
                    value={apartment.profile.occupation}
                  />
                  <DetailTag
                    full
                    label="Infraestructura"
                    value={apartment.profile.infrastructureStatusLabel}
                  />
                  <DetailTagPair>
                    <DetailTag
                      short
                      label="Tuberías de gas"
                      value={apartment.profile.gasPipeStatusLabel}
                    />
                    <DetailTag
                      short
                      label="Tuberías de agua"
                      value={apartment.profile.waterPipeStatusLabel}
                    />
                  </DetailTagPair>
                  <DetailTag
                    full
                    label="Telefonía, TV e internet"
                    value={apartment.profile.connectivityStatusLabel}
                  />
                  <DetailTag
                    full
                    label="Contacto de emergencia"
                    value={
                      apartment.profile.emergencyContactName &&
                      apartment.profile.emergencyContactPhone
                        ? `${apartment.profile.emergencyContactName} · ${apartment.profile.emergencyContactPhone}`
                        : "—"
                    }
                  />
                </div>
              ) : (
                <span className="admin-apt-tag-empty">Sin perfil</span>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminTowerSection({
  tower,
  collapsed,
  onToggle,
}: {
  tower: TowerData;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  const apartmentCount = countVisibleApartments([tower]);

  return (
    <section className="admin-tower-section">
      <button
        type="button"
        className="admin-tower-trigger"
        aria-expanded={!collapsed}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="admin-tower-trigger-main">
          <h2 className="section-title text-base">Torre {tower.code}</h2>
          <span className="admin-tower-trigger-meta">
            {apartmentCount} apartamento{apartmentCount === 1 ? "" : "s"}
          </span>
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
          className={`admin-apt-chevron ${collapsed ? "" : "admin-apt-chevron-open"}`}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {!collapsed && (
        <div id={panelId} className="admin-tower-body">
          {tower.floors.map((floor) => (
            <div key={floor.label} className="admin-floor-block">
              <h3 className="admin-floor-label">{floor.label}</h3>
              <div className="admin-apt-list">
                {floor.apartments.map((apartment) => (
                  <AdminProfileApartmentRow
                    key={apartment.id}
                    apartment={apartment}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function AdminApartmentsDashboard() {
  const [data, setData] = useState<ApartmentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [towerFilter, setTowerFilter] = useState<TowerFilter>("all");
  const [apartmentFilter, setApartmentFilter] = useState("");
  const [collapsedTowers, setCollapsedTowers] = useState<
    Record<string, boolean>
  >({});

  const apartmentFilterError = getApartmentFilterError(apartmentFilter);

  const filteredTowers =
    data && !apartmentFilterError
      ? filterTowers(data.towers, towerFilter, apartmentFilter)
      : [];

  const hasActiveFilters =
    towerFilter !== "all" ||
    (apartmentFilter.trim() !== "" && !apartmentFilterError);

  const visibleApartmentCount = countVisibleApartments(filteredTowers);

  function toggleTowerCollapse(towerCode: string) {
    setCollapsedTowers((current) => ({
      ...current,
      [towerCode]: !current[towerCode],
    }));
  }

  function handleTowerFilterChange(nextFilter: TowerFilter) {
    setTowerFilter(nextFilter);
    if (nextFilter !== "all") {
      setCollapsedTowers((current) => ({
        ...current,
        [nextFilter]: false,
      }));
    }
  }

  function handleApartmentFilterChange(value: string) {
    const formatted = formatApartmentFilterInput(value);
    setApartmentFilter(formatted);

    if (formatted.trim() && data) {
      const matchingTower = findMatchingTowerCode(data.towers, formatted);
      if (matchingTower) {
        setTowerFilter(matchingTower as TowerFilter);
        setCollapsedTowers((current) => ({
          ...current,
          [matchingTower]: false,
        }));
      }
    }
  }

  function clearFilters() {
    setTowerFilter("all");
    setApartmentFilter("");
  }

  useEffect(() => {
    let cancelled = false;

    async function loadApartments() {
      setError(null);

      const result = await fetchJson<ApartmentsResponse>("/api/admin/apartments");

      if (cancelled) return;

      if (!result.ok) {
        setError(result.error);
        setData(null);
        setIsLoading(false);
        return;
      }

      setData(result.data);
      setIsLoading(false);
    }

    void loadApartments();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retryLoad() {
    setIsLoading(true);
    setReloadKey((current) => current + 1);
  }

  const summaryStats = [
    { label: "Apartamentos", value: data?.totals.apartments ?? 0 },
    { label: "En la app", value: data?.totals.registeredInApp ?? 0 },
    { label: "Con perfil", value: data?.totals.withProfile ?? 0 },
    { label: "Inhabitables", value: data?.totals.uninhabitable ?? 0 },
    { label: "Daño severo", value: data?.totals.severeDamage ?? 0 },
  ];

  return (
    <div className="page-content space-y-6">
      <header className="page-header">
        <div className="page-header-row">
          <div className="page-header-main">
            <h1 className="page-title">Apartamentos</h1>
            <p className="page-subtitle">Perfil fijo por torres y pisos</p>
          </div>
        </div>
      </header>

      {data && (
        <div className="space-y-4">
          <StatsBar stats={summaryStats} ariaLabel="Resumen de apartamentos" />

          <div className="app-card-compact space-y-4">
            <div className="census-filter-bar">
              <div className="census-filter-field">
                <p id="apartments-tower-filter-label" className="field-label">
                  Torre
                </p>
                <div
                  className="bulletin-filters census-filter-chips"
                  role="group"
                  aria-labelledby="apartments-tower-filter-label"
                >
                  {(
                    [
                      { value: "all", label: "Todas" },
                      { value: "C", label: "Torre C" },
                      { value: "D", label: "Torre D" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={towerFilter === option.value}
                      onClick={() => handleTowerFilterChange(option.value)}
                      className={`bulletin-filter-chip ${
                        towerFilter === option.value
                          ? "bulletin-filter-chip--active"
                          : ""
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="census-filter-field census-filter-field--apartment">
                <label htmlFor="apartments-apartment-filter" className="field-label">
                  Apartamento
                </label>
                <input
                  id="apartments-apartment-filter"
                  type="text"
                  inputMode="text"
                  value={apartmentFilter}
                  onChange={(event) =>
                    handleApartmentFilterChange(event.target.value)
                  }
                  placeholder="11-D, NT1-D, PH3-C"
                  aria-invalid={Boolean(apartmentFilterError)}
                  aria-describedby={
                    apartmentFilterError
                      ? "apartments-apartment-filter-error"
                      : "apartments-apartment-filter-hint"
                  }
                  className="field-input"
                />
                {apartmentFilterError ? (
                  <p
                    id="apartments-apartment-filter-error"
                    className="field-error"
                    role="alert"
                  >
                    {apartmentFilterError}
                  </p>
                ) : (
                  <p
                    id="apartments-apartment-filter-hint"
                    className="field-hint"
                  >
                    Deja vacío para ver todos los apartamentos.
                  </p>
                )}
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
                <p className="text-sm text-stone-500" role="status">
                  Mostrando {visibleApartmentCount} apartamento
                  {visibleApartmentCount === 1 ? "" : "s"}
                  {apartmentFilterError ? " (corrige el formato del apartamento)" : ""}
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn-ghost"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>

          <p className="text-sm text-stone-500">
            Perfil del apartamento (infraestructura, tuberías, contacto).
          </p>
        </div>
      )}

      {error && (
        <RetryErrorAlert
          message={error}
          onRetry={retryLoad}
          isRetrying={isLoading}
        />
      )}

      {isLoading ? (
        <div className="app-card py-16 text-center text-sm text-stone-400">
          Cargando apartamentos…
        </div>
      ) : filteredTowers.length === 0 ? (
        <div className="bulletin-empty">
          <p className="bulletin-empty-title">
            {apartmentFilterError
              ? "Formato de apartamento inválido"
              : "No hay apartamentos con estos filtros"}
          </p>
          <p className="bulletin-empty-text">
            {apartmentFilterError
              ? "Corrige el código del apartamento o limpia los filtros."
              : "Prueba otra torre o borra el filtro de apartamento."}
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="btn-ghost mt-4"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="admin-tower-stack">
          {filteredTowers.map((tower) => (
            <AdminTowerSection
              key={tower.code}
              tower={tower}
              collapsed={collapsedTowers[tower.code] ?? false}
              onToggle={() => toggleTowerCollapse(tower.code)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
