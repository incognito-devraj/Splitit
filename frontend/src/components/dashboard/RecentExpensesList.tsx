import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { type ApiExpense } from "@/lib/api/endpoints";
import { CATEGORIES } from "@/lib/store";
import { cardVariants, SPRING } from "./MotionWrapper";
import { formatINR, formatSplit } from "@/lib/format";

function formatDay(ts: string) {
  const d = new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

interface Props {
  expenses: ApiExpense[];
  isLoading: boolean;
  onAddFirst: () => void;
  onSelect: (e: ApiExpense) => void;
}

export function RecentExpensesList({ expenses, isLoading, onAddFirst, onSelect }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm sm:text-base font-semibold">Recent Expenses</h2>
        <Link to="/expenses" className="text-xs text-primary font-medium hover:underline">
          See all
        </Link>
      </div>

      {/* Skeletons */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-card border border-border shimmer" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && expenses.length === 0 && (
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={SPRING}
          className="flex flex-col items-center justify-center py-10 rounded-3xl bg-card border border-border gap-3"
        >
          <span className="text-4xl">🧾</span>
          <p className="text-sm text-muted-foreground">No expenses yet</p>
          <button
            onClick={onAddFirst}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold"
          >
            <Plus className="size-3.5" /> Add first expense
          </button>
        </motion.div>
      )}

      {/* List */}
      <div className="space-y-2">
        {expenses.map((e, i) => {
          const cat = CATEGORIES.find((c) => c.id === e.category) ?? CATEGORIES[CATEGORIES.length - 1];
          return (
            <motion.button
              key={e._id}
              type="button"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ ...SPRING, delay: i * 0.05 }}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(e)}
              className="w-full text-left flex items-center gap-3 p-3 rounded-2xl bg-card border border-border transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-[0_16px_40px_rgba(0,0,0,.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
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
                  {e.paidBy.name} · {formatDay(e.createdAt)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold tabular text-sm">{formatINR(e.amount)}</div>
                <div className="text-[10px] text-muted-foreground">{formatSplit(e.splitAmount)}</div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
