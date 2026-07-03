export const CONNECTION_ERROR_MESSAGE =
  "Error de conexión. Verifica tu internet e intenta de nuevo.";

export function isRetryableHttpStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

export type FetchJsonResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; retryable: boolean; status?: number };

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<FetchJsonResult<T>> {
  try {
    const response = await fetch(url, init);
    let data: T & { error?: string };

    try {
      data = await response.json();
    } catch {
      return {
        ok: false,
        error: response.ok
          ? "Respuesta inválida del servidor."
          : CONNECTION_ERROR_MESSAGE,
        retryable: true,
        status: response.status,
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        error: data.error ?? "Ocurrió un error inesperado.",
        retryable: isRetryableHttpStatus(response.status),
        status: response.status,
      };
    }

    return { ok: true, data, status: response.status };
  } catch {
    return { ok: false, error: CONNECTION_ERROR_MESSAGE, retryable: true };
  }
}
