import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { AppShell, GroupSwitcher } from "@/components/AppShell";
import { ExpenseDetailDialog } from "@/components/ExpenseDetailDialog";
import { FinancialSummaryCard } from "@/components/dashboard/FinancialSummaryCard";
import { QuickActionsGrid } from "@/components/dashboard/QuickActionsGrid";
import { RecentExpensesList } from "@/components/dashboard/RecentExpensesList";
import { BalanceOverview } from "@/components/dashboard/BalanceOverview";
import { SpendingCharts, type MonthlyPoint } from "@/components/dashboard/SpendingCharts";
import { useSheet } from "@/lib/sheet";
import { useAuth } from "@/lib/auth";
import { type ApiExpense, balanceApi, expenseApi, groupApi, summaryApi } from "@/lib/api/endpoints";
import { QK } from "@/lib/queryKeys";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Splitit - Home" }] }),
  component: Dashboard,
});

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
  });

  const { data: expensesData, isLoading: expLoading } = useQuery({
    queryKey: QK.expenses(activeGroupId),
    queryFn: () => expenseApi.list({ limit: 200 }).then((r) => r.data.data),
    enabled: !!activeGroupId,
  });

  const { data: catData = [], isLoading: catLoading } = useQuery({
    queryKey: QK.summaryCategory(activeGroupId),
    queryFn: () => summaryApi.category().then((r) => r.data.data),
    enabled: !!activeGroupId,
  });

  const myBalance = balances.find((b) => b.userId === user?._id);
  const netBalance = myBalance?.netBalance ?? 0;
  const toCollect = Math.max(netBalance, 0);
  const toPay = Math.max(-netBalance, 0);
  const allExpenses = Array.isArray(expensesData) ? expensesData : [];
  const recentExpenses = allExpenses.filter((e) => !e.isDeleted).slice(0, 5);
  const totalSpent = allExpenses.filter((e) => !e.isDeleted).reduce((s, e) => s + e.amount, 0);
  const myExpenses = allExpenses.filter((e) => e.paidBy?._id === user?._id && !e.isDeleted);
  const myTotalSpent = myExpenses.reduce((s, e) => s + e.amount, 0);
  const myExpenseCount = myExpenses.length;
  const memberCount = groupData?.members?.length ?? balances.length;

  // Monthly trend — last 6 months in chronological order (oldest → newest)
  const monthlyMap = new Map<string, { amount: number; ts: number }>();
  for (const e of allExpenses) {
    const d = new Date(e.createdAt);
    // Key: YYYY-MM so it sorts correctly as a string
    const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    const existing = monthlyMap.get(sortKey);
    monthlyMap.set(sortKey, {
      amount: (existing?.amount ?? 0) + e.amount,
      ts: existing?.ts ?? d.getTime(),
    });
    // Store label separately keyed by sortKey
    (monthlyMap as unknown as Map<string, { amount: number; ts: number; label: string }>)
      .get(sortKey)!.label = label;
  }
  const monthly: MonthlyPoint[] = Array.from(
    (monthlyMap as unknown as Map<string, { amount: number; ts: number; label: string }>).entries()
  )
    .sort(([a], [b]) => a.localeCompare(b))   // sort by YYYY-MM ascending
    .slice(-6)                                  // keep last 6 months
    .map(([, v]) => ({ month: v.label, amount: v.amount }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <AppShell>
      {/* Greeting */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {greeting}, {user?.name?.split(" ")[0] ?? "there"}
          </p>
          <div className="flex items-center gap-2 min-w-0 mt-0.5">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {groupData?.name ?? "Your PG"}
            </h1>
            {memberCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                <Users className="size-3 text-primary" />
                {memberCount}
              </span>
            )}
            <GroupSwitcher compact />
          </div>
          {groupData?.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
              {groupData.description}
            </p>
          )}
        </div>
      </div>

      {/* 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">

        {/* LEFT */}
        <div className="space-y-5">
          {/* Financial card — now includes total spent */}
          <FinancialSummaryCard
            netBalance={netBalance}
            toCollect={toCollect}
            toPay={toPay}
            totalSpent={totalSpent}
            expenseCount={allExpenses.length}
            myTotalSpent={myTotalSpent}
            myExpenseCount={myExpenseCount}
            isLoading={balLoading}
          />

          {/* Quick add */}
          <QuickActionsGrid onPick={(cat) => openSheet(cat)} />

          {/* Balances — desktop */}
          <div className="hidden lg:block">
            <BalanceOverview balances={balances} currentUserId={user?._id} />
          </div>

          {/* Recent expenses — desktop (below balances) */}
          <div className="hidden lg:block">
            <RecentExpensesList
              expenses={recentExpenses}
              isLoading={expLoading}
              onAddFirst={() => openSheet()}
              onSelect={setSelectedExpense}
            />
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-5">
          {/* Charts */}
          <SpendingCharts
            monthly={monthly}
            categories={catData}
            isLoading={catLoading}
          />
        </div>
      </div>

      {/* Mobile: balances then recent expenses */}
      <div className="lg:hidden mt-5 space-y-5">
        <BalanceOverview balances={balances} currentUserId={user?._id} />
        <RecentExpensesList
          expenses={recentExpenses}
          isLoading={expLoading}
          onAddFirst={() => openSheet()}
          onSelect={setSelectedExpense}
        />
      </div>

      <div className="h-4" />

      <ExpenseDetailDialog
        expense={selectedExpense}
        open={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
      />
    </AppShell>
  );
}
