"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

type Point = { month: string; revenue: number; delta: number | null };

function DeltaLabel(props: { x?: number; y?: number; width?: number; value?: number | null }) {
  const { x, y, width, value } = props;
  if (value === null || value === undefined || x === undefined || y === undefined || width === undefined) return null;
  const positive = value >= 0;
  const text = `${positive ? "+" : ""}${value.toFixed(0)}%`;
  const boxWidth = 15 + text.length * 6.2;
  return (
    <g transform={`translate(${x + width / 2 - boxWidth / 2}, ${y - 24})`}>
      <rect
        width={boxWidth}
        height={18}
        rx={9}
        fill={positive ? "var(--success-bg)" : "var(--danger-bg)"}
      />
      <text
        x={boxWidth / 2}
        y={12.5}
        textAnchor="middle"
        fontSize={10}
        fontWeight={600}
        fill={positive ? "var(--success)" : "var(--danger)"}
      >
        {text}
      </text>
    </g>
  );
}

export default function RevenueTrendChart({
  data,
}: {
  data: { month: string; revenue: string; orders: string }[];
}) {
  // Drop the trailing month: it's the current, still-partial period and always
  // reads as an artificial drop next to fully-elapsed months.
  const complete = data.slice(0, -1);
  const recent = complete.slice(-8);
  const chartData: Point[] = recent.map((d, i) => {
    const revenue = Number(d.revenue);
    const prevSource = i > 0 ? recent[i - 1] : complete[complete.length - 9];
    const prev = prevSource ? Number(prevSource.revenue) : null;
    const delta = prev && prev > 0 ? ((revenue - prev) / prev) * 100 : null;
    return { month: d.month, revenue, delta };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 28, right: 10, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: "#8b8fa3", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#8b8fa3", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          width={44}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          contentStyle={{
            background: "#ffffff",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
            boxShadow: "var(--shadow-card-lg)",
          }}
          labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
          formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Revenue"]}
        />
        <Bar dataKey="revenue" radius={[8, 8, 8, 8]} maxBarSize={38}>
          {chartData.map((d, i) => (
            <Cell key={d.month} fill={i === chartData.length - 1 ? "var(--accent)" : "#e4e1fb"} />
          ))}
          <LabelList dataKey="delta" content={<DeltaLabel />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
