import { getKpis, getRevenueTrend, getSegmentBreakdown, getCustomersBySegment } from "@/lib/queries";
import KpiCard from "@/components/KpiCard";
import PageHeader from "@/components/PageHeader";
import RevenueTrendChart from "@/components/charts/RevenueTrendChart";
import GaugeCard from "@/components/GaugeCard";
import SegmentBadge from "@/components/SegmentBadge";
import { segmentColor } from "@/lib/segment-colors";
import { Users, IndianRupee, ShoppingBag, Repeat, Search, SlidersHorizontal, Download, MoreHorizontal } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const LTV_TONE: Record<string, { fg: string; bg: string; label: string }> = {
  High: { fg: "var(--success)", bg: "var(--success-bg)", label: "High value" },
  Medium: { fg: "var(--info)", bg: "var(--info-bg)", label: "Medium value" },
  Low: { fg: "var(--muted)", bg: "var(--surface-2)", label: "Low value" },
};

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export default async function OverviewPage() {
  const [kpis, trend, segments, topCustomers] = await Promise.all([
    getKpis(),
    getRevenueTrend(),
    getSegmentBreakdown(),
    getCustomersBySegment(null, 7),
  ]);

  const totalRevenue = segments.reduce((sum, s) => sum + Number(s.revenue.replace(/,/g, "")), 0);

  return (
    <div>
      <PageHeader
        title="Welcome back 👋"
        subtitle="Repeat-revenue intelligence for a D2C retail customer base — modeled on the RFM segmentation and channel-optimization approach Xeno's own CRM uses for its clients."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard label="Total Customers" value={Number(kpis.total_customers).toLocaleString()} icon={Users} accent="var(--accent)" accentBg="var(--seg-champions-bg)" />
        <KpiCard label="Total Revenue" value={`₹${kpis.total_revenue}`} icon={IndianRupee} accent="var(--success)" accentBg="var(--success-bg)" />
        <KpiCard label="Total Orders" value={Number(kpis.total_orders).toLocaleString()} icon={ShoppingBag} accent="var(--info)" accentBg="var(--info-bg)" />
        <KpiCard
          label="Repeat Customer Rate"
          value={`${kpis.repeat_customer_pct}%`}
          hint={`${Number(kpis.active_last_30d).toLocaleString()} active in last 30 days`}
          icon={Repeat}
          accent="var(--warning)"
          accentBg="var(--warning-bg)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="card hero-gradient p-5 lg:col-span-2">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-sm font-medium text-foreground/70">Total Revenue Overview</h2>
              <div className="text-3xl font-semibold tracking-tight mt-1">₹{kpis.total_revenue}</div>
              <div className="text-xs text-muted mt-1">across {kpis.total_orders} orders, last 8 months shown</div>
            </div>
            <button className="btn-ghost h-8 w-8 rounded-full flex items-center justify-center bg-white/70">
              <MoreHorizontal size={15} />
            </button>
          </div>
          <RevenueTrendChart data={trend} />
        </div>

        <GaugeCard
          value={Number(kpis.repeat_customer_pct)}
          label="Repeat Purchase Goal"
          stats={[
            { label: "Active (30d)", value: Number(kpis.active_last_30d).toLocaleString(), badge: "+", badgeTone: "success" },
            { label: "Total Orders", value: Number(kpis.total_orders).toLocaleString() },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold flex-1">Top Customers by Revenue</h2>
            <div className="hidden sm:flex items-center gap-2 bg-surface-2 border border-border rounded-full px-3 py-1.5">
              <Search size={13} className="text-muted" />
              <span className="text-xs text-muted">Search…</span>
            </div>
            <button className="btn-ghost h-8 w-8 rounded-full flex items-center justify-center shrink-0">
              <SlidersHorizontal size={13} />
            </button>
            <button className="btn-primary h-8 px-3 flex items-center gap-1.5 text-xs shrink-0">
              <Download size={12} /> Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs uppercase tracking-wide border-b border-border">
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Segment</th>
                  <th className="pb-2 font-medium">Orders</th>
                  <th className="pb-2 font-medium">Revenue</th>
                  <th className="pb-2 font-medium">Value tier</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c) => {
                  const tone = LTV_TONE[c.ltv_tier] ?? LTV_TONE.Low;
                  const seg = segmentColor(c.rfm_segment);
                  return (
                    <tr key={c.customer_id} className="border-b border-border/70 last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                            style={{ background: seg.bg, color: seg.fg }}
                          >
                            {initials(c.first_name, c.last_name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{c.first_name} {c.last_name}</div>
                            <div className="text-xs text-muted truncate">{c.persona}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3"><SegmentBadge segment={c.rfm_segment} /></td>
                      <td className="py-3 text-muted">{c.frequency}</td>
                      <td className="py-3 font-medium">₹{c.monetary}</td>
                      <td className="py-3">
                        <span className="pill" style={{ color: tone.fg, background: tone.bg }}>{tone.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Top Segments</h2>
            <Link href="/segments" className="text-xs text-accent hover:underline">Explore →</Link>
          </div>
          <div className="space-y-2.5">
            {segments.map((s) => {
              const share = totalRevenue > 0 ? (Number(s.revenue.replace(/,/g, "")) / totalRevenue) * 100 : 0;
              const seg = segmentColor(s.rfm_segment);
              return (
                <div key={s.rfm_segment} className="flex items-center gap-3 card-2 px-3.5 py-3">
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: seg.bg }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: seg.fg }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{s.rfm_segment}</div>
                    <div className="text-xs text-muted">₹{s.revenue}</div>
                  </div>
                  <span className="pill text-[11px]" style={{ color: seg.fg, background: seg.bg }}>
                    {share.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
