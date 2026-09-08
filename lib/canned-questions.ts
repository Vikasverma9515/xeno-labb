// Keyword-matched fallback used when no GROQ_API_KEY / GEMINI_API_KEY is configured.
// Every entry is a real query that actually executes — only the "understanding what
// you asked" step is templated instead of LLM-generated.

export type CannedEntry = { keywords: string[]; sql: string; narrative: string };

export const CANNED_QUESTIONS: CannedEntry[] = [
  {
    keywords: ["dormant", "churn", "win-back", "win back", "at risk", "inactive"],
    sql: `
      select rfm_segment, count(*) as customers, round(avg(days_since_last_order)) as avg_days_inactive,
             to_char(sum(monetary), 'FM999,999,990') as revenue_at_stake
      from customer_rfm
      where rfm_segment in ('At Risk', 'Dormant')
      group by rfm_segment
      order by revenue_at_stake desc
      limit 200`,
    narrative: "These are the customers who used to buy and have gone quiet — prioritize them for a win-back flow before that revenue is fully lost.",
  },
  {
    keywords: ["champion", "best customer", "top customer", "vip", "loyal"],
    sql: `
      select first_name, last_name, persona, frequency, to_char(monetary,'FM999,999,990') as lifetime_revenue
      from customer_rfm
      where rfm_segment in ('Champions', 'Loyal')
      order by monetary desc
      limit 50`,
    narrative: "Your highest-value, most engaged customers — protect this segment with VIP treatment rather than generic blasts.",
  },
  {
    keywords: ["channel", "whatsapp", "sms", "email", "digital", "convert"],
    sql: `
      select e.channel, r.rfm_segment,
             count(*) as events_sent,
             count(*) filter (where e.converted_order_id is not null) as conversions,
             round(100.0 * count(*) filter (where e.converted_order_id is not null) / nullif(count(*),0), 2) as conversion_rate_pct
      from fact_campaign_events e
      join customer_rfm r on r.customer_id = e.customer_id
      group by e.channel, r.rfm_segment
      order by conversion_rate_pct desc
      limit 200`,
    narrative: "Conversion rate by channel and segment — route each segment to whichever channel actually converts them, not the cheapest one.",
  },
  {
    keywords: ["best time", "send time", "when should", "hour", "schedule"],
    sql: `
      select channel, to_char(sent_at, 'Dy') as day_of_week, extract(hour from sent_at) as hour_of_day,
             count(*) as events_sent,
             round(100.0 * count(*) filter (where converted_order_id is not null) / nullif(count(*),0), 2) as conversion_rate_pct
      from fact_campaign_events
      group by channel, to_char(sent_at, 'Dy'), extract(hour from sent_at)
      having count(*) > 20
      order by conversion_rate_pct desc
      limit 25`,
    narrative: "The highest-converting send windows by channel — schedule campaigns here instead of at a fixed default time.",
  },
  {
    keywords: ["ltv", "lifetime value", "high value", "value tier"],
    sql: `
      select ltv_tier, count(*) as customers, to_char(sum(monetary),'FM999,999,990') as total_revenue,
             to_char(avg(monetary),'FM999,990') as avg_revenue_per_customer
      from customer_rfm
      group by ltv_tier
      order by total_revenue desc
      limit 200`,
    narrative: "Revenue concentration by predicted lifetime-value tier — a small High tier usually drives a disproportionate share of revenue.",
  },
  {
    keywords: ["segment", "rfm", "breakdown", "overview", "how many customers"],
    sql: `
      select rfm_segment, count(*) as customers, to_char(sum(monetary),'FM999,999,990') as revenue
      from customer_rfm
      group by rfm_segment
      order by revenue desc
      limit 200`,
    narrative: "The full RFM segment breakdown — where your customer base and revenue actually sit today.",
  },
];

export function matchCannedQuestion(question: string): CannedEntry {
  const q = question.toLowerCase();
  const hit = CANNED_QUESTIONS.find((c) => c.keywords.some((k) => q.includes(k)));
  return hit ?? CANNED_QUESTIONS[5];
}
