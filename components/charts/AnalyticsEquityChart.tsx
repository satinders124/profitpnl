"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatR, type EquityPoint } from "@/lib/stats";

function EquityTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: EquityPoint }>;
}) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0D0D1A]/95 px-3.5 py-2.5 shadow-xl backdrop-blur-md">
      <div className="mb-1 flex items-center justify-between gap-4 border-b border-white/10 pb-1">
        <span className="whitespace-nowrap text-xs font-semibold text-[#F0B429]">
          Trade #{point.trade}
        </span>
        <span className="whitespace-nowrap text-[10px] text-[#8080A0]">{point.name}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="whitespace-nowrap text-xs text-[#A0A0C0]">
          {point.instrument} · {point.strategy}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-4">
        <span className="whitespace-nowrap text-xs text-[#A0A0C0]">Cumulative:</span>
        <span
          className={`whitespace-nowrap text-xs font-bold tabular-nums ${
            point.equity >= 0 ? "text-[#00D084]" : "text-[#FF4565]"
          }`}
        >
          {formatR(point.equity)}
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-4">
        <span className="whitespace-nowrap text-xs text-[#A0A0C0]">This trade:</span>
        <span
          className={`whitespace-nowrap text-xs font-bold tabular-nums ${
            point.r >= 0 ? "text-[#00D084]" : "text-[#FF4565]"
          }`}
        >
          {formatR(point.r)}
        </span>
      </div>
    </div>
  );
}

export default function AnalyticsEquityChart({ data }: { data: EquityPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="analyticsEquityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F0B429" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#F0B429" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="name"
          stroke="#71717a"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          stroke="#71717a"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(value: number) => `${value}R`}
        />
        <Tooltip content={<EquityTooltip />} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
        <Area
          type="monotone"
          dataKey="equity"
          stroke="#F0B429"
          strokeWidth={2}
          fill="url(#analyticsEquityFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
