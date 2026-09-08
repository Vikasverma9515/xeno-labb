import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { CHANNEL_PERFORMANCE_SQL } from "@/lib/queries";

const RAW_JOIN_SQL = CHANNEL_PERFORMANCE_SQL.replace(/;\s*$/, "");
const MV_SQL = "select * from mv_channel_segment_performance order by conversion_rate_pct desc";

const INDEX_UP_SQL = `
create index if not exists idx_campaign_events_customer_id on fact_campaign_events (customer_id);
create index if not exists idx_campaign_events_sent_at on fact_campaign_events (sent_at);
create index if not exists idx_campaign_events_converted on fact_campaign_events (customer_id, converted_order_id) where converted_order_id is not null;
create index if not exists idx_orders_customer_id on fact_orders (customer_id);

drop materialized view if exists mv_channel_segment_performance;
create materialized view mv_channel_segment_performance as
select
  r.rfm_segment,
  e.channel,
  count(*)                                                  as events_sent,
  count(*) filter (where e.opened_at is not null)           as opens,
  count(*) filter (where e.converted_order_id is not null)  as conversions,
  round(
    100.0 * count(*) filter (where e.converted_order_id is not null)
    / nullif(count(*), 0), 2
  )                                                          as conversion_rate_pct
from fact_campaign_events e
join customer_rfm r on r.customer_id = e.customer_id
group by r.rfm_segment, e.channel;

create unique index if not exists idx_mv_channel_segment on mv_channel_segment_performance (rfm_segment, channel);
`;

const INDEX_DOWN_SQL = `
drop materialized view if exists mv_channel_segment_performance;
drop index if exists idx_campaign_events_customer_id;
drop index if exists idx_campaign_events_sent_at;
drop index if exists idx_campaign_events_converted;
drop index if exists idx_orders_customer_id;
`;

async function mvPresent() {
  const rows = await sql`
    select exists (
      select 1 from pg_matviews where matviewname = 'mv_channel_segment_performance'
    ) as present
  `;
  return rows[0].present as boolean;
}

export async function GET() {
  const optimized = await mvPresent();
  const queryText = optimized ? MV_SQL : RAW_JOIN_SQL;

  if (!optimized) {
    await sql`analyze fact_campaign_events, fact_orders, dim_customer`;
  }
  const plan = await sql.unsafe(`explain (analyze, buffers, format json) ${queryText}`);
  const planJson = plan[0]["QUERY PLAN"][0];

  return NextResponse.json({
    optimized,
    executionTimeMs: planJson["Execution Time"],
    planningTimeMs: planJson["Planning Time"],
    plan: planJson,
    sql: queryText,
  });
}

export async function POST(req: Request) {
  const { action } = await req.json();
  if (action === "apply") {
    await sql.unsafe(INDEX_UP_SQL);
    return NextResponse.json({ ok: true, optimized: true });
  }
  if (action === "revert") {
    await sql.unsafe(INDEX_DOWN_SQL);
    return NextResponse.json({ ok: true, optimized: false });
  }
  return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
}
