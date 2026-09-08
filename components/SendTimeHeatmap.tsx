import { HeatmapSlot } from "@/lib/queries";

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function SendTimeHeatmap({ data }: { data: HeatmapSlot[] }) {
  const map = new Map<string, number>();
  let max = 0;
  for (const row of data) {
    const rate = Number(row.conversion_rate_pct);
    map.set(`${row.day_of_week}-${row.hour_of_day}`, rate);
    if (rate > max) max = rate;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-[40px_repeat(24,1fr)] gap-[3px] text-[10px] text-muted mb-1">
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="text-center">
              {h % 3 === 0 ? h : ""}
            </div>
          ))}
        </div>
        {DAY_ORDER.map((day) => (
          <div key={day} className="grid grid-cols-[40px_repeat(24,1fr)] gap-[3px] mb-[3px]">
            <div className="text-[11px] text-muted flex items-center">{day}</div>
            {Array.from({ length: 24 }, (_, h) => {
              const rate = map.get(`${day}-${h}`);
              const intensity = rate && max > 0 ? Math.max(0.12, rate / max) : 0;
              return (
                <div
                  key={h}
                  title={rate ? `${day} ${h}:00 — ${rate}% conversion` : "no data"}
                  className="aspect-square rounded-[3px]"
                  style={{
                    background: rate
                      ? `color-mix(in oklab, var(--accent) ${Math.round(intensity * 100)}%, var(--surface-2))`
                      : "var(--surface-2)",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted mt-3">
        Darker = higher conversion rate for that send window (hover a cell for the exact number).
      </p>
    </div>
  );
}
