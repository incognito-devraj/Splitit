import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Share2, X, TrendingUp, Users, Receipt, Wallet, Copy, Check, UserMinus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CATEGORIES } from "@/lib/store";
import { expenseApi, summaryApi, balanceApi, groupApi, settlementApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth";
import { QK } from "@/lib/queryKeys";
import { cardVariants, SPRING, StaggerList } from "@/components/dashboard/MotionWrapper";
import { CHART_COLORS } from "@/components/dashboard/SpendingCharts";
import { AdminControls } from "@/components/AdminControls";

const RechartsCharts = lazy(() => import("@/components/dashboard/RechartsCharts"));

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Splitit - Reports" }] }),
  component: Reports,
});

function ChartSkeleton({ h = 180 }: { h?: number }) {
  return <div className="w-full rounded-2xl bg-muted shimmer" style={{ height: h }} />;
}

const EMOJIS = ["🦊","🐼","🦁","🐯","🐻","🦄","🐸","🦋","🐺","🦅"];
const COLORS = ["oklch(0.72 0.18 155)","oklch(0.68 0.20 245)","oklch(0.78 0.16 75)","oklch(0.65 0.25 295)","oklch(0.72 0.18 35)","oklch(0.70 0.18 195)"];
function avatarProps(id: string) {
  const n = id.charCodeAt(id.length - 1) % EMOJIS.length;
  return { emoji: EMOJIS[n], color: COLORS[n % COLORS.length] };
}

