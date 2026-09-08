-- Xeno Analytics Lab — performance case study, part 2 (the fix).
--
-- THE QUERY (channel performance by RFM segment — "which channel should each
-- segment get?"): joins fact_campaign_events (millions of rows) to fact_orders
-- and dim_customer, grouped by channel + segment. See app/lib/queries.ts ->
-- CHANNEL_PERFORMANCE_QUERY for the exact SQL and app/query-lab for the live
-- before/after demo (it runs EXPLAIN ANALYZE against whichever state the DB
-- is currently in).
--
-- BEFORE (fresh from 001_schema.sql): fact_campaign_events has only a primary
-- key. The join predicate on customer_id and the conversion filter both force
-- a sequential scan of the whole table, so cost grows linearly with event
-- volume — fine at 50k rows, painful at 5M.
--
-- AFTER (this file): composite/covering indexes that match the query's join
-- and filter columns, plus a materialized view for the "channel x segment"
-- rollup so the dashboard's summary cards don't recompute the full join on
-- every page load.

create index if not exists idx_campaign_events_customer_id
  on fact_campaign_events (customer_id);

create index if not exists idx_campaign_events_sent_at
  on fact_campaign_events (sent_at);

-- Covers "was this event a conversion" without a heap fetch.
create index if not exists idx_campaign_events_converted
  on fact_campaign_events (customer_id, converted_order_id)
  where converted_order_id is not null;

create index if not exists idx_orders_customer_id
  on fact_orders (customer_id);

-- Rollup used by the dashboard's "Channel x Segment" summary cards —
-- recomputing this on every request is wasteful once event volume is large;
-- refresh it on a schedule (or after each seed/batch load) instead.
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

create unique index if not exists idx_mv_channel_segment
  on mv_channel_segment_performance (rfm_segment, channel);

-- Re-run after any large batch load:
--   refresh materialized view concurrently mv_channel_segment_performance;
