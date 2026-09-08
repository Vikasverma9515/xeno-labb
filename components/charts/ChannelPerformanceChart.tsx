"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CHANNEL_COLORS } from "@/lib/segment-colors";

export default function ChannelPerformanceChart({
  data,
}: {
  data: Record<string, string | number>[];
}) {
  const channels = Object.keys(CHANNEL_COLORS);
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="segment"
          tick={{ fill: "#8b8fa3", fontSize: 11 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          interval={0}
          angle={-15}
          textAnchor="end"
        />
        <YAxis
          tick={{ fill: "#8b8fa3", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={40}
          unit="%"
        />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          contentStyle={{ background: "#ffffff", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, boxShadow: "var(--shadow-card-lg)" }}
          labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#8b8fa3" }} />
        {channels.map((ch) => (
          <Bar key={ch} dataKey={ch} name={ch} fill={CHANNEL_COLORS[ch]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
