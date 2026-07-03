export const CONNECTIVITY_STATUS_VALUES = ["full", "partial", "none"] as const;

export type ConnectivityStatus = (typeof CONNECTIVITY_STATUS_VALUES)[number];

export const CONNECTIVITY_STATUS_OPTIONS: Array<{
  value: ConnectivityStatus;
  label: string;
}> = [
  {
    value: "full",
    label: "Sí, cuento con los servicios que necesito",
  },
  {
    value: "partial",
    label: "Cuento con ellos parcialmente, presentan problemas",
  },
  {
    value: "none",
    label: "No cuento con ningún servicio",
  },
];

export function isValidConnectivityStatus(
  value: string,
): value is ConnectivityStatus {
  return CONNECTIVITY_STATUS_VALUES.includes(value as ConnectivityStatus);
}

export function getConnectivityStatusLabel(
  value: ConnectivityStatus | null | undefined,
): string {
  if (!value) return "Sin registrar";
  return (
    CONNECTIVITY_STATUS_OPTIONS.find((option) => option.value === value)
      ?.label ?? "Sin registrar"
  );
}
