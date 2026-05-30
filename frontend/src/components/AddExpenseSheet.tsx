import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Delete, X, ChevronDown, Plus, UserX } from "lucide-react";
import confetti from "canvas-confetti";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSheet } from "@/lib/sheet";
import { CATEGORIES, Category } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { expenseApi, groupApi, ApiUser } from "@/lib/api/endpoints";
import { QK } from "@/lib/queryKeys";

type Step = 0 | 1 | 2 | 3 | 4;

export function AddExpenseSheet() {
  const { open, closeSheet, presetCategory } = useSheet();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>(0);
  const [category, setCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [paidById, setPaidById] = useState<string>("");

  // Load real group members
  const { data: members = [] } = useQuery({
    queryKey: QK.members,
    queryFn: () => groupApi.members().then((r) => r.data.data),
    enabled: !!user?.groupId,
  });

  // Load previously used guests for autocomplete
  const { data: knownGuests = [] } = useQuery({
    queryKey: ["expense-guests"],
    queryFn: () => expenseApi.guests().then((r) => r.data.data),
    enabled: !!user?.groupId,
  });

  useEffect(() => {
    if (open) {
      setStep(presetCategory ? 1 : 0);
      setCategory((presetCategory as Category) ?? null);
      setAmount("");
      setTitle("");
      setSelected(members.map((m) => m._id));
      setGuestNames([]);
      setPaidById(user?._id ?? "");
    }
  }, [open, presetCategory, members, user]);

  const createMutation = useMutation({
    mutationFn: (body: {
      category: string;
      amount: number;
      sharedWith: string[];
      guestNames: string[];
      title?: string;
    }) => expenseApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.expenses });
      qc.invalidateQueries({ queryKey: QK.balances });
      qc.invalidateQueries({ queryKey: QK.summary });
      qc.invalidateQueries({ queryKey: QK.summaryCategory });
      qc.invalidateQueries({ queryKey: ["expense-guests"] });
    },
  });

  const validGuests = guestNames.filter((n) => n.trim().length > 0);
  const amountNum = Number(amount || 0);
  const totalParticipants = selected.length + validGuests.length;
  const perHead = totalParticipants ? amountNum / totalParticipants : 0;

  const next = () => setStep((s) => Math.min(4, s + 1) as Step);
  const back = () => setStep((s) => Math.max(0, s - 1) as Step);

  const press = (k: string) => {
    if (k === "back") return setAmount((a) => a.slice(0, -1));
    if (k === ".") return setAmount((a) => (a.includes(".") ? a : (a || "0") + "."));
    if (amount.length >= 7) return;
    setAmount((a) => (a === "0" ? k : a + k));
  };

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const addGuest = () => setGuestNames((g) => [...g, ""]);
  const updateGuest = (i: number, v: string) =>
    setGuestNames((g) => g.map((n, idx) => (idx === i ? v : n)));
  const removeGuest = (i: number) =>
    setGuestNames((g) => g.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!category || !amountNum || totalParticipants === 0) return;
    try {
      await createMutation.mutateAsync({
        category,
        amount: amountNum,
        sharedWith: selected,
        guestNames: validGuests,
        title: title || undefined,
      });
      setStep(4);
      setTimeout(() => {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, scalar: 0.9 });
      }, 200);
      setTimeout(() => closeSheet(), 1800);
    } catch {
      // error shown via mutation state
    }
  };

  const paidByMember = members.find((m) => m._id === (paidById || user?._id));

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeSheet} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="absolute inset-x-0 bottom-0 top-6 rounded-t-[28px] bg-card overflow-hidden flex flex-col"
          >
            {/* Handle + Header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2">
              <div className="mx-auto absolute left-1/2 -translate-x-1/2 top-2 h-1.5 w-10 rounded-full bg-muted" />
              <button onClick={step === 0 || step === 4 ? closeSheet : back}
                className="size-9 grid place-items-center rounded-full bg-muted text-foreground" aria-label="Back">
                {step === 0 || step === 4 ? <X className="size-4" /> : <ArrowLeft className="size-4" />}
              </button>
              <div className="text-sm font-medium text-muted-foreground">
                {step < 4 ? `Step ${step + 1} of 4` : "Done"}
              </div>
              <div className="size-9" />
            </div>

            {/* Progress bar */}
            {step < 4 && (
              <div className="px-5">
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div className="h-full gradient-primary" initial={false}
                    animate={{ width: `${((step + 1) / 4) * 100}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 30 }} />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <StepCategory key="s0" onPick={(c) => { setCategory(c); next(); }} />
                )}
                {step === 1 && (
                  <StepAmount key="s1" category={category!} amount={amount} title={title}
                    members={members} paidById={paidById || user?._id || ""}
                    onKey={press} onNext={next}
                    onTitleChange={setTitle} onPaidByChange={setPaidById} />
                )}
                {step === 2 && (
                  <StepMembers
                    key="s2"
                    members={members}
                    selected={selected}
                    toggle={toggle}
                    guestNames={guestNames}
                    knownGuests={knownGuests.map((g) => g.name)}
                    onAddGuest={addGuest}
                    onUpdateGuest={updateGuest}
                    onRemoveGuest={removeGuest}
                    onNext={next}
                  />
                )}
                {step === 3 && (
                  <StepPreview key="s3" amount={amountNum} perHead={perHead}
                    memberCount={selected.length} guestCount={validGuests.length}
                    category={category!} paidByName={paidByMember?.name ?? "You"}
                    onConfirm={submit} loading={createMutation.isPending}
                    error={createMutation.isError ? "Failed to save. Try again." : ""} />
                )}
                {step === 4 && <StepSuccess key="s4" amount={amountNum} />}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Step Wrapper ─────────────────────────────────────────────────────────────

function StepWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }} className="px-5 py-5">
      {children}
    </motion.div>
  );
}

// ─── Step 0: Category ─────────────────────────────────────────────────────────

function StepCategory({ onPick }: { onPick: (c: Category) => void }) {
  return (
    <StepWrap>
      <h2 className="text-2xl font-semibold tracking-tight">What did you spend on?</h2>
      <p className="text-sm text-muted-foreground mt-1">Pick a category to start</p>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {CATEGORIES.map((c, i) => (
          <motion.button key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }} whileTap={{ scale: 0.94 }} onClick={() => onPick(c.id)}
            className="aspect-square rounded-2xl bg-surface-elevated border border-border flex flex-col items-center justify-center gap-1.5 active:bg-muted">
            <span className="text-3xl">{c.emoji}</span>
            <span className="text-xs font-medium">{c.label}</span>
          </motion.button>
        ))}
      </div>
    </StepWrap>
  );
}

// ─── Step 1: Amount + Title + Who Paid ───────────────────────────────────────

function StepAmount({
  category, amount, title, members, paidById,
  onKey, onNext, onTitleChange, onPaidByChange,
}: {
  category: Category; amount: string; title: string;
  members: ApiUser[]; paidById: string;
  onKey: (k: string) => void; onNext: () => void;
  onTitleChange: (v: string) => void; onPaidByChange: (id: string) => void;
}) {
  const cat = CATEGORIES.find((c) => c.id === category)!;
  const display = amount || "0";
  const keys = ["1","2","3","4","5","6","7","8","9",".","0","back"];
  const paidByMember = members.find((m) => m._id === paidById);

  return (
    <StepWrap>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-xl">{cat.emoji}</span><span>{cat.label}</span>
      </div>

      <div className="mt-5 flex items-baseline justify-center gap-1">
        <span className="text-3xl font-medium text-muted-foreground">₹</span>
        <motion.span key={display} initial={{ scale: 0.96, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }}
          className="text-6xl font-semibold tabular tracking-tight">{display}</motion.span>
      </div>

      <input type="text" value={title} onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Add a description (optional)"
        className="mt-4 w-full h-10 px-4 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:border-primary text-center" />

      <div className="mt-3">
        <label className="text-xs text-muted-foreground font-medium block mb-1.5">Who paid?</label>
        <div className="relative">
          <select
            value={paidById}
            onChange={(e) => onPaidByChange(e.target.value)}
            className="w-full h-11 pl-4 pr-10 rounded-xl bg-card border border-border text-sm font-medium appearance-none focus:outline-none focus:border-primary cursor-pointer"
          >
            {members.map((m) => (
              <option key={m._id} value={m._id}>{m.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        </div>
        {paidByMember && (
          <p className="text-xs text-muted-foreground mt-1 text-center">
            {paidByMember.name} will be recorded as the payer
          </p>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <motion.button key={k} whileTap={{ scale: 0.9 }} onClick={() => onKey(k)}
            className="h-14 rounded-2xl bg-surface-elevated text-2xl font-medium active:bg-muted grid place-items-center">
            {k === "back" ? <Delete className="size-5" /> : k}
          </motion.button>
        ))}
      </div>

      <motion.button whileTap={{ scale: 0.97 }} disabled={!Number(amount)} onClick={onNext}
        className="mt-5 w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold text-base disabled:opacity-40 shadow-[var(--shadow-glow)]">
        Continue
      </motion.button>
    </StepWrap>
  );
}

// ─── Step 2: Split Among (members + guests) ───────────────────────────────────

function StepMembers({
  members, selected, toggle,
  guestNames, knownGuests,
  onAddGuest, onUpdateGuest, onRemoveGuest,
  onNext,
}: {
  members: ApiUser[];
  selected: string[];
  toggle: (id: string) => void;
  guestNames: string[];
  knownGuests: string[];
  onAddGuest: () => void;
  onUpdateGuest: (i: number, v: string) => void;
  onRemoveGuest: (i: number) => void;
  onNext: () => void;
}) {
  const validGuests = guestNames.filter((n) => n.trim().length > 0);
  const total = selected.length + validGuests.length;

  return (
    <StepWrap>
      <h2 className="text-2xl font-semibold tracking-tight">Split with</h2>
      <p className="text-sm text-muted-foreground mt-1">
        {selected.length} member{selected.length !== 1 ? "s" : ""}
        {validGuests.length > 0 && ` + ${validGuests.length} guest${validGuests.length !== 1 ? "s" : ""}`}
        {" "}selected
      </p>

      {/* Members */}
      <div className="mt-5 space-y-2">
        {members.map((m) => {
          const active = selected.includes(m._id);
          return (
            <motion.button key={m._id} whileTap={{ scale: 0.98 }} onClick={() => toggle(m._id)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                active ? "bg-primary/10 border-primary/30" : "bg-surface-elevated border-border"
              }`}>
              <div className="size-10 rounded-full overflow-hidden bg-muted grid place-items-center text-lg">
                {m.avatar ? <img src={m.avatar} alt={m.name} className="size-full object-cover" /> : "👤"}
              </div>
              <div className="flex-1 text-left"><div className="font-medium text-sm">{m.name}</div></div>
              <div className={`size-6 rounded-full grid place-items-center border-2 transition-colors ${
                active ? "bg-primary border-primary text-primary-foreground" : "border-border"
              }`}>
                {active && <Check className="size-3.5" strokeWidth={3} />}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Guests section */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold">Guests</p>
            <p className="text-xs text-muted-foreground">People without accounts</p>
          </div>
          <button
            onClick={onAddGuest}
            className="flex items-center gap-1 text-xs text-primary font-semibold px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <Plus className="size-3.5" /> Add Guest
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
                <div className="size-10 rounded-full bg-amber-500/15 grid place-items-center text-lg shrink-0">
                  👤
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => onUpdateGuest(i, e.target.value)}
                  placeholder="Guest name"
                  maxLength={100}
                  list={`guest-suggestions-${i}`}
                  className="flex-1 h-10 px-3 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary"
                  autoFocus={name === ""}
                />
                <datalist id={`guest-suggestions-${i}`}>
                  {knownGuests.map((g) => <option key={g} value={g} />)}
                </datalist>
                <button
                  onClick={() => onRemoveGuest(i)}
                  className="size-10 rounded-xl bg-red-500/10 text-red-400 grid place-items-center shrink-0 hover:bg-red-500/20 transition-colors"
                >
                  <UserX className="size-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {guestNames.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border rounded-xl">
            No guests added. Tap "Add Guest" to include someone without an account.
          </p>
        )}
      </div>

      <motion.button whileTap={{ scale: 0.97 }} disabled={total === 0} onClick={onNext}
        className="mt-6 w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold disabled:opacity-40">
        Continue · {total} participant{total !== 1 ? "s" : ""}
      </motion.button>
    </StepWrap>
  );
}

