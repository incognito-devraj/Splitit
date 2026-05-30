import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { CATEGORIES } from "@/lib/store";
import { expenseApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/expenses")({
  head: () => ({ meta: [{ title: "Expenses · PG Split" }] }),
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

  const { data, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => expenseApi.list({ limit: 100 }).then((r) => r.data.data),
    enabled: !!user?.groupId,
  });

  const expenses = data ?? [];

  // Group by day
  const grouped = expenses.reduce<Record<string, typeof expenses>>((acc, e) => {
    const k = formatDay(e.createdAt);
    (acc[k] ??= []).push(e);
    return acc;
  }, {});

  return (
    <AppShell>
      <div className="px-5 pt-6">
        <h1 className="text-3xl font-semibold tracking-tight">Expenses</h1>
        <p className="text-sm text-muted-foreground mt-1">All your PG spends, in one place</p>
      </div>

      {isLoading && (
        <div className="px-5 mt-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && expenses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <span className="text-5xl mb-4">🧾</span>
          <p className="text-sm">No expenses yet</p>
          <p className="text-xs mt-1">Tap + to add your first expense</p>
        </div>
      )}

      <div className="px-5 mt-6 space-y-6 pb-4">
        {Object.entries(grouped).map(([day, items]) => (
          <div key={day}>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{day}</div>
            <div className="relative pl-5">
              <div className="absolute left-1.5 top-2 bottom-2 w-px bg-border" />
              <div className="space-y-3">
                {items.map((e, i) => {
                  const cat = CATEGORIES.find((c) => c.id === e.category) ?? CATEGORIES[CATEGORIES.length - 1];
                  return (
                    <motion.div
                      key={e._id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="relative"
                    >
                      <div className="absolute -left-[18px] top-4 size-3 rounded-full ring-4 ring-background"
                        style={{ background: cat.tint }} />
                      <div className="p-4 rounded-2xl bg-card border border-border">
                        <div className="flex items-start gap-3">
                          <div className="size-11 rounded-xl grid place-items-center text-xl shrink-0"
                            style={{ background: `color-mix(in oklab, ${cat.tint} 22%, transparent)` }}>
                            {cat.emoji}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{e.title || cat.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {e.paidBy.name} paid · {e.sharedWith.length} members
                            </div>
                            {e.notes && (
                              <div className="text-xs text-muted-foreground mt-0.5 italic">"{e.notes}"</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-semibold tabular">₹{e.amount.toLocaleString("en-IN")}</div>
                            <div className="text-[10px] text-muted-foreground">
                              ₹{e.splitAmount.toFixed(0)}/head
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
