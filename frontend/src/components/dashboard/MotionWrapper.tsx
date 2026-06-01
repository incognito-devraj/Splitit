import { motion, type Variants } from "framer-motion";
import { type ReactNode } from "react";

// Shared spring used across all card entrances
export const SPRING = { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const };

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

/** Wraps any child in the standard card entrance animation. */
export function MotionCard({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ ...SPRING, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Stagger wrapper — children must use `variants` to participate. */
export function StaggerList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}
