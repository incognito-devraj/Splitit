import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cardVariants, SPRING } from "./MotionWrapper";

export interface KPIStat {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  trend?: number; // positive = up, negative = down, 0/undefined = neutral
  icon: LucideIcon;
  tint: string; // oklch color
}

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);
  const start = useRef<number | null>(null);
  const from = useRef(0);

  useEffect(() => {
    from.current = display;
    start.current = null;
    const duration = 700;

    const step = (ts: number) => {
      if (!start.current) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from.current + (value - from.current) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };

    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span className="tabular">
      {prefix}{display.toLocaleString("en-IN")}{suffix}
    </span>
  );
}

function TrendBadge({ trend }: { trend?: number }) {
  if (trend === undefined || trend === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
        <Minus className="size-2.5" /> —
      </span>
    );
  }
  const up = trend > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
      up ? "text-emerald-400 bg-emerald-500/12" : "text-red-400 bg-red-500/12"
    }`}>
      {up ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
      {Math.abs(trend).toFixed(1)}%
    </span>
  );
}

export function KPIStats({ stats }: { stats: KPIStat[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ ...SPRING, delay: i * 0.07 }}
            whileHover={{ y: -3, scale: 1.02 }}
            className="group relative overflow-hidden rounded-2xl bg-card border border-border p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,.08)] transition-shadow duration-200 cursor-default"
          >
            {/* Tinted background blob */}
            <div
              className="absolute -top-4 -right-4 size-20 rounded-full opacity-15 blur-xl transition-opacity duration-300 group-hover:opacity-25"
              style={{ background: stat.tint }}
            />

            <div className="relative flex items-start justify-between gap-2">
              <div
                className="size-9 rounded-xl grid place-items-center shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3"
                style={{ background: `color-mix(in oklab, ${stat.tint} 18%, transparent)` }}
              >
                <Icon className="size-4" style={{ color: stat.tint }} />
              </div>
              <TrendBadge trend={stat.trend} />
            </div>

            <div className="relative mt-3">
              <div className="text-xl font-bold tracking-tight">
                <AnimatedNumber value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground font-medium">{stat.label}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
