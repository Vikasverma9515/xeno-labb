import { getChannelPerformance, getSendTimeHeatmap } from "@/lib/queries";
import PageHeader from "@/components/PageHeader";
import ChannelPerformanceChart from "@/components/charts/ChannelPerformanceChart";
import SendTimeHeatmap from "@/components/SendTimeHeatmap";
import { CHANNEL_COLORS } from "@/lib/segment-colors";

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const [perf, heatmap] = await Promise.all([getChannelPerformance(), getSendTimeHeatmap()]);

  const bySegment = new Map<string, Record<string, string | number>>();
  for (const row of perf) {
    const entry = bySegment.get(row.rfm_segment) ?? { segment: row.rfm_segment };
    entry[row.channel] = Number(row.conversion_rate_pct);
    bySegment.set(row.rfm_segment, entry);
  }
  const chartData = Array.from(bySegment.values());

  const bestPerChannel = Object.keys(CHANNEL_COLORS).map((channel) => {
    const rows = perf.filter((r) => r.channel === channel).sort((a, b) => Number(b.conversion_rate_pct) - Number(a.conversion_rate_pct));
    return { channel, best: rows[0] };
  });

  return (
    <div>
      <PageHeader
        title="Channels & Timing"
        subtitle="Which channel converts best for each segment, and when to send — mirrors Xeno's 'best channel' and 'best time' campaign-optimization features."
      />

      <div className="card p-5 mb-4">
        <h2 className="text-sm font-medium text-muted mb-4">Conversion rate by channel × segment</h2>
        <ChannelPerformanceChart data={chartData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
        {bestPerChannel.map(({ channel, best }) => (
          <div key={channel} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full" style={{ background: CHANNEL_COLORS[channel] }} />
              <span className="text-xs uppercase tracking-wide text-muted">{channel}</span>
            </div>
            {best ? (
              <>
                <div className="text-lg font-semibold">{best.conversion_rate_pct}%</div>
                <div className="text-xs text-muted mt-1">best with {best.rfm_segment}</div>
              </>
            ) : (
              <div className="text-xs text-muted">no data</div>
            )}
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium text-muted mb-4">Best send time (all channels)</h2>
        <SendTimeHeatmap data={heatmap} />
      </div>
    </div>
  );
}
