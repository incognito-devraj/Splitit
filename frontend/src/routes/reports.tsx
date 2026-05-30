import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Share2, FileText, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CATEGORIES } from "@/lib/store";
import { summaryApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports · PG Split" }] }),
  component: Reports,
});

function Reports() {
  const { user } = useAuth();
  const [showFull, setShowFull] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["summary"],
    queryFn: () => summaryApi.get().then((r) => r.data.data),
    enabled: !!user?.groupId,
  });

  const { data: catData = [] } = useQuery({
    queryKey: ["summary-category"],
    queryFn: () => summaryApi.category().then((r) => r.data.data),
    enabled: !!user?.groupId,
  });

  const max = catData[0]?.total ?? 1;

  const shareWhatsApp = () => {
    if (!summary?.whatsappText) return;
    const url = `https://wa.me/?text=${encodeURIComponent(summary.whatsappText)}`;
    window.open(url, "_blank");
  };

  return (
    <AppShell>
      <div className="px-5 pt-6">
        <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Spending overview</p>
      </div>

      {/* Total card */}
      <div className="px-5 mt-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-5 bg-card border border-border">
          {isLoading ? (
            <div className="h-12 bg-muted rounded-xl animate-pulse" />
          ) : (
            <>
              <div className="text-xs text-muted-foreground">Total spent</div>
              <div className="mt-1 text-4xl font-semibold tabular text-gradient">
                ₹{(summary?.totalAmount ?? 0).toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                across {summary?.totalExpenses ?? 0} expenses
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Full Report button */}
      <div className="px-5 mt-4">
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowFull(true)}
          className="w-full h-12 rounded-2xl border border-primary/30 bg-primary/10 text-primary font-semibold flex items-center justify-center gap-2">
          <FileText className="size-4" /> Generate Full Report
        </motion.button>
      </div>

      {/* By Category */}
      <div className="px-5 mt-6">
        <h2 className="text-base font-semibold">By category</h2>
        <div className="mt-3 space-y-2">
          {catData.map(({ category, total }, i) => {
            const cat = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[CATEGORIES.length - 1];
            const pct = (total / max) * 100;
            return (
              <motion.div key={category} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }} className="p-3 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl grid place-items-center text-lg"
                    style={{ background: `color-mix(in oklab, ${cat.tint} 22%, transparent)` }}>
                    {cat.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{cat.label}</span>
                      <span className="text-sm font-semibold tabular">₹{total.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.1 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full" style={{ background: cat.tint }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Summary card */}
      <div className="px-5 mt-6 pb-4">
        <h2 className="text-base font-semibold">Summary</h2>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-3xl p-5 bg-card border border-border">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">📌 Who owes what</div>
          <div className="mt-3 space-y-2">
            {(summary?.summary ?? []).map((s) => (
              <div key={s.userId} className="flex items-center justify-between text-sm">
                <span className="font-medium">{s.name}</span>
                <span className={`tabular font-semibold ${s.action === "receives" ? "text-green-400" : "text-red-400"}`}>
                  {s.action} ₹{s.amount.toFixed(0)}
                </span>
              </div>
            ))}
            {(summary?.summary ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">✅ All settled up!</p>
            )}
          </div>
          <motion.button whileTap={{ scale: 0.97 }} onClick={shareWhatsApp}
            className="mt-5 w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2">
            <Share2 className="size-4" /> Share to WhatsApp
          </motion.button>
        </motion.div>
      </div>

      {/* Full Report Overlay */}
      <AnimatePresence>
        {showFull && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex flex-col">
            <div className="flex items-center justify-between px-5 pt-6 pb-3">
              <h2 className="text-xl font-semibold tracking-tight">Full Report</h2>
              <button onClick={() => setShowFull(false)} className="size-10 rounded-full glass grid place-items-center">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
              <div className="rounded-2xl p-4 bg-card border border-border">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Total expenses</div>
                    <div className="text-2xl font-semibold tabular">{summary?.totalExpenses ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total amount</div>
                    <div className="text-2xl font-semibold tabular text-gradient">
                      ₹{(summary?.totalAmount ?? 0).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl p-4 bg-card border border-border">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Per member</div>
                <div className="space-y-2">
                  {(summary?.balances ?? []).map((b) => (
                    <div key={b.userId} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{b.name}</span>
                      <span className={`tabular font-semibold ${b.netBalance >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {b.netBalance >= 0 ? "+" : "−"}₹{Math.abs(b.netBalance).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl p-4 bg-card border border-border">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">WhatsApp Message</div>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                  {summary?.whatsappText}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
