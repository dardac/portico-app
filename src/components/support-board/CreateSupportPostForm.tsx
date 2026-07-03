"use client";

import { FormEvent, useState } from "react";
import { ApartmentField } from "@/components/ApartmentField";
import { RetryErrorAlert } from "@/components/ui/RetryErrorAlert";
import { fetchJson } from "@/lib/fetch-client";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_POST_TYPES,
  SUPPORT_POST_TYPE_LABELS,
  type SupportCategory,
  type SupportPostType,
} from "@/lib/support-board/constants";
import type { SupportPostDto } from "@/lib/support-board/map-post";
import {
  formatApartmentInput,
  isValidApartment,
  isValidPhone,
  MAX_SUPPORT_DESCRIPTION_LENGTH,
} from "@/lib/validators";

type CreateSupportPostFormProps = {
  defaultApartmentCode?: string;
  lockApartment?: boolean;
  onSuccess?: (post: SupportPostDto) => void;
  onCancel?: () => void;
};

type FormState = {
  postType: SupportPostType;
  category: SupportCategory;
  apartmentCode: string;
  description: string;
  contactName: string;
  contactPhone: string;
};

function buildInitialState(defaultApartmentCode: string): FormState {
  return {
    postType: "need",
    category: "potable_water",
    apartmentCode: defaultApartmentCode,
    description: "",
    contactName: "",
    contactPhone: "",
  };
}

function validateForm(form: FormState): string | null {
  if (!isValidApartment(form.apartmentCode)) {
    return "Indica un apartamento válido (ej. 11-D).";
  }

  if (!form.description.trim()) {
    return "Describe la ayuda o necesidad.";
  }

  if (!form.contactName.trim()) {
    return "Indica el nombre de contacto.";
  }

  if (!isValidPhone(form.contactPhone)) {
    return "Indica un teléfono válido (mínimo 10 dígitos).";
  }

  return null;
}

export function CreateSupportPostForm({
  defaultApartmentCode = "",
  lockApartment = false,
  onSuccess,
  onCancel,
}: CreateSupportPostFormProps) {
  const [form, setForm] = useState<FormState>(() =>
    buildInitialState(defaultApartmentCode),
  );
  const [error, setError] = useState<string | null>(null);
  const [errorRetryable, setErrorRetryable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitPost() {
    setError(null);
    setErrorRetryable(false);
    setIsSubmitting(true);

    const result = await fetchJson<{ post: SupportPostDto; error?: string }>(
      "/api/support-board",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      },
    );

    if (!result.ok) {
      setError(result.error);
      setErrorRetryable(result.retryable);
      setIsSubmitting(false);
      return;
    }

    setForm(buildInitialState(defaultApartmentCode));
    onSuccess?.(result.data.post);
    setIsSubmitting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setErrorRetryable(false);

    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    await submitPost();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <RetryErrorAlert
          message={error}
          onRetry={errorRetryable ? () => void submitPost() : undefined}
          isRetrying={isSubmitting}
        />
      )}

      <fieldset>
        <legend className="field-label">Tipo de publicación</legend>
        <div className="segmented mt-1.5" role="group" aria-label="Tipo de publicación">
          {SUPPORT_POST_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              disabled={isSubmitting}
              aria-pressed={form.postType === type}
              onClick={() =>
                setForm((current) => ({ ...current, postType: type }))
              }
              className={`segmented-btn ${
                form.postType === type
                  ? "segmented-btn-active"
                  : "segmented-btn-inactive"
              }`}
            >
              {SUPPORT_POST_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="support-category" className="field-label">
          Categoría
          <span aria-hidden="true"> *</span>
          <span className="sr-only"> (obligatorio)</span>
        </label>
        <select
          id="support-category"
          value={form.category}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              category: event.target.value as SupportCategory,
            }))
          }
          disabled={isSubmitting}
          required
          className="field-input"
        >
          {SUPPORT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {SUPPORT_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </div>

      <ApartmentField
        id="support-apartment"
        value={form.apartmentCode}
        onChange={(value) =>
          setForm((current) => ({
            ...current,
            apartmentCode: formatApartmentInput(value),
          }))
        }
        disabled={isSubmitting}
        readOnly={lockApartment}
        error={
          form.apartmentCode && !isValidApartment(form.apartmentCode)
            ? "Formato inválido."
            : undefined
        }
      />

      <div>
        <label htmlFor="support-description" className="field-label">
          Descripción de la ayuda o necesidad
          <span aria-hidden="true"> *</span>
          <span className="sr-only"> (obligatorio)</span>
        </label>
        <textarea
          id="support-description"
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              description: event.target.value.slice(
                0,
                MAX_SUPPORT_DESCRIPTION_LENGTH,
              ),
            }))
          }
          disabled={isSubmitting}
          required
          rows={4}
          className="field-input resize-y"
          placeholder="Explica qué necesitas u ofreces con el mayor detalle posible."
        />
      </div>

      <div>
        <label htmlFor="support-contact-name" className="field-label">
          Nombre de contacto
          <span aria-hidden="true"> *</span>
          <span className="sr-only"> (obligatorio)</span>
        </label>
        <input
          id="support-contact-name"
          type="text"
          value={form.contactName}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              contactName: event.target.value,
            }))
          }
          disabled={isSubmitting}
          required
          autoComplete="name"
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="support-contact-phone" className="field-label">
          Teléfono de contacto
          <span aria-hidden="true"> *</span>
          <span className="sr-only"> (obligatorio)</span>
        </label>
        <input
          id="support-contact-phone"
          type="tel"
          inputMode="tel"
          value={form.contactPhone}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              contactPhone: event.target.value,
            }))
          }
          disabled={isSubmitting}
          required
          autoComplete="tel"
          placeholder="0412-1234567"
          className="field-input"
        />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="btn-ghost"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="page-header-action w-full justify-center sm:w-auto"
        >
          {isSubmitting ? "Publicando…" : "Publicar"}
        </button>
      </div>
    </form>
  );
}
