import { sql } from "./db";

export type KpiSummary = {
  total_customers: string;
  total_revenue: string;
  total_orders: string;
  repeat_customer_pct: string;
  active_last_30d: string;
};

export async function getKpis(): Promise<KpiSummary> {
  const [row] = await sql<KpiSummary[]>`
    with per_customer as (
      select customer_id, count(*) as orders
      from fact_orders
      group by customer_id
    )
    select
      (select count(*) from dim_customer)::text                                   as total_customers,
      (select to_char(coalesce(sum(revenue),0), 'FM999,999,999,990') from fact_orders) as total_revenue,
      (select count(*) from fact_orders)::text                                    as total_orders,
      (select round(100.0 * count(*) filter (where orders > 1) / nullif(count(*),0), 1)
         from per_customer)::text                                                  as repeat_customer_pct,
      (select count(distinct customer_id) from fact_orders
         where order_date > (select max(order_date) from fact_orders) - interval '30 days')::text as active_last_30d
  `;
  return row;
}

export type RfmSegment = {
  rfm_segment: string;
  customers: string;
  revenue: string;
  avg_days_since_last_order: string;
};

export async function getSegmentBreakdown(): Promise<RfmSegment[]> {
  return sql<RfmSegment[]>`
    select
      rfm_segment,
      count(*)::text as customers,
      to_char(sum(monetary), 'FM999,999,999,990') as revenue,
      round(avg(days_since_last_order))::text as avg_days_since_last_order
    from customer_rfm
    group by rfm_segment
    order by sum(monetary) desc
  `;
}

export type CustomerRow = {
  customer_id: string;
  first_name: string;
  last_name: string;
  persona: string;
  rfm_segment: string;
  ltv_tier: string;
  days_since_last_order: string;
  frequency: string;
  monetary: string;
};

export async function getCustomersBySegment(segment: string | null, limit = 50): Promise<CustomerRow[]> {
  if (segment) {
    return sql<CustomerRow[]>`
      select customer_id::text, first_name, last_name, persona, rfm_segment, ltv_tier,
             days_since_last_order::text, frequency::text, to_char(monetary,'FM999,999,990') as monetary
      from customer_rfm
      where rfm_segment = ${segment}
      order by customer_rfm.monetary desc
      limit ${limit}
    `;
  }
  return sql<CustomerRow[]>`
    select customer_id::text, first_name, last_name, persona, rfm_segment, ltv_tier,
           days_since_last_order::text, frequency::text, to_char(monetary,'FM999,999,990') as monetary
    from customer_rfm
    order by customer_rfm.monetary desc
    limit ${limit}
  `;
}

export type ChannelPerformance = {
  channel: string;
  rfm_segment: string;
  events_sent: string;
  conversions: string;
  conversion_rate_pct: string;
};

// The query at the heart of the Query Lab performance case study.
export const CHANNEL_PERFORMANCE_SQL = `
select
  e.channel,
  r.rfm_segment,
  count(*)                                                  as events_sent,
  count(*) filter (where e.converted_order_id is not null)  as conversions,
  round(
    100.0 * count(*) filter (where e.converted_order_id is not null)
    / nullif(count(*), 0), 2
  )                                                          as conversion_rate_pct
from fact_campaign_events e
join customer_rfm r on r.customer_id = e.customer_id
group by e.channel, r.rfm_segment
order by conversion_rate_pct desc;
`.trim();

export async function getChannelPerformance(): Promise<ChannelPerformance[]> {
  // Reads from the materialized view when present (post-optimization state),
  // falls back to the live join otherwise.
  const [{ exists: mvExists }] = await sql<{ exists: boolean }[]>`
    select exists (
      select 1 from pg_matviews where matviewname = 'mv_channel_segment_performance'
    ) as exists
  `;
  if (mvExists) {
    return sql<ChannelPerformance[]>`
      select channel, rfm_segment, events_sent::text, conversions::text, conversion_rate_pct::text
      from mv_channel_segment_performance
      order by conversion_rate_pct desc
    `;
  }
  return sql<ChannelPerformance[]>`
    select
      e.channel,
      r.rfm_segment,
      count(*)::text as events_sent,
      count(*) filter (where e.converted_order_id is not null)::text as conversions,
      round(100.0 * count(*) filter (where e.converted_order_id is not null) / nullif(count(*),0), 2)::text as conversion_rate_pct
    from fact_campaign_events e
    join customer_rfm r on r.customer_id = e.customer_id
    group by e.channel, r.rfm_segment
    order by conversion_rate_pct desc
  `;
}

export type SendTimeSlot = {
  channel: string;
  day_of_week: string;
  hour_of_day: string;
  events_sent: string;
  conversion_rate_pct: string;
};

export async function getBestSendTimes(): Promise<SendTimeSlot[]> {
  return sql<SendTimeSlot[]>`
    select
      channel,
      to_char(sent_at, 'Dy')                as day_of_week,
      extract(hour from sent_at)::text      as hour_of_day,
      count(*)::text                        as events_sent,
      round(100.0 * count(*) filter (where converted_order_id is not null) / nullif(count(*),0), 2)::text as conversion_rate_pct
    from fact_campaign_events
    group by channel, to_char(sent_at, 'Dy'), extract(hour from sent_at), extract(dow from sent_at)
    having count(*) > 20
    order by conversion_rate_pct desc
    limit 500
  `;
}

export type HeatmapSlot = {
  day_of_week: string;
  hour_of_day: string;
  events_sent: string;
  conversion_rate_pct: string;
};

export async function getSendTimeHeatmap(): Promise<HeatmapSlot[]> {
  return sql<HeatmapSlot[]>`
    select
      to_char(sent_at, 'Dy')            as day_of_week,
      extract(hour from sent_at)::text  as hour_of_day,
      count(*)::text                    as events_sent,
      round(100.0 * count(*) filter (where converted_order_id is not null) / nullif(count(*),0), 2)::text as conversion_rate_pct
    from fact_campaign_events
    group by to_char(sent_at, 'Dy'), extract(hour from sent_at), extract(dow from sent_at)
    order by extract(dow from sent_at), extract(hour from sent_at)
  `;
}

export type RevenueTrendPoint = { month: string; revenue: string; orders: string };

export async function getRevenueTrend(): Promise<RevenueTrendPoint[]> {
  return sql<RevenueTrendPoint[]>`
    select
      to_char(date_trunc('month', order_date), 'YYYY-MM') as month,
      round(sum(revenue))::text as revenue,
      count(*)::text as orders
    from fact_orders
    group by 1
    order by 1
  `;
}
