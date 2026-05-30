import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { CATEGORIES } from "@/lib/store";
import { useSheet } from "@/lib/sheet";
import { useAuth } from "@/lib/auth";
import { balanceApi, expenseApi, groupApi } from "@/lib/api/endpoints";

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
    queryKey: ["group"],
    queryFn: () => groupApi.current().then((r) => r.data.data),
    enabled: !!user?.groupId,
  });

  const { data: balances = [] } = useQuery({
    queryKey: ["balances"],
    queryFn: () => balanceApi.all().then((r) => r.data.data),
    enabled: !!user?.groupId,
    refetchInterval: 30_000,
  });

  const { data: expensesData } = useQuery({
    queryKey: ["expenses", { limit: 5 }],
    queryFn: () => expenseApi.list({ limit: 5 }).then((r) => r.data),
    enabled: !!user?.groupId,
  });

  const myBalance = balances.find((b) => b.userId === user?._id);
  const netBalance = myBalance?.netBalance ?? 0;
  const totalReceivable = balances.filter((b) => b.netBalance > 0).reduce((s, b) => s + b.netBalance, 0);
  const totalOwed = balances.filter((b) => b.netBalance < 0).reduce((s, b) => s + Math.abs(b.netBalance), 0);
  const recentExpenses = expensesData?.data ?? [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <AppShell>
      {/* Top bar */}
      <div className="px-5 pt-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greeting}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{groupData?.name ?? "Your PG"}</h1>
        </div>
        <div className="size-10 rounded-full overflow-hidden bg-muted">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="size-full object-cover" />
          ) : (
            <div className="size-full grid place-items-center text-lg">👤</div>
          )}
        </div>
      </div>

      {/* Balance Card */}
      <div className="px-5 mt-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-6 gradient-balance text-white shadow-[var(--shadow-card)]"
        >
          <div className="absolute -top-16 -right-12 size-48 rounded-full bg-white/15 blur-2xl" />
          <div className="relative">
            <p className="text-white/80 text-xs uppercase tracking-wider">Net balance</p>
            <div className="mt-1 text-5xl font-semibold tabular tracking-tight">
              ₹{Math.abs(netBalance).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
            <p className="text-white/80 text-sm mt-1">
              {netBalance >= 0 ? "You're getting back" : "You owe in total"}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/15 backdrop-blur p-3">
                <div className="flex items-center gap-1.5 text-white/80 text-xs">
                  <ArrowDownLeft className="size-3.5" /> Receivable
                </div>
                <div className="mt-1 text-xl font-semibold tabular">
                  ₹{totalReceivable.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div className="rounded-2xl bg-white/15 backdrop-blur p-3">
                <div className="flex items-center gap-1.5 text-white/80 text-xs">
                  <ArrowUpRight className="size-3.5" /> Owed
                </div>
                <div className="mt-1 text-xl font-semibold tabular">
                  ₹{totalOwed.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="px-5 mt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Quick add</h2>
          <span className="text-xs text-muted-foreground">Tap a category</span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {CATEGORIES.map((c, i) => (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => openSheet(c.id)}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="size-14 rounded-2xl grid place-items-center text-2xl"
                style={{ background: `color-mix(in oklab, ${c.tint} 22%, transparent)` }}>
                {c.emoji}
              </div>
              <span className="text-[11px] text-muted-foreground">{c.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="px-5 mt-7 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent</h2>
          <Link to="/expenses" className="text-xs text-primary font-medium">See all</Link>
        </div>
        <div className="mt-3 space-y-2">
          {recentExpenses.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No expenses yet. Add your first one!
            </div>
          )}
          {recentExpenses.map((e, i) => {
            const cat = CATEGORIES.find((c) => c.id === e.category) ?? CATEGORIES[CATEGORIES.length - 1];
            return (
              <motion.div
                key={e._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
              >
                <div className="size-12 rounded-2xl grid place-items-center text-xl"
                  style={{ background: `color-mix(in oklab, ${cat.tint} 22%, transparent)` }}>
                  {cat.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{e.title || cat.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.paidBy.name} paid · {formatDay(e.createdAt)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular">₹{e.amount.toLocaleString("en-IN")}</div>
                  <div className="text-[10px] text-muted-foreground">
                    ₹{e.splitAmount.toFixed(0)}/head
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
