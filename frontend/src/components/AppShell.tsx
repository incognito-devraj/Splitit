import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, Receipt, Users, BarChart3, Settings, Plus, Layers, type LucideIcon } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { AddExpenseSheet } from "./AddExpenseSheet";
import { useSheet } from "@/lib/sheet";
import { authApi, groupApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth";
import { QK } from "@/lib/queryKeys";
import { ThemeToggle } from "@/lib/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { to: string; label: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { to: "/",         label: "Home",     icon: Home },
  { to: "/groups",   label: "Groups",   icon: Layers },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/members",  label: "Members",  icon: Users },
  { to: "/reports",  label: "Reports",  icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

function SidebarNav() {
  const { pathname } = useLocation();

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 h-screen sticky top-0 border-r border-border bg-card/40 backdrop-blur-xl">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl gradient-primary grid place-items-center text-xl shadow">🏠</div>
          <div>
            <div className="font-bold text-lg tracking-tight">PG Splito</div>
            <div className="text-xs text-muted-foreground">Expense Splitter</div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors font-medium text-sm ${
                active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}>
              <Icon className="size-5 shrink-0" strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-border">
        <p className="text-xs text-muted-foreground">PG Splito · v1.0</p>
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const openSheet = useSheet((s) => s.openSheet);
  return (
    <div className="min-h-screen bg-background text-foreground theme-app-bg">
      <div className="flex min-h-screen">
        {/* Sidebar — desktop only */}
        <SidebarNav />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
              <div className="flex-1 min-w-0">
                <div className="lg:hidden">
                  <GroupSwitcher compact />
                </div>
                <div className="hidden lg:block">
                  <GroupSwitcher compact />
                </div>
              </div>
              <button
                type="button"
                onClick={() => openSheet()}
                className="hidden lg:inline-flex h-10 items-center gap-2 rounded-2xl gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
              >
                <Plus className="size-4" strokeWidth={2.5} /> Add Expense
              </button>
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 w-full pb-28 lg:pb-8">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full px-4 sm:px-6 py-4"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav />
      <AddExpenseSheet />
    </div>
  );
}

function GroupSwitcher({ compact = false }: { compact?: boolean }) {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: groups = [] } = useQuery({
    queryKey: QK.groupsMine,
    queryFn: () => groupApi.mine().then((response) => response.data.data),
    enabled: !!user,
  });

  const activeGroupId = user?.groupId ?? null;
  const activeGroup = groups.find((group) => group._id === activeGroupId) ?? groups[0] ?? null;

  const switchMutation = useMutation({
    mutationFn: (groupId: string) => groupApi.setActive(groupId),
    onSuccess: async () => {
      const { data } = await authApi.me();
      setUser(data.data);
      await queryClient.invalidateQueries({ queryKey: QK.groupsMine });
      await queryClient.invalidateQueries({ queryKey: ["group"] });
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
      await queryClient.invalidateQueries({ queryKey: ["balances"] });
      await queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
  });

  if (!user) return null;

  if (groups.length === 0) {
    return (
      <div className={`rounded-2xl border border-border bg-card ${compact ? "p-3" : "p-4"}`}>
        <div className="text-xs text-muted-foreground">No active group</div>
        <div className="mt-1 text-sm font-semibold">Create or join a group</div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`w-full rounded-2xl border border-border bg-card text-left ${compact ? "p-3" : "p-4"}`}>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Current Group</div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold truncate">{activeGroup?.name ?? "Select a group"}</div>
              <div className="text-xs text-muted-foreground truncate">{groups.length} memberships</div>
            </div>
            <span className="text-muted-foreground">▾</span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Switch group</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {groups.map((group) => (
          <DropdownMenuItem
            key={group._id}
            onClick={() => switchMutation.mutate(group._id)}
            className="flex items-center justify-between gap-3"
          >
            <span className="truncate">{group.name}</span>
            {group._id === activeGroupId && <span className="text-xs text-primary">Active</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
