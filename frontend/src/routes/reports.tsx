import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Share2, FileText, X, TrendingUp, Users, Receipt, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CATEGORIES } from "@/lib/store";
import { expenseApi, summaryApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth";
import { QK } from "@/lib/queryKeys";
import { cardVariants, SPRING, StaggerList } from "@/components/dashboard/MotionWrapper";
import { CHART_COLORS } from "@/components/dashboard/SpendingCharts";

// Single lazy chunk for all Recharts
const RechartsCharts = lazy(() => import("@/components/dashboard/RechartsCharts"));

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Splitit - Reports" }] }),
  component: Reports,
});

function ChartSkeleton({ h = 180 }: { h?: number }) {
  return <div className="w-full rounded-2xl bg-muted shimmer" style={{ height: h }} />;
}

function Reports() {
  const { user } = useAuth();
  const [showFull, setShowFull] = useState(false);
  const activeGroupId = user?.groupId ?? null;

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: QK.summary(activeGroupId),
    queryFn: () => summaryApi.get().then((r) => r.data.data),
    enabled: !!activeGroupId,
  });

  const { data: catData = [], isLoading: catLoading } = useQuery({
    queryKey: QK.summaryCategory(activeGroupId),
    queryFn: () => summaryApi.category().then((r) => r.data.data),
    enabled: !!activeGroupId,
  });

  const { data: expensesRaw, isLoading: expLoading } = useQuery({
    queryKey: QK.expenses(activeGroupId),
    queryFn: () => expenseApi.list({ limit: 200 }).then((r) => r.data.data),
    enabled: !!activeGroupId,
  });

  const allExpenses = Array.isArray(expensesRaw) ? expensesRaw : [];
  const isLoading = sumLoading || catLoading || expLoading;

  // Monthly trend — last 6 months in chronological order (oldest → newest)
  const monthlyMap = new Map<string, { amount: number; label: string }>();
  for (const e of allExpenses) {
    const d = new Date(e.createdAt);
    const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    const existing = monthlyMap.get(sortKey);
    monthlyMap.set(sortKey, { amount: (existing?.amount ?? 0) + e.amount, label });
  }
  const monthly = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([, v]) => ({ month: v.label, amount: v.amount }));

  const topCats = catData.slice(0, 6);
  const maxCat = catData[0]?.total ?? 1;

  const shareWhatsApp = () => {
    if (!summary?.whatsappText) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(summary.whatsappText)}`, "_blank");
  };

  const kpis = [
    { label: "Total Spent",  value: `₹${(summary?.totalAmount ?? 0).toLocaleString("en-IN")}`, icon: Wallet,    tint: "oklch(0.72 0.18 155)" },
    { label: "Expenses",     value: summary?.totalExpenses ?? 0,                                icon: Receipt,   tint: "oklch(0.68 0.20 245)" },
    { label: "Members",      value: summary?.balances?.length ?? 0,                             icon: Users,     tint: "oklch(0.65 0.25 295)" },
    { label: "Categories",   value: catData.length,                                             icon: TrendingUp, tint: "oklch(0.78 0.16 75)" },
  ];

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Spending overview &amp; analytics</p>
      </div>

      {/* KPI row */}
      <StaggerList className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.label}
              variants={cardVariants}
              transition={{ ...SPRING, delay: i * 0.07 }}
              className="rounded-2xl bg-card border border-border p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,.08)] transition-shadow duration-200"
            >
              <div
                className="size-9 rounded-xl grid place-items-center mb-3"
                style={{ background: `color-mix(in oklab, ${k.tint} 18%, transparent)` }}
              >
                <Icon className="size-4" style={{ color: k.tint }} />
              </div>
              {isLoading
                ? <div className="h-7 w-20 bg-muted rounded animate-pulse" />
                : <div className="text-xl font-bold tabular">{k.value}</div>}
              <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>
            </motion.div>
          );
        })}
      </StaggerList>

      {/* Generate report button */}
      <motion.button
        variants={cardVariants} initial="hidden" animate="visible"
        transition={{ ...SPRING, delay: 0.1 }}
        whileTap={{ scale: 0.97 }} whileHover={{ y: -2 }}
        onClick={() => setShowFull(true)}
        className="w-full h-12 rounded-2xl border border-primary/30 bg-primary/10 text-primary font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-primary/15 mb-5"
      >
        <FileText className="size-4" /> Generate Full Report
      </motion.button>

      {/* Monthly Trend — Area Chart */}
      <motion.div
        variants={cardVariants} initial="hidden" animate="visible"
        transition={{ ...SPRING, delay: 0.14 }}
        className="rounded-3xl bg-card border border-border p-5 shadow-[0_1px_2px_rgba(0,0,0,.04)] mb-4"
      >
        <div className="mb-4">
          <h2 className="text-sm font-semibold">Monthly Spending Trend</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Total spend per month</p>
        </div>
        {isLoading ? <ChartSkeleton h={180} /> : monthly.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
        ) : (
          <Suspense fallback={<ChartSkeleton h={180} />}>
            <RechartsCharts type="area" data={monthly} height={180} />
          </Suspense>
        )}
      </motion.div>

      {/* Category charts — 2 col */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Donut */}
        <motion.div
          variants={cardVariants} initial="hidden" animate="visible"
          transition={{ ...SPRING, delay: 0.2 }}
          className="rounded-3xl bg-card border border-border p-5 shadow-[0_1px_2px_rgba(0,0,0,.04)]"
        >
          <h2 className="text-sm font-semibold mb-1">Category Breakdown</h2>
          <p className="text-xs text-muted-foreground mb-4">Share of total spend</p>
          {isLoading ? <ChartSkeleton h={160} /> : topCats.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
          ) : (
            <Suspense fallback={<ChartSkeleton h={160} />}>
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

        {/* Bar */}
        <motion.div
          variants={cardVariants} initial="hidden" animate="visible"
          transition={{ ...SPRING, delay: 0.26 }}
          className="rounded-3xl bg-card border border-border p-5 shadow-[0_1px_2px_rgba(0,0,0,.04)]"
        >
          <h2 className="text-sm font-semibold mb-1">Top Categories</h2>
          <p className="text-xs text-muted-foreground mb-4">Amount per category</p>
          {isLoading ? <ChartSkeleton h={160} /> : topCats.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
          ) : (
            <Suspense fallback={<ChartSkeleton h={160} />}>
              <RechartsCharts type="bar" data={topCats} height={160} />
            </Suspense>
          )}
        </motion.div>
      </div>

      {/* Category progress bars */}
      <motion.div
        variants={cardVariants} initial="hidden" animate="visible"
        transition={{ ...SPRING, delay: 0.3 }}
        className="rounded-3xl bg-card border border-border p-5 shadow-[0_1px_2px_rgba(0,0,0,.04)] mb-4"
      >
        <h2 className="text-sm font-semibold mb-4">Spending by Category</h2>
        {catData.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground text-center py-6">No expenses yet</p>
        )}
        <div className="space-y-3">
          {catData.map(({ category, total }, i) => {
            const cat = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[CATEGORIES.length - 1];
            const pct = (total / maxCat) * 100;
            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ x: 3 }}
                className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 hover:bg-primary/5 transition-colors duration-200 cursor-default"
              >
                <div
                  className="size-9 rounded-xl grid place-items-center text-base shrink-0"
                  style={{ background: `color-mix(in oklab, ${cat.tint} 22%, transparent)` }}
                >
                  {cat.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-sm">{cat.label}</span>
                    <span className="text-sm font-bold tabular">₹{total.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.1 + i * 0.05, duration: 0.7, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: cat.tint }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Settlement summary */}
      <motion.div
        variants={cardVariants} initial="hidden" animate="visible"
        transition={{ ...SPRING, delay: 0.34 }}
        className="rounded-3xl bg-card border border-border p-5 shadow-[0_1px_2px_rgba(0,0,0,.04)] mb-4"
      >
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
          📌 Settlement Summary
        </div>
        <div className="space-y-1">
          {(summary?.summary ?? []).map((s) => (
            <div
              key={s.userId}
              className="flex items-center justify-between text-sm p-2 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium">{s.name}</span>
              <span className={`tabular font-bold ${s.action === "receives" ? "text-emerald-400" : "text-red-400"}`}>
                {s.action} ₹{s.amount.toFixed(0)}
              </span>
            </div>
          ))}
          {(summary?.summary ?? []).length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-3">✅ All settled up!</p>
          )}
          {isLoading && <div className="h-16 bg-muted rounded-xl animate-pulse" />}
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }} whileHover={{ y: -2 }}
          onClick={shareWhatsApp}
          className="mt-4 w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"
        >
          <Share2 className="size-4" /> Share to WhatsApp
        </motion.button>
      </motion.div>

      {/* Full Report Overlay */}
      <AnimatePresence>
        {showFull && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex flex-col"
          >
            <div className="flex items-center justify-between px-5 pt-6 pb-3 border-b border-border">
              <h2 className="text-xl font-bold tracking-tight">Full Report</h2>
              <button
                onClick={() => setShowFull(false)}
                aria-label="Close full report"
                className="size-10 rounded-full bg-muted grid place-items-center hover:bg-primary/10 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-8 pt-4 space-y-4">
              {/* Totals */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4 bg-card border border-border">
                  <div className="text-xs text-muted-foreground">Total expenses</div>
                  <div className="text-2xl font-bold tabular mt-1">{summary?.totalExpenses ?? 0}</div>
                </div>
                <div className="rounded-2xl p-4 bg-card border border-border">
                  <div className="text-xs text-muted-foreground">Total amount</div>
                  <div className="text-2xl font-bold tabular text-gradient mt-1">
                    ₹{(summary?.totalAmount ?? 0).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Per member */}
              <div className="rounded-2xl p-4 bg-card border border-border">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Per member</div>
                <div className="space-y-2">
                  {(summary?.balances ?? []).map((b) => (
                    <div
                      key={b.userId}
                      className="flex items-center justify-between text-sm p-2 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="size-7 rounded-full bg-muted overflow-hidden grid place-items-center shrink-0">
                          {b.avatar
                            ? <img src={b.avatar} alt={b.name} className="size-full object-cover" />
                            : <span className="text-xs font-bold">{b.name[0]}</span>}
                        </div>
                        <span className="font-medium truncate">{b.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`tabular font-bold ${b.netBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {b.netBalance >= 0 ? "+" : "−"}₹{Math.abs(b.netBalance).toFixed(0)}
                        </span>
                        <div className="text-[10px] text-muted-foreground">
                          paid ₹{b.totalPaid.toFixed(0)} · owes ₹{b.totalOwed.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* WhatsApp message */}
              <div className="rounded-2xl p-4 bg-card border border-border">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                  WhatsApp Message
                </div>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed bg-muted/40 rounded-xl p-3">
                  {summary?.whatsappText}
                </pre>
                <button
                  onClick={shareWhatsApp}
                  className="mt-3 w-full h-10 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Share2 className="size-3.5" /> Share
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
