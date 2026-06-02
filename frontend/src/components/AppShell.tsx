import { ReactNode, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, Receipt, BarChart3, Settings, Plus, Layers, ChevronDown, Crown, Loader2, type LucideIcon } from "lucide-react";
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
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

// Desktop navigation rail with the app logo and route links.
function SidebarNav() {
  const { pathname } = useLocation();

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-60 shrink-0 h-screen sticky top-0 border-r border-border bg-card/40 backdrop-blur-xl">
      <div className="px-6 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <img src="/favicons/android-chrome-192x192.png" alt="Splitit logo" className="size-10 rounded-2xl shadow" />
          <div>
            <div className="font-bold text-lg tracking-tight">Splitit</div>
            <div className="text-xs text-muted-foreground">Expense Splitter</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 pt-2 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-2xl font-medium text-sm transition-all duration-200 hover:translate-x-1 ${
                active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)]"
              }`}
            >
              <Icon className="size-5 shrink-0 transition-transform duration-200 group-hover:scale-110" strokeWidth={active ? 2.4 : 2} />
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

// Mobile-only top bar with brand, theme toggle, and profile entry.
function MobileHeader() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="sm:hidden sticky top-0 z-30 px-4 pt-3">
      <div className="relative">
        <div
          className={`absolute inset-0 flex items-center justify-between gap-3 rounded-full border border-border/60 px-3 py-2 shadow-[var(--shadow-card)] backdrop-blur-2xl bg-background/55 transition-all duration-300 ${
            scrolled ? "opacity-100 translate-y-0" : "pointer-events-none -translate-y-3 opacity-0"
          }`}
        >
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <img src="/favicons/android-chrome-192x192.png" alt="Splitit logo" className="size-9 rounded-2xl shadow shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-none truncate">Splitit</div>
              <div className="text-[11px] text-muted-foreground truncate">Expense Splitter</div>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 shrink-0">
            <ThemeToggle className="size-9" />
            <Link to="/settings" className="size-9 rounded-full overflow-hidden">
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} className="size-full object-cover" />
                : <div className="size-full grid place-items-center"><Settings className="size-4 text-muted-foreground" /></div>}
            </Link>
          </div>
        </div>
        <div className={`flex items-center justify-between gap-3 transition-all duration-300 ${scrolled ? "opacity-0" : "opacity-100"}`}>
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <img src="/favicons/android-chrome-192x192.png" alt="Splitit logo" className="size-9 rounded-2xl shadow shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-none truncate">Splitit</div>
              <div className="text-[11px] text-muted-foreground truncate">Expense Splitter</div>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 shrink-0">
            <ThemeToggle className="size-9" />
            <Link to="/settings" className="size-9 rounded-full overflow-hidden">
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} className="size-full object-cover" />
                : <div className="size-full grid place-items-center"><Settings className="size-4 text-muted-foreground" /></div>}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Page shell that wires together nav, header, FAB, and sheets.
export function AppShell({ children }: { children: ReactNode }) {
  const openSheet = useSheet((s) => s.openSheet);
  return (
    <div className="min-h-screen bg-background text-foreground theme-app-bg">
      <div className="flex min-h-screen">
        <SidebarNav />

        <div className="flex-1 flex flex-col min-w-0">
          <MobileHeader />
          <main className="flex-1 w-full pb-28 lg:pb-8">
            <div className="page-enter relative w-full px-4 sm:px-6 pt-10 pb-4">
              <DesktopTopBar />
              {children}
            </div>
          </main>
        </div>
      </div>

      <BottomNav />
      <DesktopFab onClick={() => openSheet()} />
      <AddExpenseSheet />
    </div>
  );
}

// Desktop utility area; keeps the top-right controls together.
function DesktopTopBar() {
  const { user } = useAuth();
  useQuery({
    queryKey: QK.group(user?.groupId ?? null),
    queryFn: () => groupApi.current().then((response) => response.data.data),
    enabled: !!user?.groupId,
  });

  return (
    <div className="hidden sm:flex absolute right-4 top-0 z-20 items-center justify-end gap-2 sm:right-6">
      <div className="flex items-center gap-2 shrink-0 rounded-full bg-background/55 backdrop-blur-xl border border-border/60 px-2 py-1 shadow-[var(--shadow-card)]">
        <ThemeToggle className="size-9" />
        <Link to="/settings" className="size-9 rounded-full overflow-hidden">
          {user?.avatar
            ? <img src={user.avatar} alt={user.name} className="size-full object-cover" />
            : <div className="size-full grid place-items-center"><Settings className="size-4 text-muted-foreground" /></div>}
        </Link>
      </div>
    </div>
  );
}

// Floating action button for creating a new expense.
function DesktopFab({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      aria-label="Add expense"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      whileHover={{ y: -4, scale: 1.04 }}
      className="hidden lg:grid fixed bottom-6 left-1/2 -translate-x-1/2 z-40 size-16 rounded-full gradient-primary text-primary-foreground place-items-center shadow-[var(--shadow-float)] animate-pulse-glow"
    >
      <Plus className="size-7" strokeWidth={2.5} />
    </motion.button>
  );
}

// Dropdown used to switch between groups.
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
      await queryClient.invalidateQueries({ queryKey: ["summary-category"] });
      await queryClient.invalidateQueries({ queryKey: ["settlements"] });
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
              ? "inline-flex h-10 items-center justify-center gap-1 rounded-full px-1 text-sm font-semibold text-foreground transition-colors sm:h-11"
              : "w-full rounded-[28px] border border-border/80 bg-card/90 backdrop-blur-xl text-left shadow-[var(--shadow-card)] hover:border-primary/30 transition-colors p-4 sm:p-5"
          }
        >
          {compact ? (
            <>
              <div className="size-8 text-primary grid place-items-center shrink-0">
                <Layers className="size-4" />
              </div>
              <ChevronDown className="size-4 text-muted-foreground shrink-0" />
            </>
          ) : (
            <>
              <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Current Group</div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-base sm:text-lg truncate">{activeGroup?.name ?? "Select a group"}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{groups.length} groups</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span>Switch</span>
                  </div>
                </div>
                <div className="shrink-0 rounded-full border border-border/80 bg-background/40 px-3 py-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
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
            onClick={() => group._id !== activeGroupId && switchMutation.mutate(group._id)}
            className="flex items-center justify-between gap-3 cursor-pointer"
          >
            <span className="truncate">{group.name}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              {typeof group.adminId === "object"
                ? group.adminId._id === user._id && <Crown className="size-3 text-amber-400" />
                : group.adminId === user._id && <Crown className="size-3 text-amber-400" />}
              {group._id === activeGroupId && <span className="text-xs text-primary font-semibold">Active</span>}
              {switchMutation.isPending && group._id !== activeGroupId && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer text-primary font-medium">
          <Link to="/groups" className="flex items-center gap-2">
            <Plus className="size-4" /> Create or join a group
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
