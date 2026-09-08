import { getSegmentBreakdown, getCustomersBySegment } from "@/lib/queries";
import { SEGMENT_PLAYBOOK } from "@/lib/segment-playbook";
import { segmentColor } from "@/lib/segment-colors";
import PageHeader from "@/components/PageHeader";
import SegmentBadge from "@/components/SegmentBadge";
import Link from "next/link";

export const dynamic = "force-dynamic";

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export default async function SegmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ segment?: string }>;
}) {
  const { segment } = await searchParams;
  const [segments, customers] = await Promise.all([
    getSegmentBreakdown(),
    getCustomersBySegment(segment ?? null, 50),
  ]);

  return (
    <div>
      <PageHeader
        title="RFM Segments"
        subtitle="Recency / Frequency / Monetary scoring, computed in SQL (see customer_rfm view) — the same segmentation logic Xeno's CRM uses to decide who gets which campaign."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {segments.map((s) => {
          const isActive = segment === s.rfm_segment;
          const color = segmentColor(s.rfm_segment);
          return (
            <Link
              key={s.rfm_segment}
              href={isActive ? "/segments" : `/segments?segment=${encodeURIComponent(s.rfm_segment)}`}
              className="card p-4 block transition-shadow hover:shadow-md"
              style={isActive ? { borderColor: color.fg, boxShadow: `0 0 0 3px ${color.bg}` } : undefined}
            >
              <div className="flex items-center justify-between mb-3">
                <SegmentBadge segment={s.rfm_segment} />
                <span className="text-xs text-muted">{Number(s.customers).toLocaleString()} customers</span>
              </div>
              <div className="text-lg font-semibold mb-2">₹{s.revenue}</div>
              <p className="text-xs text-muted leading-relaxed">{SEGMENT_PLAYBOOK[s.rfm_segment]}</p>
            </Link>
          );
        })}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">
            {segment ? (
              <>
                Customers in <span style={{ color: segmentColor(segment).fg }}>{segment}</span>
              </>
            ) : (
              "Top customers by revenue"
            )}
          </h2>
          {segment && (
            <Link href="/segments" className="text-xs text-accent hover:underline">
              Clear filter ×
            </Link>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted text-xs uppercase tracking-wide border-b border-border">
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 font-medium">Segment</th>
                <th className="pb-2 font-medium">LTV tier</th>
                <th className="pb-2 font-medium">Orders</th>
                <th className="pb-2 font-medium">Revenue</th>
                <th className="pb-2 font-medium">Days since last order</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const seg = segmentColor(c.rfm_segment);
                return (
                  <tr key={c.customer_id} className="border-b border-border/70 last:border-0">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                          style={{ background: seg.bg, color: seg.fg }}
                        >
                          {initials(c.first_name, c.last_name)}
                        </div>
                        <div>
                          <div className="font-medium">{c.first_name} {c.last_name}</div>
                          <div className="text-xs text-muted">{c.persona}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5"><SegmentBadge segment={c.rfm_segment} /></td>
                    <td className="py-2.5 text-muted">{c.ltv_tier}</td>
                    <td className="py-2.5">{c.frequency}</td>
                    <td className="py-2.5 font-medium">₹{c.monetary}</td>
                    <td className="py-2.5 text-muted">{c.days_since_last_order}d</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