function Reports() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showFull, setShowFull] = useState(false);
  const [settling, setSettling] = useState<string | null>(null);
  const [settleAmt, setSettleAmt] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const activeGroupId = user?.groupId ?? null;

  const { data: group } = useQuery({
    queryKey: QK.group(activeGroupId),
    queryFn: () => groupApi.current().then((r) => r.data.data),
    enabled: !!activeGroupId,
  });

  // Check ownership against group.adminId — never stale unlike user.role field
  const isAdmin = !!group && (
    typeof group.adminId === "object"
      ? (group.adminId as { _id: string })._id === user?._id
      : group.adminId === user?._id
  );

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

  const { data: balances = [], isLoading: balLoading } = useQuery({
    queryKey: QK.balances(activeGroupId),
    queryFn: () => balanceApi.all().then((r) => r.data.data),
    enabled: !!activeGroupId,
    refetchInterval: 15_000,
  });

  const settleMutation = useMutation({
    mutationFn: ({ toUserId, amt }: { toUserId: string; amt: number }) => settlementApi.request(toUserId, amt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["balances"] });
      qc.invalidateQueries({ queryKey: ["settlements"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      setSettling(null); setSettleAmt("");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => groupApi.removeMember(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group"] });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      setRemovingId(null);
    },
  });

  const copyCode = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const allExpenses = Array.isArray(expensesRaw) ? expensesRaw : [];
  const isLoading = sumLoading || catLoading || expLoading || balLoading;

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
      <StaggerList className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
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

      {/* Share Report button */}
      <motion.div
        variants={cardVariants} initial="hidden" animate="visible"
        transition={{ ...SPRING, delay: 0.1 }}
        className="flex justify-center mb-5"
      >
        <motion.button
          whileTap={{ scale: 0.96 }} whileHover={{ y: -2 }}
          onClick={() => setShowFull(true)}
          className="h-10 px-6 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold font-sans flex items-center gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.12)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.18)] transition-all"
        >
          <Share2 className="size-4" /> Share Full Report
        </motion.button>
      </motion.div>

      {/* ── Members & Balances ────────────────────────────────────────────── */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible"
        transition={{ ...SPRING, delay: 0.12 }}
        className="rounded-3xl bg-card border border-border p-4 mb-4 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Members &amp; Balances</h2>
          {group?.inviteCode && (
            <button onClick={copyCode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-muted text-xs font-mono font-bold tracking-widest hover:bg-primary/10 hover:text-primary transition-colors">
              {group.inviteCode}
              {copied ? <Check className="size-3 text-green-400" /> : <Copy className="size-3 text-muted-foreground" />}
            </button>
          )}
        </div>

        {balLoading && (
          <div className="space-y-2">
            {[1,2].map(i => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        )}

        <div className="space-y-2">
          {balances.map((b, i) => {
            const isMe = b.userId === user?._id;
            const positive = b.netBalance >= 0;
            const settled = Math.abs(b.netBalance) < 0.5;
            const { emoji, color } = avatarProps(b.userId);
            return (
              <motion.div key={b.userId}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl bg-background border border-border overflow-hidden">
                <div className="p-3 flex items-center gap-3">
                  <div className="size-10 rounded-full grid place-items-center text-lg shrink-0 overflow-hidden"
                    style={{ background: `color-mix(in oklab, ${color} 28%, transparent)` }}>
                    {b.avatar ? <img src={b.avatar} alt={b.name} className="size-full object-cover rounded-full" /> : emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm flex items-center gap-1.5">
                      <span className="truncate">{b.name}</span>
                      {isMe && <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full shrink-0">you</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{b.email}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-base font-semibold tabular ${settled ? "text-muted-foreground" : positive ? "text-foreground" : "text-[#ffb1b1]"}`}>
                      {settled ? "₹0" : `${positive ? "+" : "−"}₹${Math.abs(b.netBalance).toFixed(0)}`}
                    </div>
                    {isAdmin && !isMe && (
                      <button onClick={() => setRemovingId(b.userId)}
                        className="mt-0.5 text-[9px] text-muted-foreground hover:text-red-400 flex items-center gap-0.5 ml-auto">
                        <UserMinus className="size-3" /> Remove
                      </button>
                    )}
                  </div>
                </div>
                {!isMe && !settled && (
                  <div className="px-3 pb-3">
                    <AnimatePresence mode="wait">
                      {settling === b.userId ? (
                        <motion.div key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex gap-2">
                          <input type="number" value={settleAmt} onChange={(e) => setSettleAmt(e.target.value)}
                            placeholder={`₹${Math.abs(b.netBalance).toFixed(0)}`} autoFocus
                            className="flex-1 h-8 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary" />
                          <button onClick={() => settleMutation.mutate({ toUserId: b.userId, amt: Number(settleAmt) || Math.abs(b.netBalance) })}
                            disabled={settleMutation.isPending}
                            className="px-3 h-8 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold disabled:opacity-50">
                            {settleMutation.isPending ? "…" : "Send"}
                          </button>
                          <button onClick={() => { setSettling(null); setSettleAmt(""); }} className="size-8 rounded-xl bg-muted grid place-items-center">
                            <X className="size-3.5" />
                          </button>
                        </motion.div>
                      ) : (
                        <motion.button key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => { setSettling(b.userId); setSettleAmt(Math.abs(b.netBalance).toFixed(0)); }}
                          className="w-full h-8 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition-colors">
                          💸 Settle · ₹{Math.abs(b.netBalance).toFixed(0)}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Admin Controls */}
      <div className="mb-4">
        <AdminControls isAdmin={isAdmin} compact />
      </div>

      {/* Remove member confirmation */}
      <AnimatePresence>
        {removingId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setRemovingId(null)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-card rounded-3xl p-6 border border-border"
            >
              <h3 className="font-semibold text-lg">Remove member?</h3>
              <p className="text-sm text-muted-foreground mt-1">Their expenses will remain in history.</p>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setRemovingId(null)} className="flex-1 h-11 rounded-2xl bg-muted text-sm font-semibold">Cancel</button>
                <button onClick={() => removeMutation.mutate(removingId)} disabled={removeMutation.isPending}
                  className="flex-1 h-11 rounded-2xl bg-red-500/20 text-red-400 text-sm font-semibold disabled:opacity-50">
                  {removeMutation.isPending ? "Removing…" : "Remove"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Full Report Dialog — full screen mobile, centered modal desktop */}
      <AnimatePresence>
        {showFull && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/55"
              onClick={() => setShowFull(false)}
            />

            {/* Panel: slides up from bottom on mobile, scales in centered on sm+ */}
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className={[
                "fixed z-[61] bg-background flex flex-col",
                // Mobile: full screen, anchored to bottom
                "inset-x-0 bottom-0 top-0",
                // sm+: centered modal with max dimensions
                "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
                "sm:w-full sm:max-w-lg sm:max-h-[88vh]",
                "sm:rounded-3xl sm:border sm:border-border sm:shadow-[0_24px_60px_rgba(0,0,0,0.25)]",
              ].join(" ")}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">Full Report</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{summary?.groupName ?? "Group summary"}</p>
                </div>
                <button
                  onClick={() => setShowFull(false)}
                  aria-label="Close"
                  className="size-9 rounded-full bg-muted grid place-items-center hover:bg-primary/10 transition-colors shrink-0"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-5 pt-4 pb-4 space-y-4 overscroll-contain">
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
                          <div className="size-8 rounded-full bg-muted overflow-hidden grid place-items-center shrink-0">
                            {b.avatar
                              ? <img src={b.avatar} alt={b.name} className="size-full object-cover" />
                              : <span className="text-xs font-bold">{b.name[0]}</span>}
                          </div>
                          <span className="font-medium truncate">{b.name}</span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <div className={`tabular font-bold text-sm ${b.netBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {b.netBalance >= 0 ? "+" : "−"}₹{Math.abs(b.netBalance).toFixed(0)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            paid ₹{b.totalPaid.toFixed(0)} · owes ₹{b.totalOwed.toFixed(0)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(summary?.balances ?? []).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-3">No members yet</p>
                    )}
                  </div>
                </div>

                {/* WhatsApp message preview */}
                <div className="rounded-2xl p-4 bg-card border border-border">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                    Message Preview
                  </div>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed bg-muted/40 rounded-xl p-3">
                    {summary?.whatsappText}
                  </pre>
                </div>
              </div>

              {/* Sticky footer action */}
              <div className="shrink-0 px-5 py-4 border-t border-border">
                <button
                  onClick={shareWhatsApp}
                  className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold font-sans flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-transform"
                >
                  <Share2 className="size-4" /> Share to WhatsApp
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
