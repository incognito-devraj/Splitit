import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftRight, CalendarDays, Clock3, X } from "lucide-react";
import { ApiExpense } from "@/lib/api/endpoints";
import { CATEGORIES } from "@/lib/store";

function formatDay(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ExpenseDetailDialog({
  expense,
  open,
  onClose,
}: {
  expense: ApiExpense | null;
  open: boolean;
  onClose: () => void;
}) {
  const category = expense ? (CATEGORIES.find((item) => item.id === expense.category) ?? CATEGORIES[CATEGORIES.length - 1]) : null;
  const participantCount = expense ? expense.sharedWith.length + expense.guestParticipants.length : 0;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && expense && (
        <motion.div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.button
            aria-label="Close expense details"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-h-[calc(100dvh-1rem)] overflow-hidden rounded-t-[28px] border border-border bg-card shadow-2xl sm:max-w-2xl sm:rounded-3xl"
          >
            <div className="flex items-center justify-between px-4 pt-3 sm:px-5">
              <div className="mx-auto absolute left-1/2 top-3 h-1.5 w-10 -translate-x-1/2 rounded-full bg-muted" />
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Expense details</div>
                <div className="mt-0.5 text-base font-semibold sm:text-lg">{expense.title || category?.label}</div>
              </div>
              <button onClick={onClose} className="size-9 rounded-full bg-muted grid place-items-center transition-colors hover:bg-primary/10 hover:text-primary" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>

            <div className="px-4 pb-4 pt-3 space-y-3 sm:px-5 sm:pb-5">
              <div className="rounded-3xl gradient-balance p-4 text-white shadow-[var(--shadow-card)] sm:p-5">
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <span className="text-xl">{category?.emoji}</span>
                  <span>{category?.label}</span>
                </div>
                <div className="mt-1.5 text-3xl font-semibold tabular sm:text-4xl">₹{expense.amount.toLocaleString("en-IN")}</div>
                <div className="mt-1.5 text-sm text-white/80">Paid by {expense.paidBy.name}</div>
                <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
                  <CalendarDays className="size-3.5" />
                  {formatDay(expense.createdAt)}
                  <Clock3 className="ml-2 size-3.5" />
                  {new Date(expense.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-muted/60 p-3 sm:p-4">
                  <div className="text-xs text-muted-foreground">Split amount</div>
                  <div className="mt-1 text-lg font-semibold">₹{expense.splitAmount.toFixed(0)}/head</div>
                </div>
                <div className="rounded-2xl bg-muted/60 p-3 sm:p-4">
                  <div className="text-xs text-muted-foreground">Participants</div>
                  <div className="mt-1 text-lg font-semibold">{participantCount}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-border p-3 sm:p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ArrowLeftRight className="size-4 text-primary" />
                  Split with
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {expense.sharedWith.map((person) => (
                    <div key={person._id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2 transition-colors hover:bg-primary/10">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{person.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{person.email}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">₹{expense.splitAmount.toFixed(0)}</div>
                    </div>
                  ))}
                  {expense.guestParticipants.map((guest) => (
                    <div key={guest._id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2 transition-colors hover:bg-primary/10">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{guest.name}</div>
                        <div className="text-xs text-muted-foreground">Guest</div>
                      </div>
                      <div className="text-sm text-muted-foreground">₹{expense.splitAmount.toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border p-3 sm:p-4">
                <div className="text-sm font-semibold">Description</div>
                <p className="mt-1.5 text-sm text-muted-foreground leading-6">
                  {expense.notes || "No additional description provided."}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
