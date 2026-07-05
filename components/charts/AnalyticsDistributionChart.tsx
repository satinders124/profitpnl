"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type DistributionDatum = {
  name: string;
  value: number;
  color: string;
};

export default function AnalyticsDistributionChart({ data }: { data: DistributionDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="name"
          stroke="#71717a"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#71717a"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          formatter={(value) => [`${Number(value ?? 0)} trades`, "Count"]}
          contentStyle={{
            background: "#0D0D1A",
            border: "1px solid #1E1E38",
            borderRadius: "12px",
            color: "#F0F0FF",
            fontSize: "12px",
          }}
        />
        <Bar dataKey="value" radius={[10, 10, 0, 0]} maxBarSize={56}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
