import { motion } from "framer-motion";
import { CATEGORIES, type Category } from "@/lib/store";
import { cardVariants, SPRING } from "./MotionWrapper";

interface Props {
  onPick: (category: string) => void;
}

export function QuickActionsGrid({ onPick }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Quick add</h2>
        <span className="text-xs text-muted-foreground">Tap a category</span>
      </div>
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {CATEGORIES.map((c, i) => (
          <motion.button
            key={c.id}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ ...SPRING, delay: 0.1 + i * 0.04 }}
            whileTap={{ scale: 0.9 }}
            whileHover={{ y: -4 }}
            onClick={() => onPick(c.id)}
            aria-label={`Add ${c.label} expense`}
            className="group flex flex-col items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-2xl"
          >
            <div
              className="size-11 sm:size-13 rounded-2xl grid place-items-center text-xl transition-all duration-200 group-hover:scale-110 group-hover:-rotate-3 group-hover:shadow-[0_14px_30px_rgba(0,0,0,.14)]"
              style={{ background: `color-mix(in oklab, ${c.tint} 22%, transparent)` }}
            >
              {c.emoji}
            </div>
            <span className="text-[10px] text-muted-foreground transition-colors duration-200 group-hover:text-foreground font-medium">
              {c.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
