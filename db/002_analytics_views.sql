-- Xeno Analytics Lab — core analytics, mirroring Xeno's own product surface:
-- RFM segmentation, dormant/at-risk detection, predicted-LTV tiering.

create or replace view customer_rfm as
with order_stats as (
  select
    customer_id,
    max(order_date)                         as last_order_date,
    count(*)                                as frequency,
    sum(revenue)                            as monetary,
    (select max(order_date) from fact_orders) - max(order_date) as recency_gap
  from fact_orders
  group by customer_id
),
scored as (
  select
    customer_id,
    last_order_date,
    extract(day from recency_gap)::int      as days_since_last_order,
    frequency,
    monetary,
    ntile(4) over (order by recency_gap desc) as r_score,   -- smallest gap (most recent) sorts last -> bucket 4 = best
    ntile(4) over (order by frequency asc)    as f_score,
    ntile(4) over (order by monetary asc)     as m_score
  from order_stats
)
select
  s.customer_id,
  c.first_name,
  c.last_name,
  c.persona,
  s.last_order_date,
  s.days_since_last_order,
  s.frequency,
  s.monetary,
  s.r_score, s.f_score, s.m_score,
  (s.r_score + s.f_score + s.m_score)                        as rfm_total,
  case
    when s.r_score >= 4 and s.f_score >= 4 and s.m_score >= 4 then 'Champions'
    when s.r_score >= 3 and s.f_score >= 3                    then 'Loyal'
    when s.r_score >= 3 and s.f_score <= 2                    then 'New / Potential'
    when s.r_score <= 2 and s.f_score >= 3                    then 'At Risk'
    when s.r_score <= 2 and s.f_score <= 2 and s.m_score <= 2 then 'Dormant'
    else 'Needs Attention'
  end                                                          as rfm_segment,
  case
    when s.m_score = 4 then 'High'
    when s.m_score >= 2 then 'Medium'
    else 'Low'
  end                                                          as ltv_tier
from scored s
join dim_customer c on c.customer_id = s.customer_id;
