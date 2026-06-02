import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftRight, CalendarDays, Clock3, Pencil, X } from "lucide-react";
import { ApiExpense } from "@/lib/api/endpoints";
import { CATEGORIES } from "@/lib/store";
import { formatINR, formatSplit } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { EditExpenseDialog } from "./EditExpenseDialog";

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Small avatar circle — shows image if available, else initial */
function Avatar({ name, avatar, size = 8 }: { name: string; avatar?: string; size?: number }) {
  const cls = `rounded-full overflow-hidden grid place-items-center bg-white/20 shrink-0`;
  const style = { width: size * 4, height: size * 4 };
  return (
    <div className={cls} style={style}>
      {avatar
        ? <img src={avatar} alt={name} className="size-full object-cover" />
        : <span className="text-xs font-bold text-white/80">{name[0]?.toUpperCase()}</span>}
    </div>
  );
}

export function ExpenseDetailDialog({
  expense: initialExpense,
  open,
  onClose,
}: {
  expense: ApiExpense | null;
  open: boolean;
  onClose: () => void;
}) {
  // Keep a local copy so the dialog updates immediately after an edit
  const [expense, setExpense] = useState<ApiExpense | null>(initialExpense);
  const [editOpen, setEditOpen] = useState(false);
  const { user } = useAuth();

  // Sync when parent changes the expense (e.g. opening a different one)
  useEffect(() => { setExpense(initialExpense); }, [initialExpense]);

  const category = expense
    ? (CATEGORIES.find((item) => item.id === expense.category) ?? CATEGORIES[CATEGORIES.length - 1])
    : null;
  const participantCount = expense
    ? expense.sharedWith.length + (expense.guestParticipants?.length ?? 0)
    : 0;

  // Only the person who added (paid for) the expense can edit it
  const canEdit = !!expense && expense.paidBy._id === user?._id;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      <AnimatePresence>
        {open && expense && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.button
              aria-label="Close expense details"
              className="absolute inset-0 bg-black/55"
              onClick={onClose}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative z-10 w-full max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-t-[32px] border border-border bg-card shadow-2xl sm:max-w-lg sm:rounded-3xl"
            >
              {/* Sticky header */}
              <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-sm pt-3 pb-2 px-5 sm:px-6">
                <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted sm:hidden" />
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
                        Expense details
                      </div>
                      {/* "Edited" badge */}
                      {expense.isEdited && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20">
                          <Pencil className="size-2.5" /> Edited
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-base font-bold sm:text-lg leading-tight truncate">
                      {expense.title || category?.label}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Edit button — only for payer or admin */}
                    {canEdit && (
                      <button
                        onClick={() => setEditOpen(true)}
                        aria-label="Edit expense"
                        className="size-9 rounded-full bg-primary/10 text-primary grid place-items-center hover:bg-primary/20 transition-colors"
                      >
                        <Pencil className="size-4" />
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      aria-label="Close"
                      className="size-9 rounded-full bg-muted grid place-items-center hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 pb-6 pt-1 sm:px-6 sm:pb-8 space-y-4">

                {/* Hero gradient card */}
                <div className="rounded-3xl gradient-balance p-5 text-white shadow-[var(--shadow-card)] sm:p-6">
                  <div className="flex items-center gap-2 text-white/75 text-sm font-medium">
                    <span className="text-xl">{category?.emoji}</span>
                    <span>{category?.label}</span>
                  </div>

                  {/* Amount */}
                  <div className="mt-2 text-4xl font-extrabold tabular tracking-tight sm:text-5xl">
                    {formatINR(expense.amount)}
                  </div>

                  {/* Paid by — with avatar */}
                  <div className="mt-3 flex items-center gap-2.5">
                    <Avatar
                      name={expense.paidBy.name}
                      avatar={expense.paidBy.avatar}
                      size={7}
                    />
                    <div>
                      <div className="text-xs text-white/60 font-medium">Paid by</div>
                      <div className="text-sm text-white font-semibold leading-tight">
                        {expense.paidBy.name}
                      </div>
                    </div>
                  </div>

                  {/* Date / time */}
                  <div className="mt-3 flex items-center gap-3 text-xs text-white/55">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" />
                      {formatDate(expense.createdAt)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock3 className="size-3.5" />
                      {new Date(expense.createdAt).toLocaleTimeString("en-IN", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    {expense.isEdited && (
                      <span className="flex items-center gap-1 text-amber-300/80">
                        <Pencil className="size-3" />
                        edited {formatDate(expense.updatedAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Split summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-muted/60 p-4">
                    <div className="text-xs text-muted-foreground font-medium">Split amount</div>
                    <div className="mt-1.5 text-lg font-bold tabular">
                      {formatSplit(expense.splitAmount)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-muted/60 p-4">
                    <div className="text-xs text-muted-foreground font-medium">Participants</div>
                    <div className="mt-1.5 text-lg font-bold">{participantCount}</div>
                  </div>
                </div>

                {/* Split with */}
                <div className="rounded-2xl border border-border p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-sm font-bold mb-3">
                    <ArrowLeftRight className="size-4 text-primary" />
                    Split with
                  </div>
                  <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0">
                    {expense.sharedWith.map((person) => (
                      <div
                        key={person._id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2.5 hover:bg-primary/8 transition-colors"
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          <div className="size-7 rounded-full bg-muted overflow-hidden grid place-items-center shrink-0">
                            {person.avatar
                              ? <img src={person.avatar} alt={person.name} className="size-full object-cover" />
                              : <span className="text-xs font-bold text-muted-foreground">{person.name[0]?.toUpperCase()}</span>}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{person.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{person.email}</div>
                          </div>
                        </div>
                        <div className="text-sm font-semibold tabular shrink-0">
                          {formatINR(expense.splitAmount)}
                        </div>
                      </div>
                    ))}
                    {(expense.guestParticipants ?? []).map((guest) => (
                      <div
                        key={guest._id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-amber-500/8 border border-amber-500/15 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          <div className="size-7 rounded-full bg-amber-500/15 grid place-items-center shrink-0 text-sm">
                            👤
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{guest.name}</div>
                            <div className="text-[11px] text-amber-500/80">Guest</div>
                          </div>
                        </div>
                        <div className="text-sm font-semibold tabular shrink-0">
                          {formatINR(expense.splitAmount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="rounded-2xl border border-border p-4 sm:p-5">
                  <div className="text-sm font-bold mb-2">Description</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {expense.notes || "No additional description provided."}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit dialog — stacked on top */}
      <EditExpenseDialog
        expense={expense}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => setExpense(updated)}
      />
    </>
  );
}
