import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Loader2, UserX, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiExpense, expenseApi, groupApi } from "@/lib/api/endpoints";
import { CATEGORIES, type Category } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { QK } from "@/lib/queryKeys";
import { formatINR } from "@/lib/format";

interface Props {
  expense: ApiExpense | null;
  open: boolean;
  onClose: () => void;
  /** Called with the updated expense after a successful save */
  onSaved: (updated: ApiExpense) => void;
}

export function EditExpenseDialog({ expense, open, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const activeGroupId = user?.groupId ?? null;

  // ── Form state ─────────────────────────────────────────────────────────────
  const [title, setTitle]         = useState("");
  const [category, setCategory]   = useState<Category>("other");
  const [amount, setAmount]       = useState("");
  const [notes, setNotes]         = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [guestNames, setGuestNames]   = useState<string[]>([]);

  // Seed form when expense changes
  useEffect(() => {
    if (!expense || !open) return;
    setTitle(expense.title ?? "");
    setCategory((expense.category as Category) ?? "other");
    setAmount(String(expense.amount));
    setNotes(expense.notes ?? "");
    setSelectedIds(expense.sharedWith.map((p) => p._id));
    setGuestNames(expense.guestParticipants?.map((g) => g.name) ?? []);
  }, [expense, open]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: members = [] } = useQuery({
    queryKey: QK.members(activeGroupId),
    queryFn: () => groupApi.members().then((r) => r.data.data),
    enabled: !!activeGroupId && open,
  });

  const { data: knownGuests = [] } = useQuery({
    queryKey: ["expense-guests"],
    queryFn: () => expenseApi.guests().then((r) => r.data.data),
    enabled: !!activeGroupId && open,
  });

  // ── Mutation ───────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: () =>
      expenseApi.update(expense!._id, {
        title:      title.trim(),
        category,
        amount:     parseFloat(amount),
        sharedWith: selectedIds,
        guestNames: guestNames.filter((n) => n.trim()),
        notes:      notes.trim(),
      }),
    onSuccess: (res) => {
      const updated = res.data.data;
      qc.invalidateQueries({ queryKey: QK.expenses(activeGroupId) });
      qc.invalidateQueries({ queryKey: QK.balances(activeGroupId) });
      qc.invalidateQueries({ queryKey: QK.summary(activeGroupId) });
      qc.invalidateQueries({ queryKey: QK.summaryCategory(activeGroupId) });
      onSaved(updated);
      onClose();
    },
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const toggleMember = (id: string) =>
    setSelectedIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const addGuest    = () => setGuestNames((g) => [...g, ""]);
  const updateGuest = (i: number, v: string) =>
    setGuestNames((g) => g.map((n, idx) => idx === i ? v : n));
  const removeGuest = (i: number) =>
    setGuestNames((g) => g.filter((_, idx) => idx !== i));

  const amountNum       = parseFloat(amount) || 0;
  const validGuests     = guestNames.filter((n) => n.trim());
  const totalParts      = selectedIds.length + validGuests.length;
  const perHead         = totalParts > 0 ? amountNum / totalParts : 0;
  const canSave         = amountNum > 0 && totalParts > 0 && !mutation.isPending;

  const cat = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[CATEGORIES.length - 1];

  if (!expense) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 48, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-t-[32px] border border-border bg-card shadow-2xl sm:max-w-lg sm:rounded-3xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm pt-3 pb-3 px-5 sm:px-6 border-b border-border">
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted sm:hidden" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
                    Edit expense
                  </div>
                  <div className="mt-0.5 text-base font-bold sm:text-lg">
                    {expense.title || cat.label}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="size-9 rounded-full bg-muted grid place-items-center hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Form body */}
            <div className="px-5 pb-6 pt-4 sm:px-6 sm:pb-8 space-y-5">

              {/* Category picker */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Category
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-2xl border transition-all ${
                        category === c.id
                          ? "border-primary bg-primary/10 shadow-[0_0_0_2px_var(--color-primary)]"
                          : "border-border bg-muted/40 hover:bg-muted"
                      }`}
                    >
                      <span className="text-xl">{c.emoji}</span>
                      <span className="text-[9px] font-medium text-muted-foreground">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Description
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Grocery run, WiFi bill…"
                  maxLength={200}
                  className="w-full h-11 px-4 rounded-2xl bg-muted border border-border text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    min="0.01"
                    step="0.01"
                    className="w-full h-11 pl-8 pr-4 rounded-2xl bg-muted border border-border text-sm font-semibold tabular focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                {amountNum > 0 && totalParts > 0 && (
                  <p className="text-xs text-muted-foreground mt-1.5 text-right">
                    {formatINR(perHead)}/head across {totalParts} participant{totalParts !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {/* Members */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Split with members
                </label>
                <div className="space-y-1.5">
                  {members.map((m) => {
                    const active = selectedIds.includes(m._id);
                    return (
                      <button
                        key={m._id}
                        type="button"
                        onClick={() => toggleMember(m._id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all ${
                          active ? "bg-primary/10 border-primary/30" : "bg-muted/40 border-border hover:bg-muted"
                        }`}
                      >
                        <div className="size-8 rounded-full bg-muted overflow-hidden grid place-items-center shrink-0">
                          {m.avatar
                            ? <img src={m.avatar} alt={m.name} className="size-full object-cover" />
                            : <span className="text-xs font-bold text-muted-foreground">{m.name[0]?.toUpperCase()}</span>}
                        </div>
                        <span className="flex-1 text-left text-sm font-medium">{m.name}</span>
                        <div className={`size-5 rounded-full grid place-items-center border-2 transition-colors shrink-0 ${
                          active ? "bg-primary border-primary text-primary-foreground" : "border-border"
                        }`}>
                          {active && <Check className="size-3" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Guests */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Guests
                  </label>
                  <button
                    type="button"
                    onClick={addGuest}
                    className="flex items-center gap-1 text-xs text-primary font-semibold px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="size-3" /> Add Guest
                  </button>
                </div>
                <AnimatePresence>
                  {guestNames.map((name, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-2 overflow-hidden"
                    >
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-full bg-amber-500/15 grid place-items-center text-sm shrink-0">👤</div>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => updateGuest(i, e.target.value)}
                          placeholder="Guest name"
                          maxLength={100}
                          list={`guest-list-${i}`}
                          autoFocus={name === ""}
                          className="flex-1 h-9 px-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:border-primary"
                        />
                        <datalist id={`guest-list-${i}`}>
                          {knownGuests.map((g) => <option key={g._id} value={g.name} />)}
                        </datalist>
                        <button
                          type="button"
                          onClick={() => removeGuest(i)}
                          className="size-9 rounded-xl bg-red-500/10 text-red-400 grid place-items-center hover:bg-red-500/20 transition-colors shrink-0"
                        >
                          <UserX className="size-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {guestNames.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2.5 border border-dashed border-border rounded-xl">
                    No guests — tap "Add Guest" to include someone without an account
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional details…"
                  maxLength={500}
                  rows={2}
                  className="w-full px-4 py-3 rounded-2xl bg-muted border border-border text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              {/* Error */}
              {mutation.isError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 text-center">
                  {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message
                    ?? "Failed to save. Please try again."}
                </div>
              )}

              {/* Save button */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                disabled={!canSave}
                onClick={() => mutation.mutate()}
                className="w-full h-13 rounded-2xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-40 shadow-[var(--shadow-glow)] transition-opacity"
              >
                {mutation.isPending
                  ? <><Loader2 className="size-4 animate-spin" /> Saving…</>
                  : <><Check className="size-4" /> Save changes</>}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
