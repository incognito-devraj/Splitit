import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "@tanstack/react-router";
import { Home, Receipt, Users, BarChart3, Settings, Plus, type LucideIcon } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { AddExpenseSheet } from "./AddExpenseSheet";
import { useSheet } from "@/lib/sheet";

type NavItem = { to: string; label: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { to: "/",         label: "Home",     icon: Home },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/members",  label: "Members",  icon: Users },
  { to: "/reports",  label: "Reports",  icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

function SidebarNav() {
  const { pathname } = useLocation();
  const openSheet = useSheet((s) => s.openSheet);

  return (
    <aside className="hidden lg:flex flex-col w-60 xl:w-64 shrink-0 h-screen sticky top-0 border-r border-border bg-card/50 backdrop-blur-sm">
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

      {/* Add Expense button */}
      <div className="px-4 py-4">
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => openSheet()}
          className="w-full h-11 rounded-2xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-[var(--shadow-glow)]">
          <Plus className="size-4" strokeWidth={2.5} /> Add Expense
        </motion.button>
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
  return (
    <div className="dark min-h-screen bg-background text-foreground gradient-mesh-bg">
      <div className="flex min-h-screen">
        {/* Sidebar — desktop only */}
        <SidebarNav />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 w-full max-w-3xl mx-auto pb-28 lg:pb-8">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
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
