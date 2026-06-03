import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Share2, X, TrendingUp, Users, Receipt, Wallet, Copy, Check, UserMinus, Trash2, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CATEGORIES } from "@/lib/store";
import { expenseApi, summaryApi, balanceApi, groupApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth";
import { QK } from "@/lib/queryKeys";
import { cardVariants, SPRING, StaggerList } from "@/components/dashboard/MotionWrapper";
import { CHART_COLORS } from "@/components/dashboard/SpendingCharts";

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
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Admin report/clear state ──────────────────────────────────────────────
  type AdminStep = "idle" | "date-picker" | "preview";
  const [adminStep, setAdminStep] = useState<AdminStep>("idle");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reportText, setReportText] = useState("");
  const [reportShared, setReportShared] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);

  function showAdminError(msg: string) { setAdminError(msg); setTimeout(() => setAdminError(null), 5000); }
  function showAdminSuccess(msg: string) { setAdminSuccess(msg); setTimeout(() => setAdminSuccess(null), 4000); }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }
  function fmt(n: number) { return `₹${n.toLocaleString("en-IN")}`; }
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

  const removeMutation = useMutation({
    mutationFn: (id: string) => groupApi.removeMember(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group"] });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      setRemovingId(null);
    },
  });

  // ── Admin: generate report ────────────────────────────────────────────────
  const generateMutation = useMutation({
    mutationFn: async () => {
      const [expRes, sumRes] = await Promise.all([
        expenseApi.list({ limit: 500 }),
        summaryApi.get(),
      ]);
      const allExp = expRes.data.data ?? [];
      const s = sumRes.data.data;
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate + "T23:59:59") : null;
      const filtered = allExp.filter((e) => {
        const d = new Date(e.createdAt);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
      if (filtered.length === 0 && !from && !to) throw new Error("No expenses found.");
      const periodLabel = from || to
        ? `${from ? fmtDate(fromDate) : "beginning"} – ${to ? fmtDate(toDate) : "today"}`
        : "All time";
      let r = `📊 *${s.groupName ?? "Group"} — Expense Report*\n`;
      r += `📅 Period: ${periodLabel}\n`;
      r += `💰 Total Spent: ${fmt(s.totalAmount)}\n`;
      r += `🧾 Total Expenses: ${s.totalExpenses}\n\n── Balances ──\n`;
      for (const b of s.summary ?? []) r += `${b.action === "receives" ? "✅" : "🔴"} ${b.name} ${b.action} ${fmt(b.amount)}\n`;
      if ((s.summary ?? []).length === 0) r += `✅ All settled up!\n`;
      r += `\n── Expenses ──\n`;
      const sorted = [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      for (const e of sorted) {
        const parts = [...(e.sharedWith ?? []).map((u) => u.name), ...(e.guestParticipants ?? []).map((g) => g.name)];
        r += `${fmtDate(e.createdAt)} — ${e.paidBy?.name ?? "?"} paid ${fmt(e.amount)} for ${e.title || e.category}\n`;
        if (parts.length) r += `  Split among: ${parts.join(", ")}\n`;
      }
      r += `\n_Powered by Splitit_`;
      return r;
    },
    onSuccess: (text) => { setReportText(text); setAdminStep("preview"); },
    onError: (e: any) => { showAdminError(e?.message ?? "Failed to generate report."); setAdminStep("idle"); },
  });

  const clearMutation = useMutation({
    mutationFn: () => groupApi.clearExpenses(),
    onSuccess: () => {
      setShowClearDialog(false); setReportShared(false); setReportText(""); setAdminStep("idle");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      qc.invalidateQueries({ queryKey: ["settlements"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      showAdminSuccess("All expense records cleared.");
    },
    onError: (e: any) => { setShowClearDialog(false); showAdminError(e?.response?.data?.message ?? "Failed to clear."); },
  });

  async function handleAdminShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Expense Report", text: reportText });
      } else {
        await navigator.clipboard.writeText(reportText);
        showAdminSuccess("Report copied to clipboard.");
      }
      setReportShared(true);
      showAdminSuccess("Report shared! Clear Expenses is now unlocked.");
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      try { await navigator.clipboard.writeText(reportText); setReportShared(true); showAdminSuccess("Copied to clipboard."); }
      catch { showAdminError("Could not share. Please copy manually."); }
    }
  }

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

      {/* KPI row — always 4 columns, compact cards */}
      <StaggerList className="grid grid-cols-4 gap-2 sm:gap-3 mb-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.label}
              variants={cardVariants}
              transition={{ ...SPRING, delay: i * 0.07 }}
              className="rounded-2xl bg-card border border-border p-3 shadow-[0_1px_2px_rgba(0,0,0,.04)] hover:shadow-[0_6px_18px_rgba(0,0,0,.07)] transition-shadow duration-200"
            >
              <div className="size-7 rounded-lg grid place-items-center mb-2"
                style={{ background: `color-mix(in oklab, ${k.tint} 18%, transparent)` }}>
                <Icon className="size-3.5" style={{ color: k.tint }} />
              </div>
              {isLoading
                ? <div className="h-5 w-12 bg-muted rounded animate-pulse" />
                : <div className="text-sm font-bold tabular leading-tight">{k.value}</div>}
              <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{k.label}</div>
            </motion.div>
          );
        })}
      </StaggerList>

      {/* ── Action buttons row — Share Report + Clear Expenses (admin only) ── */}
      <motion.div
        variants={cardVariants} initial="hidden" animate="visible"
        transition={{ ...SPRING, delay: 0.1 }}
        className="mb-5"
      >
        <div className={`flex gap-2 ${isAdmin ? "" : "justify-center"}`}>
          {/* Share Full Report — always visible */}
          <button
            onClick={() => setAdminStep("date-picker")}
            disabled={generateMutation.isPending}
            className={`${isAdmin ? "flex-1" : "h-10 px-6"} h-10 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50`}
          >
            {generateMutation.isPending
              ? <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Share2 className="size-4" />}
            <span className="truncate">{generateMutation.isPending ? "Generating…" : "Share Report"}</span>
          </button>

          {/* Clear All Expenses — admin only */}
          {isAdmin && (
            <button
              onClick={() => {
                if (!reportShared) { showAdminError("Share the expense report first to unlock this."); return; }
                setShowClearDialog(true);
              }}
              disabled={clearMutation.isPending}
              className={`flex-1 h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 border ${
                reportShared
                  ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/15"
                  : "bg-muted/60 text-muted-foreground border-border cursor-default"
              }`}
            >
              <Trash2 className="size-4 shrink-0" />
              <span className="truncate">Clear Expenses</span>
            </button>
          )}
        </div>

        {/* Hint / feedback */}
        {isAdmin && !reportShared && !adminError && !adminSuccess && (
          <p className="mt-1.5 text-[11px] text-muted-foreground text-center">
            Share the report first to unlock Clear Expenses
          </p>
        )}
        {adminError && (
          <div className="mt-2 flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            <AlertTriangle className="size-3.5 shrink-0" /> {adminError}
          </div>
        )}
        {adminSuccess && (
          <div className="mt-2 flex items-center gap-2 p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-400">
            <CheckCircle2 className="size-3.5 shrink-0" /> {adminSuccess}
          </div>
        )}
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
              </motion.div>
            );
          })}
        </div>
      </motion.div>

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

      {/* ── Date Picker Dialog ── */}
      <AnimatePresence>
        {adminStep === "date-picker" && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/55" onClick={() => setAdminStep("idle")} />
            <motion.div
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-x-4 bottom-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-sm z-[61] bg-background rounded-3xl border border-border shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-base">Select Period</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Leave blank for all time</p>
                </div>
                <button onClick={() => setAdminStep("idle")} className="size-8 rounded-full bg-muted grid place-items-center hover:bg-primary/10 transition-colors">
                  <X className="size-3.5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">From</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} max={toDate || undefined}
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-muted/50 border border-border text-sm focus:outline-none focus:border-primary" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">To</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} min={fromDate || undefined}
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-muted/50 border border-border text-sm focus:outline-none focus:border-primary" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setAdminStep("idle")} className="flex-1 h-11 rounded-2xl bg-muted text-sm font-semibold hover:bg-muted/70 transition-colors">Cancel</button>
                <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}
                  className="flex-1 h-11 rounded-2xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all">
                  {generateMutation.isPending
                    ? <><span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
                    : "Generate Report"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Report Preview Dialog ── */}
      <AnimatePresence>
        {adminStep === "preview" && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/55" onClick={() => setAdminStep("idle")} />
            <motion.div
              initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed z-[61] bg-background flex flex-col inset-x-0 bottom-0 h-[90dvh] sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg sm:h-auto sm:max-h-[88vh] rounded-t-3xl sm:rounded-3xl border border-border shadow-[0_24px_60px_rgba(0,0,0,0.3)]"
            >
              <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 sm:hidden shrink-0" />
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border shrink-0">
                <div>
                  <h3 className="font-bold text-base">Expense Report</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fromDate || toDate ? `${fromDate ? fmtDate(fromDate) : "Start"} – ${toDate ? fmtDate(toDate) : "Today"}` : "All time"}
                  </p>
                </div>
                <button onClick={() => setAdminStep("idle")} className="size-9 rounded-full bg-muted grid place-items-center hover:bg-primary/10 transition-colors">
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-2">
                <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed bg-muted/40 rounded-2xl p-4">{reportText}</pre>
              </div>
              <div className="shrink-0 px-5 py-4 border-t border-border space-y-2">
                {reportShared && (
                  <div className="flex items-center gap-2 text-xs text-green-400 justify-center pb-1">
                    <CheckCircle2 className="size-3.5" /> Report shared — Clear Expenses is now unlocked
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setAdminStep("idle")} className="flex-1 h-11 rounded-2xl bg-muted text-sm font-semibold hover:bg-muted/70 transition-colors">Close</button>
                  <button onClick={handleAdminShare} className="flex-1 h-11 rounded-2xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <Share2 className="size-4" /> {reportShared ? "Share Again" : "Share Report"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Clear Confirmation ── */}
      <AnimatePresence>
        {showClearDialog && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/55" onClick={() => setShowClearDialog(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed z-[71] inset-x-4 bottom-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-sm bg-background rounded-3xl border border-border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="size-11 rounded-2xl bg-red-500/15 grid place-items-center shrink-0">
                  <Trash2 className="size-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Clear All Expenses?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">This cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                Permanently deletes all expenses, settlements, and audit records. Group, members, and accounts stay intact.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setShowClearDialog(false)} className="flex-1 h-11 rounded-2xl bg-muted text-sm font-semibold hover:bg-muted/70 transition-colors">Cancel</button>
                <button onClick={() => clearMutation.mutate()} disabled={clearMutation.isPending}
                  className="flex-1 h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all">
                  {clearMutation.isPending
                    ? <><span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Clearing…</>
                    : "Yes, Clear All"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