// ─── Step 3: Preview ──────────────────────────────────────────────────────────

function StepPreview({
  amount, perHead, memberCount, guestCount, category, paidByName, onConfirm, loading, error,
}: {
  amount: number; perHead: number; memberCount: number; guestCount: number;
  category: Category; paidByName: string;
  onConfirm: () => void; loading: boolean; error: string;
}) {
  const cat = CATEGORIES.find((c) => c.id === category)!;
  const total = memberCount + guestCount;
  return (
    <StepWrap>
      <h2 className="text-2xl font-semibold tracking-tight">Looks good?</h2>
      <div className="mt-6 rounded-3xl gradient-balance p-6 text-white shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 text-white/80 text-sm">
          <span className="text-xl">{cat.emoji}</span> {cat.label}
        </div>
        <div className="mt-3 text-5xl font-semibold tabular">₹{amount.toLocaleString("en-IN")}</div>
        <div className="mt-2 text-white/70 text-sm">Paid by {paidByName}</div>
        {guestCount > 0 && (
          <div className="mt-1 text-white/60 text-xs">
            {memberCount} member{memberCount !== 1 ? "s" : ""} + {guestCount} guest{guestCount !== 1 ? "s" : ""}
          </div>
        )}
        <div className="mt-4 flex items-center gap-2 text-sm">
          <div className="flex-1 h-px bg-white/30" />
          <span>÷ {total} people</span>
          <div className="flex-1 h-px bg-white/30" />
        </div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="mt-4 text-center">
          <div className="text-white/80 text-sm">Each pays</div>
          <div className="text-4xl font-semibold tabular mt-1">₹{perHead.toFixed(2)}</div>
        </motion.div>
      </div>

      {error && <p className="mt-3 text-sm text-red-400 text-center">{error}</p>}

      <motion.button whileTap={{ scale: 0.97 }} onClick={onConfirm} disabled={loading}
        className="mt-5 w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold shadow-[var(--shadow-glow)] flex items-center justify-center gap-2 disabled:opacity-60">
        {loading
          ? <><div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
          : "Save expense"}
      </motion.button>
    </StepWrap>
  );
}

// ─── Step 4: Success ──────────────────────────────────────────────────────────

function StepSuccess({ amount }: { amount: number }) {
  return (
    <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="h-full flex flex-col items-center justify-center px-5 py-10">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="size-24 rounded-full gradient-success grid place-items-center shadow-[var(--shadow-glow)]">
        <motion.svg viewBox="0 0 24 24" className="size-12 text-white">
          <motion.path d="M5 12 L10 17 L19 7" fill="none" stroke="currentColor" strokeWidth={3}
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.15 }} />
        </motion.svg>
      </motion.div>
      <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="mt-6 text-2xl font-semibold">Expense added!</motion.h3>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="text-muted-foreground mt-1">
        ₹{amount.toLocaleString("en-IN")} split with your PG
      </motion.p>
    </motion.div>
  );
}
