import { ReactNode } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "./BottomNav";
import { AddExpenseSheet } from "./AddExpenseSheet";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="dark min-h-screen bg-background text-foreground gradient-mesh-bg">
      <main className="mx-auto max-w-md min-h-screen pb-32">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {children}
        </motion.div>
      </main>
      <BottomNav />
      <AddExpenseSheet />
    </div>
  );
}
