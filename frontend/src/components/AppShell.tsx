import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, Receipt, Users, BarChart3, Settings, Plus, Layers, ChevronDown, type LucideIcon } from "lucide-react";
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
  { to: "/", label: "Home", icon: Home },
  { to: "/groups", label: "Groups", icon: Layers },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/members", label: "Members", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

function SidebarNav() {
  const { pathname } = useLocation();

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 h-screen sticky top-0 border-r border-border bg-card/40 backdrop-blur-xl">
      <div className="px-6 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <img src="/favicons/android-chrome-192x192.png" alt="Splitit logo" className="size-10 rounded-2xl shadow" />
          <div>
            <div className="font-bold text-lg tracking-tight">Splitit</div>
            <div className="text-xs text-muted-foreground">Expense Splitter</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors font-medium text-sm ${
                active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-5 shrink-0" strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-border">
        <p className="text-xs text-muted-foreground">Splitit · v1.0</p>
      </div>
    </aside>
  );
}

function MobileHeader() {
  const { user } = useAuth();
  const { data: activeGroup } = useQuery({
    queryKey: QK.group(user?.groupId ?? null),
    queryFn: () => groupApi.current().then((response) => response.data.data),
    enabled: !!user?.groupId,
  });
  const memberCount = activeGroup?.members?.length ?? 0;

  return (
    <div className="sm:hidden sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3 min-w-0">
          <img src="/favicons/android-chrome-192x192.png" alt="Splitit logo" className="size-10 rounded-2xl shadow shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-none truncate">Splitit</div>
            <div className="text-[11px] text-muted-foreground truncate">Expense Splitter</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-2xl border border-border/80 bg-card/90 px-2.5 py-2 shadow-[var(--shadow-card)]">
            <Users className="size-4 text-primary" />
            <span className="text-sm font-semibold tabular">{memberCount}</span>
          </div>
          <Link to="/settings" className="size-9 rounded-full overflow-hidden bg-muted border border-border">
            {user?.avatar
              ? <img src={user.avatar} alt={user.name} className="size-full object-cover" />
              : <div className="size-full grid place-items-center"><Settings className="size-4 text-muted-foreground" /></div>}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const openSheet = useSheet((s) => s.openSheet);
  return (
    <div className="min-h-screen bg-background text-foreground theme-app-bg">
      <div className="flex min-h-screen">
        <SidebarNav />

        <div className="flex-1 flex flex-col min-w-0">
          <MobileHeader />
          <main className="flex-1 w-full pb-28 lg:pb-8">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full px-4 sm:px-6 py-4"
            >
              <DesktopTopBar />
              {children}
            </motion.div>
          </main>
        </div>
      </div>

      <BottomNav />
      <DesktopFab onClick={() => openSheet()} />
      <AddExpenseSheet />
    </div>
  );
}

function DesktopTopBar() {
  const { user } = useAuth();
  const { data: activeGroup } = useQuery({
    queryKey: QK.group(user?.groupId ?? null),
    queryFn: () => groupApi.current().then((response) => response.data.data),
    enabled: !!user?.groupId,
  });

  const memberCount = activeGroup?.members?.length ?? 0;

  return (
    <div className="hidden sm:flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2 min-w-0">
        <div className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-card/90 px-3 py-2 shadow-[var(--shadow-card)]">
          <Users className="size-4 text-primary" />
          <span className="text-sm font-semibold tabular">{memberCount}</span>
          <span className="hidden sm:inline text-xs text-muted-foreground">members</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link to="/settings" className="size-9 rounded-full overflow-hidden bg-muted border border-border">
          {user?.avatar
            ? <img src={user.avatar} alt={user.name} className="size-full object-cover" />
            : <div className="size-full grid place-items-center"><Settings className="size-4 text-muted-foreground" /></div>}
        </Link>
        <ThemeToggle />
      </div>
    </div>
  );
}

function DesktopFab({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      aria-label="Add expense"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      className="hidden lg:grid fixed bottom-6 left-1/2 -translate-x-1/2 z-40 size-16 rounded-full gradient-primary text-primary-foreground place-items-center shadow-[var(--shadow-float)] animate-pulse-glow"
    >
      <Plus className="size-7" strokeWidth={2.5} />
    </motion.button>
  );
}

export function GroupSwitcher({ compact = false }: { compact?: boolean }) {
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
        <button
          className={
            compact
              ? "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border/70 bg-background/45 px-2 text-sm font-semibold text-foreground backdrop-blur hover:border-primary/40 hover:bg-primary/10 transition-colors sm:h-11 sm:px-3"
              : "w-full rounded-[28px] border border-border/80 bg-card/90 backdrop-blur-xl text-left shadow-[var(--shadow-card)] hover:border-primary/30 transition-colors p-4 sm:p-5"
          }
        >
          {compact ? (
            <>
              <div className="size-7 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0 sm:size-8 sm:rounded-xl">
                <Layers className="size-4" />
              </div>
              <span className="hidden sm:inline text-sm">Groups</span>
              <ChevronDown className="hidden size-4 text-muted-foreground shrink-0 sm:block" />
            </>
          ) : (
            <>
              <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Current Group</div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-base sm:text-lg truncate">{activeGroup?.name ?? "Select a group"}</div>
                  <div className="text-xs text-muted-foreground truncate">{groups.length} memberships · Switch group</div>
                </div>
                <div className="shrink-0 rounded-full border border-border/80 bg-background/40 px-3 py-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="hidden sm:inline">Switch</span>
                  <ChevronDown className="size-3.5" />
                </div>
              </div>
            </>
          )}
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
