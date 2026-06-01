import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ExpenseDetailDialog } from "@/components/ExpenseDetailDialog";
import { CATEGORIES } from "@/lib/store";
import { ApiExpense, expenseApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth";
import { useSheet } from "@/lib/sheet";
import { QK } from "@/lib/queryKeys";

export const Route = createFileRoute("/expenses")({
  head: () => ({ meta: [{ title: "Splitit - Expenses" }] }),
  component: Expenses,
});

function formatDay(ts: string) {
  const d = new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function Expenses() {
  const { user } = useAuth();
  const openSheet = useSheet((s) => s.openSheet);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [selectedExpense, setSelectedExpense] = useState<ApiExpense | null>(null);
  const activeGroupId = user?.groupId ?? null;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: QK.expenses(activeGroupId),
    queryFn: () => expenseApi.list({ limit: 100 }).then((r) => r.data.data),
    enabled: !!activeGroupId,
  });

  // Defensive: always an array regardless of API shape
  const allExpenses = Array.isArray(data) ? data : [];

  // Filter
  const filtered = allExpenses.filter((e) => {
    const matchSearch = !search ||
      e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.paidBy.name.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || e.category === filterCat;
    return matchSearch && matchCat;
  });

  // Group by day
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, e) => {
    const k = formatDay(e.createdAt);
    (acc[k] ??= []).push(e);
    return acc;
  }, {});

  return (
    <AppShell>
      <div className="px-4 sm:px-6 pt-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Expenses</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {allExpenses.length} total · ₹{allExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString("en-IN")}
        </p>
      </div>

      {/* Search */}
      <div className="px-4 sm:px-6 mt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses…"
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Category filter pills */}
      <div className="px-4 sm:px-6 mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilterCat("")}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all hover:-translate-y-0.5 ${
            !filterCat ? "gradient-primary text-primary-foreground border-transparent shadow-[var(--shadow-glow)]" : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilterCat(filterCat === c.id ? "" : c.id)}
            className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all hover:-translate-y-0.5 ${
              filterCat === c.id ? "gradient-primary text-primary-foreground border-transparent shadow-[var(--shadow-glow)]" : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {isError && (
        <div className="px-4 sm:px-6 mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 text-center">
          {(error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to load expenses. Please try again."}
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="px-4 sm:px-6 mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && allExpenses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <span className="text-5xl">🧾</span>
          <p className="text-sm text-muted-foreground">No expenses yet</p>
          <button onClick={() => openSheet()}
            className="px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold">
            Add first expense
          </button>
        </div>
      )}

      {/* No search results */}
      {!isLoading && allExpenses.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <span className="text-4xl">🔍</span>
          <p className="text-sm text-muted-foreground">No matching expenses</p>
          <button onClick={() => { setSearch(""); setFilterCat(""); }}
            className="text-xs text-primary font-medium">Clear filters</button>
        </div>
      )}

      {/* Expense list */}
      <div className="px-4 sm:px-6 mt-4 space-y-6 pb-4">
        {Object.entries(grouped).map(([day, items]) => (
          <div key={day}>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{day}</div>
            <div className="relative pl-5">
              <div className="absolute left-1.5 top-2 bottom-2 w-px bg-border" />
              <div className="space-y-3">
                {items.map((e, i) => {
                  const cat = CATEGORIES.find((c) => c.id === e.category) ?? CATEGORIES[CATEGORIES.length - 1];
                  return (
                    <motion.button
                      key={e._id}
                      type="button"
                      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedExpense(e)}
                      className="group relative w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-2xl"
                    >
                      <div className="absolute -left-[18px] top-4 size-3 rounded-full ring-4 ring-background"
                        style={{ background: cat.tint }} />
                      <div className="p-4 rounded-2xl bg-card border border-border transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:shadow-[0_16px_34px_rgba(0,0,0,0.12)]">
                        <div className="flex items-start gap-3">
                          <div className="size-11 rounded-xl grid place-items-center text-xl shrink-0 transition-transform duration-200 group-hover:scale-105"
                            style={{ background: `color-mix(in oklab, ${cat.tint} 22%, transparent)` }}>
                            {cat.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{e.title || cat.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {e.paidBy.name} paid · {(e.sharedWith?.length ?? 0) + (e.guestParticipants?.length ?? 0)} participants
                              {(e.guestParticipants?.length ?? 0) > 0 && (
                                <span className="ml-1 text-amber-400">
                                  ({e.guestParticipants.length} guest{e.guestParticipants.length !== 1 ? "s" : ""})
                                </span>
                              )}
                            </div>
                            {e.notes && (
                              <div className="text-xs text-muted-foreground mt-0.5 italic">"{e.notes}"</div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-semibold tabular">₹{e.amount.toLocaleString("en-IN")}</div>
                            <div className="text-[10px] text-muted-foreground">
                              ₹{e.splitAmount.toFixed(0)}/head
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
      <ExpenseDetailDialog
        expense={selectedExpense}
        open={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
      />
    </AppShell>
  );
}
