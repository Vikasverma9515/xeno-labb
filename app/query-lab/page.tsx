"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import PlanTree from "@/components/PlanTree";
import { Play, Zap, RotateCcw, Loader2 } from "lucide-react";

type PlanResult = {
  optimized: boolean;
  executionTimeMs: number;
  planningTimeMs: number;
  plan: { Plan: Record<string, unknown> };
  sql: string;
};

export default function QueryLabPage() {
  const [result, setResult] = useState<PlanResult | null>(null);
  const [loading, setLoading] = useState<"run" | "apply" | "revert" | null>(null);
  const [history, setHistory] = useState<{ optimized: boolean; ms: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function runExplain() {
    setLoading("run");
    setError(null);
    try {
      const res = await fetch("/api/query-lab");
      if (!res.ok) throw new Error(await res.text());
      const data: PlanResult = await res.json();
      setResult(data);
      setHistory((h) => [...h, { optimized: data.optimized, ms: data.executionTimeMs }].slice(-8));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  }

  async function toggleIndexes(action: "apply" | "revert") {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch("/api/query-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(await res.text());
      await runExplain();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    runExplain();
  }, []);

  return (
    <div>
      <PageHeader
        title="Query Lab"
        subtitle="The channel × segment conversion query, run live against fact_campaign_events (millions of rows). Toggle indexes on and off and watch the query plan and timing change in real time."
      />

      <div className="card p-5 mb-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            onClick={runExplain}
            disabled={loading !== null}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-2 border border-border text-sm hover:border-accent/50 transition-colors disabled:opacity-50"
          >
            {loading === "run" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Run EXPLAIN ANALYZE
          </button>
          <button
            onClick={() => toggleIndexes("apply")}
            disabled={loading !== null}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-accent text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading === "apply" ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            Add indexes (optimize)
          </button>
          <button
            onClick={() => toggleIndexes("revert")}
            disabled={loading !== null}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-2 border border-border text-sm hover:border-danger/50 transition-colors disabled:opacity-50"
          >
            {loading === "revert" ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            Revert to baseline
          </button>

          <span
            className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium ${
              result?.optimized ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
            }`}
          >
            {result?.optimized ? "Optimized — indexes + materialized view active" : "Baseline — primary key only"}
          </span>
        </div>

        {error && <p className="text-sm text-danger mb-4">{error}</p>}

        {result && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="card-2 p-3">
              <div className="text-[11px] text-muted uppercase">Execution time</div>
              <div className="text-xl font-semibold mono">{result.executionTimeMs.toFixed(1)} ms</div>
            </div>
            <div className="card-2 p-3">
              <div className="text-[11px] text-muted uppercase">Planning time</div>
              <div className="text-xl font-semibold mono">{result.planningTimeMs.toFixed(1)} ms</div>
            </div>
            <div className="card-2 p-3 col-span-2">
              <div className="text-[11px] text-muted uppercase mb-1">Recent runs</div>
              <div className="flex items-end gap-1 h-8">
                {history.map((h, i) => (
                  <div
                    key={i}
                    title={`${h.ms.toFixed(1)} ms`}
                    className="w-4 rounded-t"
                    style={{
                      height: `${Math.min(100, (h.ms / Math.max(...history.map((x) => x.ms), 1)) * 100)}%`,
                      background: h.optimized ? "var(--success)" : "var(--warning)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <pre className="card-2 p-3 text-xs mono overflow-x-auto whitespace-pre-wrap text-muted">{result?.sql}</pre>
      </div>

      {result?.plan?.Plan && (
        <div className="card p-5">
          <h2 className="text-sm font-medium text-muted mb-3">Query plan</h2>
          <PlanTree plan={result.plan.Plan as never} />
        </div>
      )}

      <div className="card p-5 mt-4 text-sm text-muted leading-relaxed">
        <h2 className="text-foreground font-medium mb-2 text-sm">Why this matters</h2>
        <p>
          On the baseline schema, <code className="mono text-foreground">fact_campaign_events</code> only has a
          primary key, so this query has to hash-join and aggregate every one of the ~3M rows on every page
          load — a fraction of a second at a few thousand rows, well over a second here, and it only gets worse
          as event volume grows. Because the query summarizes essentially the whole table rather than looking up
          a selective slice, a plain index on <code className="mono text-foreground">customer_id</code> barely
          moves the needle — Postgres still has to touch almost every row either way. The fix that actually works
          is a <code className="mono text-foreground">materialized view</code> that pre-computes the channel ×
          segment rollup once; the dashboard then reads ~24 pre-aggregated rows instead of recomputing the join,
          which is why &quot;optimized&quot; mode returns in under a millisecond. The supporting indexes exist to keep
          that materialized view itself fast to refresh, and to speed up the selective, single-customer lookups
          used elsewhere in the app (e.g. the segment drill-down table) — a reminder that indexing is about
          matching the fix to how the query is actually shaped, not indexing every column and hoping.
        </p>
      </div>
    </div>
  );
}
