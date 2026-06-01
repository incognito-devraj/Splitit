/**
 * RechartsCharts — loaded lazily as a single chunk.
 * All Recharts sub-components are imported directly here (not lazy-wrapped),
 * which avoids the TypeScript `lazy()` incompatibility with non-default exports.
 */
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { CATEGORIES } from "@/lib/store";
import type { MonthlyPoint, CategoryPoint } from "./SpendingCharts";
import { CHART_COLORS } from "./SpendingCharts";

// ─── Shared tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-card border border-border px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,.12)] text-sm">
      {label && <div className="text-xs text-muted-foreground mb-0.5">{label}</div>}
      <div className="font-bold tabular">
        ₹{Number(payload[0].value ?? 0).toLocaleString("en-IN")}
      </div>
    </div>
  );
}

// ─── Chart variants ───────────────────────────────────────────────────────────

type ChartProps =
  | { type: "area"; data: MonthlyPoint[]; height: number }
  | { type: "bar"; data: CategoryPoint[]; height: number }
  | { type: "donut"; data: CategoryPoint[]; height: number };

export default function RechartsCharts(props: ChartProps) {
  if (props.type === "area") {
    return (
      <ResponsiveContainer width="100%" height={props.height}>
        <AreaChart data={props.data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.72 0.18 155)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="oklch(0.72 0.18 155)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="oklch(0.72 0.18 155)"
            strokeWidth={2.5}
            fill="url(#areaGrad)"
            dot={false}
            activeDot={{ r: 5, fill: "oklch(0.72 0.18 155)", strokeWidth: 0 }}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (props.type === "bar") {
    const barData = props.data.map((c) => ({
      name: CATEGORIES.find((cat) => cat.id === c.category)?.emoji ?? "✨",
      amount: c.total,
    }));
    return (
      <ResponsiveContainer width="100%" height={props.height}>
        <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={22}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 14 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]} animationDuration={800} animationEasing="ease-out">
            {props.data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // donut
  const donutData = props.data.map((c, i) => ({
    name: CATEGORIES.find((cat) => cat.id === c.category)?.label ?? c.category,
    value: c.total,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={props.height}>
      <PieChart>
        <Pie
          data={donutData}
          cx="50%"
          cy="50%"
          innerRadius={44}
          outerRadius={68}
          paddingAngle={3}
          dataKey="value"
          animationBegin={0}
          animationDuration={800}
        >
          {donutData.map((entry, i) => (
            <Cell key={i} fill={entry.color} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const item = payload[0];
            return (
              <div className="rounded-xl bg-card border border-border px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,.12)] text-sm">
                <div className="text-xs text-muted-foreground mb-0.5">{item.name}</div>
                <div className="font-bold tabular">₹{Number(item.value ?? 0).toLocaleString("en-IN")}</div>
              </div>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
