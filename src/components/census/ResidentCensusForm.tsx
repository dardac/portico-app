"use client";

import { useEffect, useState } from "react";
import { RetryErrorAlert } from "@/components/ui/RetryErrorAlert";
import { StatsBar } from "@/components/ui/StatsBar";
import { SuccessAlert } from "@/components/ui/SuccessAlert";
import { fetchJson } from "@/lib/fetch-client";
import { formatDateInCaracas } from "@/lib/dates";
import { formatCensusPeople } from "@/lib/census/format-people";
import type { CensusTotals } from "@/lib/census/totals";
import {
  limitCountInput,
  limitOccupantNamesInput,
  MAX_OCCUPANT_NAMES_LENGTH,
} from "@/lib/validators";

type CensusEntry = {
  willStayOvernight: boolean;
  adultCount: number | null;
  childrenCount: number | null;
  occupantNames: string | null;
  hasDisability: boolean | null;
  disabilityType: string | null;
  vehicleCount: number | null;
  petCount: number | null;
  updatedAt: string;
};

function applyCensusEntry(
  entry: CensusEntry,
  setters: {
    setWillStay: (value: boolean) => void;
    setAdultCount: (value: string) => void;
    setChildrenCount: (value: string) => void;
    setOccupantNames: (value: string) => void;
    setHasDisability: (value: boolean | null) => void;
    setDisabilityType: (value: string) => void;
    setVehicleCount: (value: string) => void;
    setPetCount: (value: string) => void;
  },
) {
  setters.setWillStay(entry.willStayOvernight);
  setters.setAdultCount(
    entry.adultCount !== null ? String(entry.adultCount) : "",
  );
  setters.setChildrenCount(
    entry.childrenCount !== null ? String(entry.childrenCount) : "",
  );
  setters.setOccupantNames(entry.occupantNames ?? "");
  setters.setHasDisability(entry.hasDisability);
  setters.setDisabilityType(entry.disabilityType ?? "");
  setters.setVehicleCount(
    entry.vehicleCount !== null ? String(entry.vehicleCount) : "0",
  );
  setters.setPetCount(entry.petCount !== null ? String(entry.petCount) : "0");
}

function clearOvernightFields(setters: {
  setAdultCount: (value: string) => void;
  setChildrenCount: (value: string) => void;
  setOccupantNames: (value: string) => void;
  setHasDisability: (value: boolean | null) => void;
  setDisabilityType: (value: string) => void;
  setVehicleCount: (value: string) => void;
  setPetCount: (value: string) => void;
}) {
  setters.setAdultCount("");
  setters.setChildrenCount("");
  setters.setOccupantNames("");
  setters.setHasDisability(null);
  setters.setDisabilityType("");
  setters.setVehicleCount("0");
  setters.setPetCount("0");
}

function CensusField({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-tile">
      <dt className="profile-tile-label">{label}</dt>
      <dd className="profile-tile-value">{value}</dd>
    </div>
  );
}

function formatDisabilityDisplay(
  hasDisability: boolean | null,
  disabilityType: string | null,
): string {
  if (hasDisability === null) return "—";
  if (!hasDisability) return "No";
  return disabilityType ? `Sí · ${disabilityType}` : "Sí";
}

function IconEdit() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="m2.695 14.763-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
    </svg>
  );
}

