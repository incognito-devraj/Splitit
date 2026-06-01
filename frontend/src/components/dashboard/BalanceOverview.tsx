import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { type ApiBalance } from "@/lib/api/endpoints";
import { cardVariants, SPRING } from "./MotionWrapper";

interface Props {
  balances: ApiBalance[];
  currentUserId?: string;
}

export function BalanceOverview({ balances, currentUserId }: Props) {
  if (balances.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Balances</h2>
        <Link to="/members" className="text-xs text-primary font-medium hover:underline">
          Manage
        </Link>
      </div>
      <div className="space-y-2">
        {balances.slice(0, 5).map((b, i) => {
          const isMe = b.userId === currentUserId;
          const positive = b.netBalance >= 0;
          const settled = Math.abs(b.netBalance) < 0.5;
          return (
            <motion.div
              key={b.userId}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ ...SPRING, delay: i * 0.06 }}
              whileHover={{ x: 3, scale: 1.01 }}
              className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:shadow-[0_8px_24px_rgba(0,0,0,.08)] cursor-default"
            >
              <div className="size-8 rounded-full bg-muted overflow-hidden grid place-items-center text-sm shrink-0 ring-2 ring-border">
                {b.avatar
                  ? <img src={b.avatar} alt={b.name} className="size-full object-cover" />
                  : <span className="text-xs font-bold text-muted-foreground">{b.name[0]?.toUpperCase()}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {b.name}{isMe ? " (you)" : ""}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  paid ₹{b.totalPaid.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-sm font-bold tabular ${
                  settled ? "text-muted-foreground" : positive ? "text-emerald-400" : "text-red-400"
                }`}>
                  {settled ? "Settled" : `${positive ? "+" : "−"}₹${Math.abs(b.netBalance).toFixed(0)}`}
                </span>
                {!settled && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {positive ? "to receive" : "owes"}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
