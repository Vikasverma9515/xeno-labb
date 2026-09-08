const SCHEMA_CONTEXT = `
You are a senior data analyst writing PostgreSQL for "Xeno Analytics Lab", a customer
retention analytics tool for a D2C/retail brand (in the same space as Xeno's CRM product).

Schema you can query:

customer_rfm (view — one row per customer with an order history)
  customer_id, first_name, last_name, persona, last_order_date,
  days_since_last_order, frequency (order count), monetary (total revenue),
  rfm_segment (text: 'Champions' | 'Loyal' | 'New / Potential' | 'At Risk' | 'Dormant' | 'Needs Attention'),
  ltv_tier (text: 'High' | 'Medium' | 'Low')

dim_customer: customer_id, first_name, last_name, email, city, state, persona, signup_date
dim_product:  product_id, name, category, price
fact_orders:  order_id, customer_id, product_id, order_date (timestamp), quantity, unit_price, revenue
fact_campaign_events: event_id, customer_id, channel ('whatsapp'|'sms'|'email'|'digital'),
  sent_at, opened_at, clicked_at, converted_order_id (null if not converted)

Rules:
- Output ONE single read-only PostgreSQL statement (SELECT or WITH ... SELECT). Never write
  INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/GRANT/TRUNCATE, and never chain multiple statements.
- Always add a LIMIT (200 max) unless the query already aggregates to a small number of rows.
- Prefer the customer_rfm view over recomputing RFM logic yourself.
- Respond ONLY with strict JSON: {"sql": "<the query>", "narrative": "<one sentence business takeaway, written as if reporting to a stakeholder>"}
- No markdown, no code fences, no commentary outside that JSON object.
`.trim();

export type AiSqlResult = { sqlText: string; narrative: string; provider: string };

function extractJson(text: string): { sql: string; narrative: string } {
  const cleaned = text.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const jsonSlice = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(jsonSlice);
  if (!parsed.sql || typeof parsed.sql !== "string") throw new Error("model did not return sql");
  return { sql: parsed.sql, narrative: parsed.narrative ?? "" };
}

async function askGroq(question: string): Promise<AiSqlResult> {
  const Groq = (await import("groq-sdk")).default;
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 12_000 });
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.1,
    messages: [
      { role: "system", content: SCHEMA_CONTEXT },
      { role: "user", content: question },
    ],
  });
  const text = completion.choices[0]?.message?.content ?? "";
  const { sql, narrative } = extractJson(text);
  return { sqlText: sql, narrative, provider: `groq:${model}` };
}

async function askGemini(question: string): Promise<AiSqlResult> {
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SCHEMA_CONTEXT }] },
        contents: [{ role: "user", parts: [{ text: question }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(12_000),
    }
  );
  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const { sql, narrative } = extractJson(text);
  return { sqlText: sql, narrative, provider: `gemini:${model}` };
}

export async function generateSqlFromQuestion(question: string): Promise<AiSqlResult> {
  if (process.env.GROQ_API_KEY) return askGroq(question);
  if (process.env.GEMINI_API_KEY) return askGemini(question);
  throw new Error("no_llm_configured");
}

export function guardReadOnlySql(candidate: string): string {
  let q = candidate.trim().replace(/;+\s*$/g, "");
  if (q.includes(";")) throw new Error("multiple statements are not allowed");
  const head = q.slice(0, 10).toLowerCase();
  if (!head.startsWith("select") && !head.startsWith("with")) {
    throw new Error("only SELECT / WITH queries are allowed");
  }
  const forbidden = /\b(insert|update|delete|drop|alter|truncate|grant|revoke|create|copy|call|do)\b/i;
  if (forbidden.test(q)) throw new Error("query contains a disallowed keyword");
  if (!/\blimit\s+\d+/i.test(q)) q += " limit 200";
  return q;
}
