import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { cardVariants, SPRING } from "./MotionWrapper";
import { formatINR } from "@/lib/format";

interface Props {
  netBalance: number;
  toCollect: number;
  toPay: number;
  totalSpent: number;
  expenseCount: number;
  isLoading: boolean;
}

export function FinancialSummaryCard({
  netBalance,
  toCollect,
  toPay,
  totalSpent,
  expenseCount,
  isLoading,
}: Props) {
  // Smart decimal formatting for net balance
  const absNet = Math.abs(netBalance);
  const signed =
    netBalance > 0 ? `+${formatINR(absNet)}`
    : netBalance < 0 ? `-${formatINR(absNet)}`
    : "₹0";

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={SPRING}
      whileHover={{ y: -4, scale: 1.01 }}
      className="relative overflow-hidden rounded-3xl gradient-balance text-white shadow-[0_16px_40px_rgba(0,0,0,.12)] hover:shadow-[0_24px_60px_rgba(0,128,170,.28)] transition-shadow duration-300 cursor-default"
    >
      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />
      {/* Blobs */}
      <div className="absolute -top-16 -right-12 size-56 rounded-full bg-white/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-8 size-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      {/* Top highlight line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

      <div className="relative p-5 sm:p-6">
        {/* Label */}
        <p className="text-white/70 text-[11px] uppercase tracking-[0.2em] font-medium">
          Your net balance
        </p>

        {/* Net balance amount */}
        {isLoading ? (
          <div className="mt-2 h-14 w-36 bg-white/20 rounded-2xl animate-pulse" />
        ) : (
          <>
            <div className="mt-1 text-5xl sm:text-6xl font-extrabold tabular tracking-tight leading-none">
              {signed}
            </div>
            <p className="text-white/70 text-sm mt-1.5 font-medium">
              {netBalance >= 0 ? "You are owed" : "You owe in total"}
            </p>
          </>
        )}

        {/* To collect / To pay */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <motion.div
            whileHover={{ y: -2, scale: 1.03 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="group rounded-2xl bg-white/15 backdrop-blur-sm p-3.5 hover:bg-white/22 transition-colors duration-200 shadow-[0_8px_24px_rgba(0,0,0,.18)]"
          >
            <div className="flex items-center gap-1.5 text-white/70 text-xs font-medium">
              <ArrowDownLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:-translate-x-0.5" />
              To collect
            </div>
            <div className="mt-1.5 text-xl font-bold tabular">
              {formatINR(toCollect)}
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2, scale: 1.03 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="group rounded-2xl bg-white/15 backdrop-blur-sm p-3.5 hover:bg-white/22 transition-colors duration-200 shadow-[0_8px_24px_rgba(0,0,0,.18)]"
          >
            <div className="flex items-center gap-1.5 text-white/70 text-xs font-medium">
              <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              To pay
            </div>
            <div className="mt-1.5 text-xl font-bold tabular">
              {formatINR(toPay)}
            </div>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="mt-4 h-px bg-white/15" />

        {/* Total spent row */}
        <div className="mt-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/70 text-xs font-medium">
            <Receipt className="size-3.5" />
            <span>Total spent</span>
          </div>
          {isLoading ? (
            <div className="h-5 w-20 bg-white/20 rounded animate-pulse" />
          ) : (
            <div className="text-right">
              <span className="text-base font-bold tabular">
                {formatINR(totalSpent)}
              </span>
              <span className="text-white/55 text-xs ml-2">
                across {expenseCount} expense{expenseCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
