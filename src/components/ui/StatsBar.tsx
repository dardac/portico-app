type StatItem = {
  label: string;
  value: number | string;
  highlight?: boolean;
};

type StatsBarProps = {
  stats: StatItem[];
  className?: string;
  ariaLabel?: string;
  layout?: "grid" | "stack";
};

export function StatsBar({
  stats,
  className = "",
  ariaLabel = "Resumen",
  layout = "grid",
}: StatsBarProps) {
  if (stats.length === 0) return null;

  const gridClassName =
    layout === "stack"
      ? "grid grid-cols-2 gap-2.5"
      : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4";

  return (
    <div
      className={`${gridClassName} ${className}`.trim()}
      role="group"
      aria-label={ariaLabel}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={
            stat.highlight
              ? "rounded-xl border border-brick/20 bg-gradient-to-br from-brick/[0.07] to-white px-3.5 py-3 shadow-sm"
              : "rounded-xl border border-stone-200/70 bg-white px-3.5 py-3 shadow-sm"
          }
        >
          <p className="text-xs font-medium leading-snug text-stone-500">
            {stat.label}
          </p>
          <p
            className={`mt-1 text-xl font-semibold tracking-tight tabular-nums sm:mt-1.5 sm:text-2xl ${
              stat.highlight ? "text-brick" : "text-stone-900"
            }`}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
