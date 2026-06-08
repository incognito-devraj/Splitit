import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { cardVariants, SPRING } from "./MotionWrapper";
import { formatINR } from "@/lib/format";

// ── Count-up hook ─────────────────────────────────────────────────────────────
function useCountUp(target: number, durationMs = 900, startDelay = 300) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    if (timer.current) clearTimeout(timer.current);
    setValue(0);

    timer.current = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / durationMs, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(target * eased);
        if (progress < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    }, startDelay);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [target, durationMs, startDelay]);

  return value;
}

// ── Formatted count-up that mirrors formatINR ─────────────────────────────────
function CountUpINR({
  target,
  className,
  prefix = "",
  durationMs = 900,
  startDelay = 300,
}: {
  target: number;
  className?: string;
  prefix?: string;
  durationMs?: number;
  startDelay?: number;
}) {
  const value = useCountUp(target, durationMs, startDelay);
  const formatted = `₹${Math.round(value).toLocaleString("en-IN")}`;
  return <span className={className}>{prefix}{formatted}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  netBalance: number;
  toCollect: number;
  toPay: number;
  totalSpent: number;
  expenseCount: number;
  myTotalSpent: number;
  myExpenseCount: number;
  isLoading: boolean;
}

export function FinancialSummaryCard({
  netBalance, toCollect, toPay, totalSpent, expenseCount, myTotalSpent, myExpenseCount, isLoading,
}: Props) {
  const absNet = Math.abs(netBalance);
  const prefix = netBalance > 0 ? "+" : netBalance < 0 ? "−" : "";

  // Trigger animations only when card enters viewport
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
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
      {/* Top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

      <div className="relative p-5 sm:p-6">
        {/* Label */}
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="text-white/70 text-[11px] uppercase tracking-[0.2em] font-medium"
        >
          Your net balance
        </motion.p>

        {/* Net balance — count-up */}
        {isLoading ? (
          <div className="mt-2 h-14 w-36 bg-white/20 rounded-2xl animate-pulse" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mt-1 text-5xl sm:text-6xl font-extrabold tabular tracking-tight leading-none">
              {inView ? (
                <CountUpINR
                  target={absNet}
                  prefix={prefix}
                  durationMs={900}
                  startDelay={200}
                />
              ) : (
                <span>{prefix}₹0</span>
              )}
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.4, delay: 0.55 }}
              className="text-white/70 text-sm mt-1.5 font-medium"
            >
              {netBalance >= 0 ? "You are owed" : "You owe in total"}
            </motion.p>
          </motion.div>
        )}

        {/* To collect / To pay — staggered fade-in after count-up */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            {
              label: "To collect",
              value: toCollect,
              Icon: ArrowDownLeft,
              delay: 0.75,
              hoverX: "-translate-y-0.5 -translate-x-0.5",
            },
            {
              label: "To pay",
              value: toPay,
              Icon: ArrowUpRight,
              delay: 0.88,
              hoverX: "-translate-y-0.5 translate-x-0.5",
            },
          ].map(({ label, value, Icon, delay, hoverX }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={inView && !isLoading ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -2, scale: 1.03 }}
              className="group rounded-2xl bg-white/15 backdrop-blur-sm p-3.5 hover:bg-white/22 transition-colors duration-200 shadow-[0_8px_24px_rgba(0,0,0,.18)]"
            >
              <div className="flex items-center gap-1.5 text-white/70 text-xs font-medium">
                <Icon className={`size-3.5 transition-transform duration-200 group-hover:${hoverX}`} />
                {label}
              </div>
              <div className="mt-1.5 text-xl font-bold tabular">
                {inView && !isLoading ? (
                  <CountUpINR
                    target={value}
                    durationMs={700}
                    startDelay={Math.round(delay * 1000)}
                  />
                ) : (
                  <span>₹0</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={inView ? { opacity: 1, scaleX: 1 } : {}}
          transition={{ duration: 0.5, delay: 1.0, ease: "easeOut" }}
          style={{ originX: 0 }}
          className="mt-4 h-px bg-white/15"
        />

        {/* Total spent row */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={inView && !isLoading ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 1.05 }}
          className="mt-3.5 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 text-white/70 text-xs font-medium shrink-0">
            <Receipt className="size-3.5" />
            <span>Total spent</span>
          </div>
          {isLoading ? (
            <div className="h-5 w-full bg-white/20 rounded animate-pulse" />
          ) : (
            <div className="flex items-center gap-3 flex-wrap justify-end">
              {/* My spending */}
              <div className="flex flex-col items-end">
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold tabular">
                    <CountUpINR target={myTotalSpent} durationMs={800} startDelay={1050} />
                  </span>
                  <span className="text-white/55 text-[10px]">
                    by me ({myExpenseCount})
                  </span>
                </div>
              </div>
              {/* Divider */}
              <div className="h-7 w-px bg-white/20 shrink-0" />
              {/* Group total */}
              <div className="flex flex-col items-end">
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold tabular">
                    <CountUpINR target={totalSpent} durationMs={800} startDelay={1050} />
                  </span>
                  <span className="text-white/55 text-[10px]">
                    group ({expenseCount})
                  </span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
