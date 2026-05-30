import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Users, Plus, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { CATEGORIES } from "@/lib/store";
import { useSheet } from "@/lib/sheet";
import { useAuth } from "@/lib/auth";
import { balanceApi, expenseApi, groupApi } from "@/lib/api/endpoints";
import { QK } from "@/lib/queryKeys";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "PG Split — Home" }] }),
  component: Dashboard,
});

function formatDay(ts: string) {
  const d = new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function Dashboard() {
  const { user } = useAuth();
  const openSheet = useSheet((s) => s.openSheet);

  const { data: groupData } = useQuery({
    queryKey: QK.group,
    queryFn: () => groupApi.current().then((r) => r.data.data),
    enabled: !!user?.groupId,
  });

  const { data: balances = [], isLoading: balLoading } = useQuery({
    queryKey: QK.balances,
    queryFn: () => balanceApi.all().then((r) => r.data.data),
    enabled: !!user?.groupId,
    refetchInterval: 30_000,
  });

  const { data: expensesData, isLoading: expLoading } = useQuery({
    queryKey: QK.expenses,
    queryFn: () => expenseApi.list({ limit: 100 }).then((r) => r.data),
    enabled: !!user?.groupId,
  });

  const myBalance = balances.find((b) => b.userId === user?._id);
  const netBalance = myBalance?.netBalance ?? 0;
  const totalReceivable = balances.filter((b) => b.netBalance > 0).reduce((s, b) => s + b.netBalance, 0);
  const totalOwed = balances.filter((b) => b.netBalance < 0).reduce((s, b) => s + Math.abs(b.netBalance), 0);
  const recentExpenses = (expensesData?.data ?? []).slice(0, 5);
  const memberCount = groupData?.members?.length ?? balances.length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <AppShell>
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{greeting}, {user?.name?.split(" ")[0] ?? "there"}</p>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">
            {groupData?.name ?? "Your PG"}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/members"
            className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card border border-border rounded-full px-3 py-1.5">
            <Users className="size-3" />
            <span>{memberCount}</span>
          </Link>
          <Link to="/settings">
            <div className="size-9 rounded-full overflow-hidden bg-muted">
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} className="size-full object-cover" />
                : <div className="size-full grid place-items-center"><Settings className="size-4 text-muted-foreground" /></div>}
            </div>
          </Link>
        </div>
      </div>

      {/* ── Desktop: 2-col layout ────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">

        {/* LEFT COLUMN */}
        <div className="space-y-4">
          {/* Balance Card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl p-5 sm:p-6 gradient-balance text-white shadow-[var(--shadow-card)]">
            <div className="absolute -top-16 -right-12 size-48 rounded-full bg-white/15 blur-2xl" />
            <div className="relative">
              <p className="text-white/80 text-xs uppercase tracking-wider">Your net balance</p>
              {balLoading ? (
                <div className="mt-2 h-12 w-32 bg-white/20 rounded-xl animate-pulse" />
              ) : (
                <>
                  <div className="mt-1 text-4xl sm:text-5xl font-semibold tabular tracking-tight">
                    ₹{Math.abs(netBalance).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                  <p className="text-white/80 text-sm mt-1">
                    {netBalance >= 0 ? "You're getting back" : "You owe in total"}
                  </p>
                </>
              )}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/15 backdrop-blur p-3">
                  <div className="flex items-center gap-1.5 text-white/80 text-xs">
                    <ArrowDownLeft className="size-3.5" /> Receivable
                  </div>
                  <div className="mt-1 text-lg sm:text-xl font-semibold tabular">
                    ₹{totalReceivable.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/15 backdrop-blur p-3">
                  <div className="flex items-center gap-1.5 text-white/80 text-xs">
                    <ArrowUpRight className="size-3.5" /> Owed
                  </div>
                  <div className="mt-1 text-lg sm:text-xl font-semibold tabular">
                    ₹{totalOwed.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm sm:text-base font-semibold">Quick add</h2>
              <span className="text-xs text-muted-foreground">Tap a category</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 sm:gap-3">
              {CATEGORIES.map((c, i) => (
                <motion.button key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }} whileTap={{ scale: 0.9 }}
                  onClick={() => openSheet(c.id)}
                  className="flex flex-col items-center gap-1">
                  <div className="size-12 sm:size-14 rounded-2xl grid place-items-center text-xl sm:text-2xl"
                    style={{ background: `color-mix(in oklab, ${c.tint} 22%, transparent)` }}>
                    {c.emoji}
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground">{c.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Member balances summary — desktop only */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Balances</h2>
              <Link to="/members" className="text-xs text-primary font-medium">Manage</Link>
            </div>
            <div className="space-y-2">
              {balances.slice(0, 4).map((b) => {
                const isMe = b.userId === user?._id;
                const positive = b.netBalance >= 0;
                const settled = Math.abs(b.netBalance) < 0.5;
                return (
                  <div key={b.userId} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
                    <div className="size-8 rounded-full bg-muted overflow-hidden grid place-items-center text-sm shrink-0">
                      {b.avatar ? <img src={b.avatar} alt={b.name} className="size-full object-cover" /> : "👤"}
                    </div>
                    <span className="flex-1 text-sm font-medium truncate">{b.name}{isMe ? " (you)" : ""}</span>
                    <span className={`text-sm font-semibold tabular ${settled ? "text-muted-foreground" : positive ? "text-green-400" : "text-red-400"}`}>
                      {settled ? "Settled" : `${positive ? "+" : "−"}₹${Math.abs(b.netBalance).toFixed(0)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Recent Expenses */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-semibold">Recent Expenses</h2>
            <Link to="/expenses" className="text-xs text-primary font-medium">See all</Link>
          </div>

          {expLoading && (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-card border border-border animate-pulse" />)}
            </div>
          )}

          {!expLoading && recentExpenses.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-10 rounded-3xl bg-card border border-border gap-3">
              <span className="text-4xl">🧾</span>
              <p className="text-sm text-muted-foreground">No expenses yet</p>
              <button onClick={() => openSheet()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold">
                <Plus className="size-3.5" /> Add first expense
              </button>
            </motion.div>
          )}

          <div className="space-y-2">
            {recentExpenses.map((e, i) => {
              const cat = CATEGORIES.find((c) => c.id === e.category) ?? CATEGORIES[CATEGORIES.length - 1];
              return (
                <motion.div key={e._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
                  <div className="size-10 sm:size-12 rounded-2xl grid place-items-center text-lg sm:text-xl shrink-0"
                    style={{ background: `color-mix(in oklab, ${cat.tint} 22%, transparent)` }}>
                    {cat.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{e.title || cat.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.paidBy.name} paid · {formatDay(e.createdAt)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold tabular text-sm">₹{e.amount.toLocaleString("en-IN")}</div>
                    <div className="text-[10px] text-muted-foreground">₹{e.splitAmount.toFixed(0)}/head</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom padding for nav */}
      <div className="h-4" />
    </AppShell>
  );
}