export function ResidentCensusForm() {
  const [censusDate, setCensusDate] = useState("");
  const [willStay, setWillStay] = useState<boolean | null>(null);
  const [adultCount, setAdultCount] = useState("");
  const [childrenCount, setChildrenCount] = useState("");
  const [occupantNames, setOccupantNames] = useState("");
  const [hasDisability, setHasDisability] = useState<boolean | null>(null);
  const [disabilityType, setDisabilityType] = useState("");
  const [vehicleCount, setVehicleCount] = useState("0");
  const [petCount, setPetCount] = useState("0");
  const [isPrefilled, setIsPrefilled] = useState(false);
  const [prefillFromDate, setPrefillFromDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveErrorRetryable, setSaveErrorRetryable] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [success, setSuccess] = useState(false);
  const [censusEntry, setCensusEntry] = useState<CensusEntry | null>(null);
  const [isCensusEditing, setIsCensusEditing] = useState(true);
  const [buildingTotals, setBuildingTotals] = useState<CensusTotals | null>(
    null,
  );

  const overnightSetters = {
    setAdultCount,
    setChildrenCount,
    setOccupantNames,
    setHasDisability,
    setDisabilityType,
    setVehicleCount,
    setPetCount,
  };

  useEffect(() => {
    let cancelled = false;

    async function loadCensus() {
      setLoadError(null);

      const result = await fetchJson<{
        censusDate: string;
        entry: CensusEntry | null;
        prefill: (CensusEntry & { fromDate: string }) | null;
        totals: CensusTotals;
        error?: string;
      }>("/api/census/today");

      if (cancelled) return;

      if (!result.ok) {
        setLoadError(result.error);
        setIsLoading(false);
        return;
      }

      const data = result.data;
      setCensusDate(data.censusDate);
      setBuildingTotals(data.totals);

      if (data.entry) {
        applyCensusEntry(data.entry, {
          setWillStay,
          ...overnightSetters,
        });
        setCensusEntry(data.entry);
        setIsCensusEditing(false);
        setIsPrefilled(false);
        setPrefillFromDate(null);
      } else if (data.prefill) {
        applyCensusEntry(data.prefill, {
          setWillStay,
          ...overnightSetters,
        });
        setCensusEntry(null);
        setIsCensusEditing(true);
        setIsPrefilled(true);
        setPrefillFromDate(data.prefill.fromDate);
      } else {
        setCensusEntry(null);
        setIsCensusEditing(true);
      }

      setIsLoading(false);
    }

    void loadCensus();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retryLoad() {
    setIsLoading(true);
    setReloadKey((current) => current + 1);
  }

  function markEdited() {
    setSuccess(false);
    if (isPrefilled) setIsPrefilled(false);
  }

  function startCensusEditing() {
    setIsCensusEditing(true);
    setSaveError(null);
    setSuccess(false);
  }

  function cancelCensusEditing() {
    if (censusEntry) {
      applyCensusEntry(censusEntry, {
        setWillStay,
        ...overnightSetters,
      });
    }
    setIsCensusEditing(false);
    setSaveError(null);
  }

  const showSaveActions = isCensusEditing || censusEntry === null;

  function validateCensusFields(): string | null {
    if (willStay === null) {
      return "Selecciona si pernoctarás hoy en el edificio.";
    }

    if (!willStay) return null;

    const adults = Number(adultCount || "0");
    const children = Number(childrenCount || "0");

    if (adults + children < 1) {
      return "Indica cuántos adultos y niños/adolescentes pernoctarán (al menos 1 en total).";
    }

    if (!occupantNames.trim()) {
      return "Indica los nombres de los ocupantes que pernoctarán.";
    }

    if (occupantNames.length > MAX_OCCUPANT_NAMES_LENGTH) {
      return "Los nombres de los ocupantes son demasiado largos.";
    }

    if (hasDisability === null) {
      return "Indica si algún ocupante posee discapacidad.";
    }

    if (hasDisability && !disabilityType.trim()) {
      return "Indica qué tipo de discapacidad presenta.";
    }

    return null;
  }

  function scrollToSaveFeedback() {
    window.requestAnimationFrame(() => {
      document
        .querySelector("[data-census-feedback]")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  async function handleSave() {
    setSaveError(null);
    setSaveErrorRetryable(false);
    setSuccess(false);

    const validationError = validateCensusFields();
    if (validationError) {
      setSaveError(validationError);
      scrollToSaveFeedback();
      return;
    }

    setIsSaving(true);

    const result = await fetchJson<{
      censusDate: string;
      entry: CensusEntry;
      totals: CensusTotals;
      error?: string;
    }>("/api/census/today", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        willStayOvernight: willStay,
        adultCount: willStay ? Number(adultCount || "0") : null,
        childrenCount: willStay ? Number(childrenCount || "0") : null,
        occupantNames: willStay ? occupantNames.trim() : undefined,
        hasDisability: willStay ? hasDisability : undefined,
        disabilityType:
          willStay && hasDisability ? disabilityType.trim() : null,
        vehicleCount: willStay ? Number(vehicleCount || "0") : undefined,
        petCount: willStay ? Number(petCount || "0") : undefined,
      }),
    });

    setIsSaving(false);

    if (!result.ok) {
      setSaveError(result.error);
      setSaveErrorRetryable(result.retryable);
      scrollToSaveFeedback();
      return;
    }

    const data = result.data;
    setCensusDate(data.censusDate);
    setBuildingTotals(data.totals);
    setIsPrefilled(false);
    setPrefillFromDate(null);
    if (data.entry) {
      setCensusEntry(data.entry);
      applyCensusEntry(data.entry, {
        setWillStay,
        ...overnightSetters,
      });
    }
    setIsCensusEditing(false);
    setSuccess(true);
    scrollToSaveFeedback();
  }

  const summaryStats = buildingTotals
    ? [
        { label: "Apartamentos", value: buildingTotals.apartments },
        { label: "En la app", value: buildingTotals.registeredInApp },
        { label: "Respondieron", value: buildingTotals.answered },
        { label: "Pernoctan", value: buildingTotals.staying },
        { label: "Adultos", value: buildingTotals.adults },
        { label: "Niños y adolescentes", value: buildingTotals.children },
        {
          label: "Total personas",
          value: buildingTotals.people,
          highlight: true,
        },
      ]
    : [];

  if (isLoading) {
    return (
      <div className="app-card py-16 text-center text-sm text-stone-400">
        Cargando registro de hoy…
      </div>
    );
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <p className="page-eyebrow">Hoy</p>
        <h1 className="page-title mt-2">Registro diario</h1>
        {censusDate && (
          <p className="page-subtitle">{formatDateInCaracas(censusDate)}</p>
        )}
      </header>

      {loadError && (
        <RetryErrorAlert
          message={loadError}
          onRetry={retryLoad}
          isRetrying={isLoading}
          className="mb-6"
        />
      )}

      {isPrefilled && prefillFromDate && (
        <div className="alert-info mb-6">
          Respuesta del {formatDateInCaracas(prefillFromDate)} autocompletada.
          Revísala y guarda si es correcta, o edítala si cambió.
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,20rem)] lg:gap-8">
        <div className="page-layout-main min-w-0">
          <section className="app-card-compact census-form w-full">
        <div className="profile-section-header">
          <h2 className="section-title min-w-0 flex-1 text-base">
            Registro de hoy
          </h2>
          {!isCensusEditing && censusEntry && (
            <button
              type="button"
              onClick={startCensusEditing}
              className="btn-ghost shrink-0 gap-1.5 px-2.5"
              aria-label="Editar datos del registro"
            >
              <IconEdit />
              Editar
            </button>
          )}
        </div>

        {isCensusEditing ? (
          <div className="mt-5 space-y-5">
            <fieldset className="space-y-4">
              <legend className="census-legend">
                ¿Pernoctará en el día de hoy en las residencias?
              </legend>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { value: true, label: "Sí" },
                  { value: false, label: "No" },
                ].map((option) => (
                  <label
                    key={String(option.value)}
                    className={`choice-card ${
                      willStay === option.value
                        ? "choice-card-active"
                        : "choice-card-inactive"
                    }`}
                  >
                    <input
                      type="radio"
                      name="willStay"
                      className="sr-only"
                      checked={willStay === option.value}
                      onChange={() => {
                        setWillStay(option.value);
                        markEdited();
                        if (!option.value) {
                          clearOvernightFields(overnightSetters);
                        }
                      }}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {willStay && (
              <div className="census-followup space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="adultCount" className="field-label">
                      Número de adultos
                    </label>
                    <input
                      id="adultCount"
                      type="text"
                      inputMode="numeric"
                      value={adultCount}
                      onChange={(event) => {
                        setAdultCount(limitCountInput(event.target.value));
                        markEdited();
                      }}
                      className="field-input max-w-[8rem]"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label htmlFor="childrenCount" className="field-label">
                      Número de niños o adolescentes
                    </label>
                    <input
                      id="childrenCount"
                      type="text"
                      inputMode="numeric"
                      value={childrenCount}
                      onChange={(event) => {
                        setChildrenCount(limitCountInput(event.target.value));
                        markEdited();
                      }}
                      className="field-input max-w-[8rem]"
                      placeholder="0"
                    />
                  </div>
                </div>

                <p className="field-hint">
                  Al menos 1 persona en total (adulto o niño/adolescente).
                </p>

                <div>
                  <label htmlFor="occupantNames" className="field-label">
                    Nombres de los ocupantes
                  </label>
                  <textarea
                    id="occupantNames"
                    rows={3}
                    maxLength={MAX_OCCUPANT_NAMES_LENGTH}
                    value={occupantNames}
                    onChange={(event) => {
                      setOccupantNames(
                        limitOccupantNamesInput(event.target.value),
                      );
                      markEdited();
                    }}
                    className="field-input resize-y"
                    placeholder="Ej. María González, Juan Pérez, Ana Rodríguez…"
                  />
                  <p className="field-hint">
                    Máximo {MAX_OCCUPANT_NAMES_LENGTH} caracteres.
                  </p>
                </div>

                <fieldset>
                  <legend className="field-label mb-3">
                    ¿Algún ocupante posee discapacidad?
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: true, label: "Sí" },
                      { value: false, label: "No" },
                    ].map((option) => (
                      <label
                        key={String(option.value)}
                        className={`choice-card ${
                          hasDisability === option.value
                            ? "choice-card-active"
                            : "choice-card-inactive"
                        }`}
                      >
                        <input
                          type="radio"
                          name="hasDisability"
                          className="sr-only"
                          checked={hasDisability === option.value}
                          onChange={() => {
                            setHasDisability(option.value);
                            if (!option.value) setDisabilityType("");
                            markEdited();
                          }}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {hasDisability && (
                  <div>
                    <label htmlFor="disabilityType" className="field-label">
                      ¿Qué tipo de discapacidad presenta?
                    </label>
                    <input
                      id="disabilityType"
                      type="text"
                      value={disabilityType}
                      onChange={(event) => {
                        setDisabilityType(event.target.value);
                        markEdited();
                      }}
                      className="field-input"
                      placeholder="Ej. visual, motriz, auditiva…"
                    />
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="vehicleCount" className="field-label">
                      Cantidad de vehículos
                    </label>
                    <input
                      id="vehicleCount"
                      type="text"
                      inputMode="numeric"
                      value={vehicleCount}
                      onChange={(event) => {
                        setVehicleCount(limitCountInput(event.target.value));
                        markEdited();
                      }}
                      className="field-input"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label htmlFor="petCount" className="field-label">
                      Cantidad de mascotas
                    </label>
                    <input
                      id="petCount"
                      type="text"
                      inputMode="numeric"
                      value={petCount}
                      onChange={(event) => {
                        setPetCount(limitCountInput(event.target.value));
                        markEdited();
                      }}
                      className="field-input"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            )}

            {censusEntry && (
              <button
                type="button"
                onClick={cancelCensusEditing}
                className="text-sm font-medium text-stone-400 underline decoration-stone-300 underline-offset-2 transition hover:text-stone-600 hover:decoration-stone-400"
              >
                Cancelar edición
              </button>
            )}
          </div>
        ) : (
          censusEntry && (
            <dl className="mt-5 grid grid-cols-2 gap-2">
              <CensusField
                label="Pernocta hoy"
                value={censusEntry.willStayOvernight ? "Sí" : "No"}
              />
              {censusEntry.willStayOvernight && (
                <>
                  <CensusField
                    label="Adultos"
                    value={String(censusEntry.adultCount ?? "—")}
                  />
                  <CensusField
                    label="Niños y adolescentes"
                    value={String(censusEntry.childrenCount ?? "—")}
                  />
                  <CensusField
                    label="Total personas"
                    value={formatCensusPeople({
                      adultCount: censusEntry.adultCount ?? 0,
                      childrenCount: censusEntry.childrenCount ?? 0,
                    })}
                  />
                  <CensusField
                    label="Ocupantes"
                    value={censusEntry.occupantNames?.trim() || "—"}
                  />
                  <CensusField
                    label="Discapacidad"
                    value={formatDisabilityDisplay(
                      censusEntry.hasDisability,
                      censusEntry.disabilityType,
                    )}
                  />
                  <CensusField
                    label="Vehículos"
                    value={String(censusEntry.vehicleCount ?? "0")}
                  />
                  <CensusField
                    label="Mascotas"
                    value={String(censusEntry.petCount ?? "0")}
                  />
                </>
              )}
            </dl>
          )
        )}
      </section>

          {showSaveActions || success ? (
            <div className="save-bar" data-census-feedback>
              {(saveError || success) && (
                <div className="save-bar-feedback">
                  {saveError && (
                    <RetryErrorAlert
                      message={saveError}
                      onRetry={saveErrorRetryable ? handleSave : undefined}
                      isRetrying={isSaving}
                    />
                  )}
                  <SuccessAlert show={success} onHidden={() => setSuccess(false)}>
                    Registro guardado correctamente.
                  </SuccessAlert>
                </div>
              )}
              {showSaveActions && (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn-save-global mt-4"
                  >
                    {isSaving ? "Guardando…" : "Guardar registro"}
                  </button>

                  <p className="mt-2 text-xs text-stone-500">
                    Guarda tu respuesta de pernocta para hoy.
                  </p>
                </>
              )}
            </div>
          ) : null}
        </div>

        {buildingTotals && (
          <aside className="page-aside">
            <div className="app-card-compact">
              <h2 className="section-title text-base">Resumen del edificio</h2>
              <p className="mt-1.5 text-sm text-stone-500">
                Totales de hoy en todas las torres.
              </p>
              <StatsBar
                stats={summaryStats}
                layout="stack"
                ariaLabel="Resumen del edificio"
                className="mt-4"
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
