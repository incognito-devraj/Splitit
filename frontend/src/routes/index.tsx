import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Plus, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell, GroupSwitcher } from "@/components/AppShell";
import { ExpenseDetailDialog } from "@/components/ExpenseDetailDialog";
import { CATEGORIES } from "@/lib/store";
import { useSheet } from "@/lib/sheet";
import { useAuth } from "@/lib/auth";
import { ApiExpense, balanceApi, expenseApi, groupApi } from "@/lib/api/endpoints";
import { QK } from "@/lib/queryKeys";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Splitit - Home" }] }),
  component: Dashboard,
});

function formatDay(ts: string) {
  const d = new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// Home dashboard: greeting, balances, quick add, and recent expenses.
function Dashboard() {
  const { user } = useAuth();
  const openSheet = useSheet((s) => s.openSheet);
  const [selectedExpense, setSelectedExpense] = useState<ApiExpense | null>(null);
  const activeGroupId = user?.groupId ?? null;

  const { data: groupData } = useQuery({
    queryKey: QK.group(activeGroupId),
    queryFn: () => groupApi.current().then((r) => r.data.data),
    enabled: !!activeGroupId,
  });

  const { data: balances = [], isLoading: balLoading } = useQuery({
    queryKey: QK.balances(activeGroupId),
    queryFn: () => balanceApi.all().then((r) => r.data.data),
    enabled: !!activeGroupId,
    refetchInterval: 30_000,
  });

  const { data: expensesData, isLoading: expLoading } = useQuery({
    queryKey: QK.expenses(activeGroupId),
    queryFn: () => expenseApi.list({ limit: 100 }).then((r) => r.data.data),
    enabled: !!activeGroupId,
  });

  const myBalance = balances.find((b) => b.userId === user?._id);
  const netBalance = myBalance?.netBalance ?? 0;
  const personalReceivable = Math.max(netBalance, 0);
  const toPayAmount = Math.max(-netBalance, 0);
  const signedNetBalance =
    netBalance > 0
      ? `+₹${netBalance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
      : netBalance < 0
        ? `-₹${Math.abs(netBalance).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
        : "₹0";
  const recentExpenses = Array.isArray(expensesData) ? expensesData.slice(0, 5) : [];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <AppShell>
      {/* Greeting and current group row */}
      <div className="px-4 sm:px-6 pt-0">
        <div className="min-w-0">
          <p className="text-m text-muted-foreground">
            {greeting}, {user?.name?.split(" ")[0] ?? "there"}
          </p>
          <div className="-mt-1 flex items-center gap-2 min-w-0">
            <h1 className="min-w-0 text-2xl sm:text-2xl font-bold tracking-tight truncate">
              {groupData?.name ?? "Your PG"}
            </h1>
            <div className="inline-flex items-center pl-2 gap-1.5 text-xs text-muted-foreground shrink-0">
              <Users className="size-4 text-primary" />
              <span className="font-semibold tabular text-foreground">{groupData?.members?.length ?? 0}</span>
            </div>
            <GroupSwitcher compact />
          </div>
        </div>
      </div>

      {/* Balance summary and quick actions */}
      <div className="px-4 sm:px-6 mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="space-y-4">
          {/* Net balance card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -3, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative overflow-hidden rounded-3xl p-5 sm:p-6 gradient-balance text-white shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[0_24px_60px_rgba(0,128,170,0.28)]"
          >
            <div className="absolute -top-16 -right-12 size-48 rounded-full bg-white/15 blur-2xl" />
            <div className="relative">
              <p className="text-white text-xs uppercase tracking-wider">Your net balance</p>
              {balLoading ? (
                <div className="mt-2 h-12 w-32 bg-white/20 rounded-xl animate-pulse" />
              ) : (
                <>
                  <div className="mt-1 text-4xl sm:text-5xl font-semibold tabular tracking-tight text-white">
                    {signedNetBalance}
                  </div>
                  <p className="text-white text-sm mt-1">
                    {netBalance >= 0 ? "You are owed" : "You owe in total"}
                  </p>
                </>
              )}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <motion.div
                  whileHover={{ y: -2, scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className="group rounded-2xl bg-white/15 backdrop-blur p-3 text-white shadow-[0_10px_30px_rgba(0,0,0,0.28)] transition-colors duration-200 hover:bg-white/22"
                >
                  <div className="flex items-center gap-1.5 text-white text-xs">
                    <ArrowDownLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:-translate-x-0.5" /> To collect
                  </div>
                  <div className="mt-1 text-lg sm:text-xl font-semibold tabular text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
                    ₹{personalReceivable.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                </motion.div>
                <motion.div
                  whileHover={{ y: -2, scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className="group rounded-2xl bg-white/15 backdrop-blur p-3 text-white shadow-[0_10px_30px_rgba(0,0,0,0.28)] transition-colors duration-200 hover:bg-white/22"
                >
                  <div className="flex items-center gap-1.5 text-white text-xs">
                    <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /> To pay
                  </div>
                  <div className="mt-1 text-lg sm:text-xl font-semibold tabular text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)]">
                    ₹{toPayAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Quick-add category grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm sm:text-base font-semibold">Quick add</h2>
              <span className="text-xs text-muted-foreground">Tap a category</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 sm:gap-3">
              {CATEGORIES.map((c, i) => (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ y: -4 }}
                  onClick={() => openSheet(c.id)}
                  className="group flex flex-col items-center gap-1"
                >
                  <div
                    className="size-12 sm:size-14 rounded-2xl grid place-items-center text-xl sm:text-2xl transition-all duration-200 group-hover:scale-110 group-hover:-rotate-3 group-hover:shadow-[0_14px_30px_rgba(0,0,0,0.14)]"
                    style={{ background: `color-mix(in oklab, ${c.tint} 22%, transparent)` }}
                  >
                    {c.emoji}
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground transition-colors duration-200 group-hover:text-foreground">{c.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Desktop balances list */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Balances</h2>
              <Link to="/members" className="text-xs text-primary font-medium">
                Manage
              </Link>
            </div>
            <div className="space-y-2">
              {balances.slice(0, 4).map((b) => {
                const isMe = b.userId === user?._id;
                const positive = b.netBalance >= 0;
                const settled = Math.abs(b.netBalance) < 0.5;
                return (
                  <motion.div
                    key={b.userId}
                    whileHover={{ x: 3, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 320, damping: 24 }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.10)]"
                  >
                    <div className="size-8 rounded-full bg-muted overflow-hidden grid place-items-center text-sm shrink-0">
                      {b.avatar ? <img src={b.avatar} alt={b.name} className="size-full object-cover" /> : "👤"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {b.name}
                        {isMe ? " (you)" : ""}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{b.email}</div>
                    </div>
                    <span
                      className={`text-sm font-semibold tabular ${
                        settled ? "text-muted-foreground" : positive ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {settled ? "Settled" : `${positive ? "+" : "−"}₹${Math.abs(b.netBalance).toFixed(0)}`}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent expenses list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-semibold">Recent Expenses</h2>
            <Link to="/expenses" className="text-xs text-primary font-medium">
              See all
            </Link>
          </div>

          {expLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-card border border-border animate-pulse" />
              ))}
            </div>
          )}

          {!expLoading && recentExpenses.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-10 rounded-3xl bg-card border border-border gap-3"
            >
              <span className="text-4xl">🧾</span>
              <p className="text-sm text-muted-foreground">No expenses yet</p>
              <button
                onClick={() => openSheet()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold"
              >
                <Plus className="size-3.5" /> Add first expense
              </button>
            </motion.div>
          )}

          <div className="space-y-2">
            {recentExpenses.map((e, i) => {
              const cat = CATEGORIES.find((c) => c.id === e.category) ?? CATEGORIES[CATEGORIES.length - 1];
              return (
                <motion.button
                  key={e._id}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelectedExpense(e)}
                  className="w-full cursor-pointer flex items-center gap-3 p-3 rounded-2xl bg-card border border-border text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.99]"
                >
                  <div
                    className="size-10 sm:size-12 rounded-2xl grid place-items-center text-lg sm:text-xl shrink-0"
                    style={{ background: `color-mix(in oklab, ${cat.tint} 22%, transparent)` }}
                  >
                    {cat.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{e.title || cat.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.paidBy.name} · {e.paidBy.email} · {formatDay(e.createdAt)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold tabular text-sm">₹{e.amount.toLocaleString("en-IN")}</div>
                    <div className="text-[10px] text-muted-foreground">₹{e.splitAmount.toFixed(0)}/head</div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="h-4" />
      <ExpenseDetailDialog expense={selectedExpense} open={!!selectedExpense} onClose={() => setSelectedExpense(null)} />
    </AppShell>
  );
}
