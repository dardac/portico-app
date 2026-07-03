"use client";

type RetryErrorAlertProps = {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  retryLabel?: string;
  className?: string;
};

export function RetryErrorAlert({
  message,
  onRetry,
  isRetrying = false,
  retryLabel = "Reintentar",
  className = "",
}: RetryErrorAlertProps) {
  return (
    <div
      role="alert"
      className={`alert-error ${onRetry ? "alert-error-retry" : ""} ${className}`.trim()}
    >
      <p className="min-w-0 flex-1">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="btn-ghost shrink-0"
        >
          {isRetrying ? "Reintentando…" : retryLabel}
        </button>
      )}
    </div>
  );
}
