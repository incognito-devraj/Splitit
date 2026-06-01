import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { cardVariants, SPRING } from "./MotionWrapper";
import { CATEGORIES } from "@/lib/store";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";

// Lazy-load the entire recharts module as one chunk
const RechartsCharts = lazy(() => import("./RechartsCharts"));

export interface MonthlyPoint {
  month: string;
  amount: number;
}

export interface CategoryPoint {
  category: string;
  total: number;
}

interface Props {
  monthly: MonthlyPoint[];
  categories: CategoryPoint[];
  isLoading: boolean;
}

function ChartSkeleton({ height = 180 }: { height?: number }) {
  return <div className="w-full rounded-2xl bg-muted shimmer" style={{ height }} />;
}

export function SpendingCharts({ monthly, categories, isLoading }: Props) {
  const topCats = categories.slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Monthly Trend */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ ...SPRING, delay: 0.1 }}
        className="rounded-3xl bg-card border border-border p-5 shadow-[0_1px_2px_rgba(0,0,0,.04)]"
      >
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Monthly Trend</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Spending over time</p>
        </div>
        {isLoading ? (
          <ChartSkeleton height={160} />
        ) : monthly.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
        ) : (
          <Suspense fallback={<ChartSkeleton height={160} />}>
            <RechartsCharts type="area" data={monthly} height={160} />
          </Suspense>
        )}
      </motion.div>

      {/* Category charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ ...SPRING, delay: 0.18 }}
          className="rounded-3xl bg-card border border-border p-5 shadow-[0_1px_2px_rgba(0,0,0,.04)]"
        >
          <h3 className="text-sm font-semibold mb-1">By Category</h3>
          <p className="text-xs text-muted-foreground mb-4">Share of total spend</p>
          {isLoading ? (
            <ChartSkeleton height={160} />
          ) : topCats.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
          ) : (
            <Suspense fallback={<ChartSkeleton height={160} />}>
              <RechartsCharts type="donut" data={topCats} height={160} />
            </Suspense>
          )}
          {!isLoading && topCats.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {topCats.map((c, i) => {
                const cat = CATEGORIES.find((x) => x.id === c.category);
                return (
                  <div key={c.category} className="flex items-center gap-1.5 min-w-0">
                    <div className="size-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-[10px] text-muted-foreground truncate">{cat?.emoji} {cat?.label ?? c.category}</span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ ...SPRING, delay: 0.24 }}
          className="rounded-3xl bg-card border border-border p-5 shadow-[0_1px_2px_rgba(0,0,0,.04)]"
        >
          <h3 className="text-sm font-semibold mb-1">Top Categories</h3>
          <p className="text-xs text-muted-foreground mb-4">Amount per category</p>
          {isLoading ? (
            <ChartSkeleton height={160} />
          ) : topCats.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
          ) : (
            <Suspense fallback={<ChartSkeleton height={160} />}>
              <RechartsCharts type="bar" data={topCats} height={160} />
            </Suspense>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export const CHART_COLORS = [
  "oklch(0.72 0.18 155)",
  "oklch(0.68 0.20 245)",
  "oklch(0.65 0.25 295)",
  "oklch(0.78 0.16 75)",
  "oklch(0.65 0.24 25)",
  "oklch(0.70 0.18 195)",
  "oklch(0.72 0.18 35)",
  "oklch(0.70 0.18 220)",
];
