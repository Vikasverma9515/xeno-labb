import { LucideIcon } from "lucide-react";

export default function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "var(--accent)",
  accentBg = "var(--seg-champions-bg)",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent?: string;
  accentBg?: string;
}) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted font-medium">{label}</span>
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center"
          style={{ background: accentBg }}
        >
          <Icon size={16} style={{ color: accent }} />
        </div>
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}
