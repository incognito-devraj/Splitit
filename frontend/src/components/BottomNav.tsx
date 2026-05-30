import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Home, Receipt, Users, BarChart3, Plus, type LucideIcon } from "lucide-react";
import { useSheet } from "@/lib/sheet";

type Tab = { to: string; label: string; icon: LucideIcon };

const leftTabs: Tab[] = [
  { to: "/",         label: "Home",     icon: Home },
  { to: "/expenses", label: "Expenses", icon: Receipt },
];

const rightTabs: Tab[] = [
  { to: "/members",  label: "Members",  icon: Users },
  { to: "/reports",  label: "Reports",  icon: BarChart3 },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const openSheet = useSheet((s) => s.openSheet);

  const renderTab = (t: Tab) => {
    const active = pathname === t.to;
    const Icon = t.icon;
    return (
      <li key={t.to} className="flex-1">
        <Link
          to={t.to}
          className="relative flex flex-col items-center justify-center gap-0.5 py-2 rounded-2xl"
        >
          {active && (
            <motion.span
              layoutId="nav-pill"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="absolute inset-1 rounded-2xl bg-primary/12"
            />
          )}
          <Icon
            className={`size-5 relative ${active ? "text-primary" : "text-muted-foreground"}`}
            strokeWidth={active ? 2.4 : 2}
          />
          <span className={`text-[10px] relative font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
            {t.label}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md px-3 pb-3">
        <div className="glass rounded-3xl shadow-[var(--shadow-card)] px-2 py-2 relative">
          <ul className="flex items-center justify-between">
            {leftTabs.map(renderTab)}
            {/* Center FAB */}
            <li className="flex-1 flex justify-center">
              <motion.button
                aria-label="Add expense"
                onClick={() => openSheet()}
                whileTap={{ scale: 0.92 }}
                className="relative -top-5 size-14 rounded-full gradient-primary text-primary-foreground grid place-items-center shadow-[var(--shadow-float)] animate-pulse-glow"
              >
                <Plus className="size-6" strokeWidth={2.5} />
              </motion.button>
            </li>
            {rightTabs.map(renderTab)}
          </ul>
        </div>
      </div>
    </nav>
  );
}
