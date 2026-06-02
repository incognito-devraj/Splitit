import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Share2, X, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { groupApi, expenseApi, summaryApi } from "@/lib/api/endpoints";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "idle" | "date-picker" | "preview";

interface AdminControlsProps {
  isAdmin: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminControls({ isAdmin }: AdminControlsProps) {
  const qc = useQueryClient();

  // report flow state
  const [step, setStep] = useState<Step>("idle");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reportText, setReportText] = useState("");
  const [reportShared, setReportShared] = useState(false);

  // clear flow state
  const [showClearDialog, setShowClearDialog] = useState(false);

  // feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function showError(msg: string) {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  }
  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  }

  // ── Report generation ──────────────────────────────────────────────────────

  const generateMutation = useMutation({
    mutationFn: async () => {
      // Fetch expenses and summary in parallel
      const [expRes, sumRes] = await Promise.all([
        expenseApi.list({ limit: 500 }),
        summaryApi.get(),
      ]);

      const allExpenses = expRes.data.data ?? [];
      const summary = sumRes.data.data;

      // Filter by date range if provided
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate + "T23:59:59") : null;

      const expenses = allExpenses.filter((e) => {
        const d = new Date(e.createdAt);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });

      if (expenses.length === 0 && !from && !to) {
        throw new Error("No expenses found for this group.");
      }

      // ── Build formatted report ─────────────────────────────────────────────

      const groupName = summary.groupName ?? "Group";
      const periodLabel =
        from || to
          ? `${from ? fmtDate(fromDate) : "beginning"} – ${to ? fmtDate(toDate) : "today"}`
          : "All time";

      let report = `📊 *${groupName} — Expense Report*\n`;
      report += `📅 Period: ${periodLabel}\n`;
      report += `💰 Total Spent: ${fmt(summary.totalAmount)}\n`;
      report += `🧾 Total Expenses: ${summary.totalExpenses}\n\n`;

      // Balances summary at top
      report += `── Balances ──\n`;
      for (const b of summary.summary ?? []) {
        const icon = b.action === "receives" ? "✅" : "🔴";
        report += `${icon} ${b.name} ${b.action} ${fmt(b.amount)}\n`;
      }
      if ((summary.summary ?? []).length === 0) {
        report += `✅ All settled up!\n`;
      }
      report += `\n`;

      // Expenses list sorted by date
      if (expenses.length > 0) {
        report += `── Expenses ──\n`;
        const sorted = [...expenses].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        for (const e of sorted) {
          const date = fmtDate(e.createdAt);
          const title = e.title || e.category;
          const payer = e.paidBy?.name ?? "Unknown";
          const participants = [
            ...(e.sharedWith ?? []).map((u) => u.name),
            ...(e.guestParticipants ?? []).map((g) => g.name),
          ];
          report += `${date} — ${payer} paid ${fmt(e.amount)} for ${title}\n`;
          if (participants.length > 0) {
            report += `  Split among: ${participants.join(", ")}\n`;
          }
        }
      } else {
        report += `── No expenses in selected period ──\n`;
      }

      report += `\n_Powered by Splitit_`;
      return report;
    },
    onSuccess: (text) => {
      setReportText(text);
      setStep("preview");
    },
    onError: (e: any) => {
      showError(e?.message ?? e?.response?.data?.message ?? "Failed to generate report.");
      setStep("idle");
    },
  });

  // ── Share ──────────────────────────────────────────────────────────────────

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Expense Report", text: reportText });
      } else {
        await navigator.clipboard.writeText(reportText);
        showSuccess("Report copied to clipboard.");
      }
      setReportShared(true);
      showSuccess("Report shared! You can now clear expenses if needed.");
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      // fallback to clipboard
      try {
        await navigator.clipboard.writeText(reportText);
        setReportShared(true);
        showSuccess("Report copied to clipboard.");
      } catch {
        showError("Could not share or copy. Please copy manually.");
      }
    }
  }

  // ── Clear ──────────────────────────────────────────────────────────────────

  const clearMutation = useMutation({
    mutationFn: () => groupApi.clearExpenses(),
    onSuccess: () => {
      setShowClearDialog(false);
      setReportShared(false);
      setReportText("");
      setStep("idle");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      qc.invalidateQueries({ queryKey: ["settlements"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      showSuccess("All expense records cleared successfully.");
    },
    onError: (e: any) => {
      setShowClearDialog(false);
      showError(e?.response?.data?.message ?? "Failed to clear expenses.");
    },
  });

  if (!isAdmin) return null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Admin Action Card ── */}
      <div className="px-4 sm:px-6 mt-4">
        <div className="p-4 rounded-3xl bg-card border border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Admin Actions
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* Share Full Report */}
            <button
              onClick={() => setStep("date-picker")}
              disabled={generateMutation.isPending}
              className="flex-1 h-10 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
            >
              <Share2 className="size-4" />
              Share Full Report
            </button>

            {/* Clear All Expenses */}
            <button
              onClick={() => {
                if (!reportShared) {
                  showError("Please share or copy the expense report first before clearing.");
                  return;
                }
                setShowClearDialog(true);
              }}
              disabled={clearMutation.isPending}
              className="flex-1 h-10 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95 hover:bg-red-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="size-4" />
              Clear All Expenses
            </button>
          </div>

          {!reportShared && (
            <p className="mt-2 text-[11px] text-muted-foreground text-center">
              Share the report first to unlock the Clear button.
            </p>
          )}

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 text-center flex items-center gap-2 justify-center">
              <AlertTriangle className="size-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="mt-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400 text-center flex items-center gap-2 justify-center">
              <CheckCircle2 className="size-4 shrink-0" /> {success}
            </div>
          )}
        </div>
      </div>

      {/* ── Date Picker Dialog ── */}
      <AnimatePresence>
        {step === "date-picker" && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
              onClick={() => setStep("idle")}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-x-4 bottom-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-sm z-[61] bg-background rounded-3xl border border-border shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-base">Select Period</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Leave blank for all time</p>
                </div>
                <button
                  onClick={() => setStep("idle")}
                  className="size-8 rounded-full bg-muted grid place-items-center hover:bg-primary/10 transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                    From
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      max={toDate || undefined}
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-muted/50 border border-border text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                    To
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      min={fromDate || undefined}
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-muted/50 border border-border text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setStep("idle")}
                  className="flex-1 h-11 rounded-2xl bg-muted text-sm font-semibold hover:bg-muted/70 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  className="flex-1 h-11 rounded-2xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-all active:scale-95"
                >
                  {generateMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating…
                    </span>
                  ) : (
                    "Generate Report"
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Report Preview Dialog ── */}
      <AnimatePresence>
        {step === "preview" && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
              onClick={() => setStep("idle")}
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className={[
                "fixed z-[61] bg-background flex flex-col",
                "inset-x-0 bottom-0",
                "h-[90dvh]",                         // mobile: 90% screen height from bottom
                "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
                "sm:w-full sm:max-w-lg sm:h-auto sm:max-h-[88vh]",
                "rounded-t-3xl sm:rounded-3xl border border-border shadow-[0_24px_60px_rgba(0,0,0,0.3)]",
              ].join(" ")}
            >
              {/* drag handle (mobile) */}
              <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 sm:hidden shrink-0" />

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border shrink-0">
                <div>
                  <h3 className="font-bold text-base">Expense Report</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fromDate || toDate
                      ? `${fromDate ? fmtDate(fromDate) : "Start"} – ${toDate ? fmtDate(toDate) : "Today"}`
                      : "All time"}
                  </p>
                </div>
                <button
                  onClick={() => setStep("idle")}
                  className="size-9 rounded-full bg-muted grid place-items-center hover:bg-primary/10 transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Scrollable report text */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-2">
                <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed bg-muted/40 rounded-2xl p-4">
                  {reportText}
                </pre>
              </div>

              {/* Footer actions */}
              <div className="shrink-0 px-5 py-4 border-t border-border space-y-2">
                {reportShared && (
                  <div className="flex items-center gap-2 text-xs text-green-400 justify-center pb-1">
                    <CheckCircle2 className="size-3.5" /> Report shared — Clear All Expenses is now unlocked
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep("idle")}
                    className="flex-1 h-11 rounded-2xl bg-muted text-sm font-semibold hover:bg-muted/70 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex-1 h-11 rounded-2xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Share2 className="size-4" />
                    {reportShared ? "Share Again" : "Share Report"}
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
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
              onClick={() => setShowClearDialog(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
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
                This will permanently delete all expenses, settlements, and audit records for this group.
                The group, members, and accounts will remain intact.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClearDialog(false)}
                  className="flex-1 h-11 rounded-2xl bg-muted text-sm font-semibold hover:bg-muted/70 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => clearMutation.mutate()}
                  disabled={clearMutation.isPending}
                  className="flex-1 h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all"
                >
                  {clearMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Clearing…
                    </span>
                  ) : (
                    "Yes, Clear All"
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
