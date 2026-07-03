"use client";

import { useEffect, useState } from "react";
import { CreateSupportPostForm } from "@/components/support-board/CreateSupportPostForm";
import { AppModal } from "@/components/ui/AppModal";
import { RetryErrorAlert } from "@/components/ui/RetryErrorAlert";
import { SuccessAlert } from "@/components/ui/SuccessAlert";
import { fetchJson } from "@/lib/fetch-client";
import { formatDateTimeInCaracas } from "@/lib/dates";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  type SupportCategory,
} from "@/lib/support-board/constants";
import type { SupportPostDto } from "@/lib/support-board/map-post";

type CategoryFilter = SupportCategory | "all";

type SupportBoardListProps = {
  canMarkAttended: boolean;
  defaultApartmentCode?: string;
  lockApartment?: boolean;
};

type PendingAction =
  | { type: "close"; postId: string }
  | { type: "attend"; postId: string };

export function SupportBoardList({
  canMarkAttended,
  defaultApartmentCode = "",
  lockApartment = false,
}: SupportBoardListProps) {
  const [posts, setPosts] = useState<SupportPostDto[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorRetryable, setErrorRetryable] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [failedAction, setFailedAction] = useState<PendingAction | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionPostId, setActionPostId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadPosts() {
      setIsLoading(true);
      setError(null);
      setErrorRetryable(false);

      const url =
        categoryFilter === "all"
          ? "/api/support-board"
          : `/api/support-board?category=${categoryFilter}`;

      try {
        const response = await fetch(url, { signal: controller.signal });
        const data = await response.json();

        if (!response.ok) {
          setError(data.error ?? "No se pudo cargar la cartelera.");
          setErrorRetryable(true);
          setPosts([]);
          return;
        }

        setPosts(data.posts ?? []);
      } catch (fetchError) {
        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        ) {
          return;
        }
        setError("Error de conexión al cargar la cartelera.");
        setErrorRetryable(true);
        setPosts([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadPosts();
    return () => controller.abort();
  }, [categoryFilter, reloadKey]);

  function retryLoad() {
    setReloadKey((current) => current + 1);
  }

  async function runAction(action: PendingAction) {
    const { type, postId } = action;
    setActionPostId(postId);
    setError(null);
    setErrorRetryable(false);
    setFailedAction(null);

    const endpoint =
      type === "close"
        ? `/api/support-board/${postId}/close`
        : `/api/support-board/${postId}/attend`;

    const result = await fetchJson<{ post: SupportPostDto; error?: string }>(
      endpoint,
      { method: "PATCH" },
    );

    if (!result.ok) {
      setError(result.error);
      setErrorRetryable(result.retryable);
      setFailedAction(action);
      setActionPostId(null);
      return;
    }

    setPosts((current) =>
      current.map((post) => (post.id === postId ? result.data.post : post)),
    );

    if (type === "attend") {
      setSuccessMessage("Publicación marcada como atendida.");
    }

    setActionPostId(null);
  }

  async function executePendingAction() {
    if (!pendingAction) return;

    const action = pendingAction;
    setPendingAction(null);
    await runAction(action);
  }

  function retryLastAction() {
    if (!failedAction) return;
    void runAction(failedAction);
  }

  const openCount = posts.filter((post) => post.isOpen).length;
  const hasPosts = posts.length > 0;
  const isFiltered = categoryFilter !== "all";

  function handleCreateSuccess(post: SupportPostDto) {
    setCreateModalOpen(false);
    setSuccessMessage("Publicación creada correctamente.");

    const matchesFilter =
      categoryFilter === "all" || post.category === categoryFilter;

    if (matchesFilter) {
      setPosts((current) => [post, ...current]);
    } else {
      setCategoryFilter("all");
    }
  }

  return (
    <div className="space-y-6">
      <header className="page-header">
        <div className="page-header-row">
          <div className="page-header-main">
            <h1 className="page-title">Cartelera de apoyo</h1>
            <p className="page-subtitle">
              Publica o consulta necesidades y ofertas de ayuda entre vecinos.
              {openCount > 0 && (
                <span className="mt-1 block text-stone-400">
                  {openCount} publicación{openCount === 1 ? "" : "es"} activa
                  {openCount === 1 ? "" : "s"}.
                </span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="page-header-action"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Nueva publicación
          </button>
        </div>
      </header>

      <SuccessAlert
        show={successMessage !== null}
        onHidden={() => setSuccessMessage(null)}
      >
        {successMessage}
      </SuccessAlert>

      <div className="bulletin-filters" role="group" aria-label="Filtrar por categoría">
        <button
          type="button"
          aria-pressed={categoryFilter === "all"}
          onClick={() => setCategoryFilter("all")}
          className={`bulletin-filter-chip ${
            categoryFilter === "all" ? "bulletin-filter-chip--active" : ""
          }`}
        >
          Todas
        </button>
        {SUPPORT_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={categoryFilter === category}
            onClick={() => setCategoryFilter(category)}
            className={`bulletin-filter-chip ${
              categoryFilter === category ? "bulletin-filter-chip--active" : ""
            }`}
          >
            {SUPPORT_CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      {error && (
        <RetryErrorAlert
          message={error}
          onRetry={
            failedAction
              ? retryLastAction
              : errorRetryable
                ? retryLoad
                : undefined
          }
          isRetrying={isLoading || actionPostId !== null}
        />
      )}

      {isLoading ? (
        <div className="app-card py-16 text-center text-sm text-stone-400">
          Cargando publicaciones…
        </div>
      ) : !hasPosts ? (
        <div className="bulletin-empty">
          <p className="bulletin-empty-title">
            {isFiltered
              ? "No hay publicaciones en esta categoría"
              : "Aún no hay publicaciones"}
          </p>
          <p className="bulletin-empty-text">
            {isFiltered
              ? "Prueba otra categoría o crea una nueva publicación."
              : "Sé la primera persona en pedir u ofrecer ayuda en el edificio."}
          </p>
          {isFiltered ? (
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className="btn-ghost mt-4"
            >
              Ver todas
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="page-header-action mt-4"
            >
              Crear publicación
            </button>
          )}
        </div>
      ) : (
        <ul className="bulletin-list">
          {posts.map((post) => (
            <li
              key={post.id}
              className={`bulletin-card ${
                !post.isOpen ? "bulletin-card--attended" : ""
              }`}
            >
              <div className="bulletin-card-header">
                <div className="bulletin-card-badges">
                  <span
                    className={`bulletin-type-badge ${
                      post.postType === "need"
                        ? "bulletin-type-badge--need"
                        : "bulletin-type-badge--offer"
                    }`}
                  >
                    {post.postTypeLabel}
                  </span>
                  <span className="bulletin-category-badge">
                    {post.categoryLabel}
                  </span>
                  {!post.isOpen && (
                    <span className="bulletin-status-badge">
                      {post.statusLabel}
                    </span>
                  )}
                </div>
                <p className="bulletin-card-meta">
                  Apto. {post.apartmentCode} ·{" "}
                  {formatDateTimeInCaracas(post.createdAt)}
                </p>
              </div>

              <p className="bulletin-card-description">{post.description}</p>

              <div className="bulletin-contact">
                <p className="bulletin-contact-label">Contacto</p>
                <p className="bulletin-contact-name">{post.contactName}</p>
                <a
                  href={`tel:${post.contactPhone.replace(/\D/g, "")}`}
                  className="bulletin-contact-phone"
                >
                  {post.contactPhone}
                </a>
              </div>

              {(post.isOwnPost && post.isOpen) ||
              (canMarkAttended && post.isOpen) ? (
                <div className="bulletin-card-actions">
                  {post.isOwnPost && post.isOpen && (
                    <button
                      type="button"
                      onClick={() =>
                        setPendingAction({ type: "close", postId: post.id })
                      }
                      disabled={actionPostId === post.id}
                      className="btn-ghost bulletin-attend-btn"
                    >
                      {actionPostId === post.id
                        ? "Cerrando…"
                        : "Cerrar publicación"}
                    </button>
                  )}
                  {canMarkAttended && post.isOpen && (
                    <button
                      type="button"
                      onClick={() =>
                        setPendingAction({ type: "attend", postId: post.id })
                      }
                      disabled={actionPostId === post.id}
                      className="btn-primary bulletin-attend-btn"
                    >
                      {actionPostId === post.id
                        ? "Guardando…"
                        : "Marcar ayuda atendida"}
                    </button>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <AppModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Nueva publicación"
        description="Indica si necesitas u ofreces ayuda para que otros vecinos puedan contactarte."
      >
        <CreateSupportPostForm
          key={createModalOpen ? "open" : "closed"}
          defaultApartmentCode={defaultApartmentCode}
          lockApartment={lockApartment}
          onSuccess={handleCreateSuccess}
          onCancel={() => setCreateModalOpen(false)}
        />
      </AppModal>

      <AppModal
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        title={
          pendingAction?.type === "close"
            ? "¿Cerrar publicación?"
            : "¿Marcar como atendida?"
        }
        description={
          pendingAction?.type === "close"
            ? "La publicación dejará de mostrarse como activa. Esta acción no se puede deshacer."
            : "Confirma que la ayuda solicitada ya fue atendida."
        }
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setPendingAction(null)}
            className="btn-ghost"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={executePendingAction}
            className="btn-primary sm:w-auto"
          >
            Confirmar
          </button>
        </div>
      </AppModal>
    </div>
  );
}
