export default function GaugeCard({
  value,
  label,
  stats,
}: {
  value: number;
  label: string;
  stats: { label: string; value: string; badge?: string; badgeTone?: "success" | "danger" }[];
}) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-medium text-muted">Sales Performance</h2>
      </div>

      <div className="relative flex items-center justify-center py-2">
        <svg viewBox="0 0 200 118" className="w-full max-w-[240px]">
          <path
            d="M 16 108 A 84 84 0 0 1 184 108"
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={14}
            strokeLinecap="round"
            pathLength={100}
          />
          <path
            d="M 16 108 A 84 84 0 0 1 184 108"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={14}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${clamped} ${100 - clamped}`}
          />
          <defs>
            <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#bbf7d0" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <div className="text-3xl font-semibold tracking-tight">{clamped.toFixed(0)}%</div>
          <div className="text-xs text-muted">{label}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        {stats.map((s) => (
          <div key={s.label} className="card-2 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wide text-muted">{s.label}</span>
              {s.badge && (
                <span
                  className="pill text-[10px] px-1.5 py-0.5"
                  style={{
                    color: s.badgeTone === "danger" ? "var(--danger)" : "var(--success)",
                    background: s.badgeTone === "danger" ? "var(--danger-bg)" : "var(--success-bg)",
                  }}
                >
                  {s.badge}
                </span>
              )}
            </div>
            <div className="text-base font-semibold">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
