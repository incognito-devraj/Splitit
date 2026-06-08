import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Delete, X, ChevronDown, Plus, UserX, Share2, Copy, CheckCheck } from "lucide-react";
import confetti from "canvas-confetti";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSheet } from "@/lib/sheet";
import { CATEGORIES, Category } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { expenseApi, groupApi, ApiUser } from "@/lib/api/endpoints";
import { QK } from "@/lib/queryKeys";

type Step = 0 | 1 | 2 | 3 | 4;

// ── Fixed dialog height — same for every step ─────────────────────────────────
// All steps sit inside this box; nothing scrolls.
const DIALOG_H = "min(560px, calc(100dvh - 3rem))";

export function AddExpenseSheet() {
  const { open, closeSheet, presetCategory } = useSheet();
  const { user } = useAuth();
  const qc = useQueryClient();
  const activeGroupId = user?.groupId ?? null;

  const [step, setStep] = useState<Step>(0);
  const [category, setCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [paidById, setPaidById] = useState<string>("");

  const { data: members = [] } = useQuery({
    queryKey: QK.members(activeGroupId),
    queryFn: () => groupApi.members().then((r) => r.data.data),
    enabled: !!activeGroupId,
  });

  const { data: knownGuests = [] } = useQuery({
    queryKey: ["expense-guests"],
    queryFn: () => expenseApi.guests().then((r) => r.data.data),
    enabled: !!activeGroupId,
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

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const createMutation = useMutation({
    mutationFn: (body: {
      category: string; amount: number; sharedWith: string[];
      guestNames: string[]; title: string; notes: string;
    }) => expenseApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["summary-category"] });
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
    if (!category || !amountNum || totalParticipants === 0 || !title.trim()) return;
    try {
      await createMutation.mutateAsync({
        category, amount: amountNum, sharedWith: selected,
        guestNames: validGuests, title: title.trim(), notes: title.trim(),
      });
      setStep(4);
      setTimeout(() => confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, scalar: 0.9 }), 200);
      // No auto-close — user closes after optionally sharing
    } catch { /* shown via mutation state */ }
  };

  const paidByMember = members.find((m) => m._id === (paidById || user?._id));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/55"
            onClick={closeSheet}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          />

          {/* Dialog — fixed width + height, never scrolls */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="relative z-10 w-full max-w-md rounded-3xl border border-border/70 bg-card overflow-hidden flex flex-col shadow-[0_32px_80px_rgba(0,0,0,0.4)]"
            style={{ height: DIALOG_H }}
          >
            {/* ── Header ── */}
            <div className="shrink-0 flex items-center justify-between px-5 pt-3 pb-2">
              <div className="absolute left-1/2 -translate-x-1/2 top-2 h-1 w-8 rounded-full bg-muted" />
              <button
                onClick={step === 0 || step === 4 ? closeSheet : back}
                className="size-9 grid place-items-center rounded-full bg-muted text-foreground hover:bg-muted/70 transition-colors"
              >
                {step === 0 || step === 4 ? <X className="size-4" /> : <ArrowLeft className="size-4" />}
              </button>
              <span className="text-sm font-medium text-muted-foreground">
                {step < 4 ? `Step ${step + 1} of 4` : "Done"}
              </span>
              <div className="size-9" />
            </div>

            {/* ── Progress ── */}
            {step < 4 && (
              <div className="shrink-0 px-5 pb-1">
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full gradient-primary"
                    initial={false}
                    animate={{ width: `${((step + 1) / 4) * 100}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 30 }}
                  />
                </div>
              </div>
            )}

            {/* ── Step content — fills remaining height, no overflow ── */}
            <div className="flex-1 relative overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                {step === 0 && (
                  <StepCategory key="s0" onPick={(c) => { setCategory(c); next(); }} />
                )}
                {step === 1 && (
                  <StepAmount
                    key="s1"
                    category={category!} amount={amount} title={title}
                    members={members} paidById={paidById || user?._id || ""}
                    onKey={press} onNext={next}
                    onTitleChange={setTitle} onPaidByChange={setPaidById}
                  />
                )}
                {step === 2 && (
                  <StepMembers
                    key="s2"
                    members={members} selected={selected} toggle={toggle}
                    guestNames={guestNames} knownGuests={knownGuests.map((g) => g.name)}
                    onAddGuest={addGuest} onUpdateGuest={updateGuest} onRemoveGuest={removeGuest}
                    onNext={next}
                  />
                )}
                {step === 3 && (
                  <StepPreview
                    key="s3"
                    amount={amountNum} perHead={perHead}
                    memberCount={selected.length} guestCount={validGuests.length}
                    category={category!} paidByName={paidByMember?.name ?? "You"}
                    onConfirm={submit} loading={createMutation.isPending}
                    error={createMutation.isError ? "Failed to save. Try again." : ""}
                  />
                )}
                {step === 4 && (
                  <StepSuccess
                    key="s4"
                    amount={amountNum}
                    title={title.trim()}
                    category={category!}
                    paidByName={paidByMember?.name ?? user?.name ?? "You"}
                    memberNames={members.filter((m) => selected.includes(m._id)).map((m) => m.name)}
                    guestNames={validGuests}
                    perHead={perHead}
                    onClose={closeSheet}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Step wrapper — fills parent, no scroll ────────────────────────────────────

function StepWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.18, ease: "easeInOut" }}
      className="absolute inset-0 flex flex-col px-5 py-3 overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

// ─── Step 0: Category ─────────────────────────────────────────────────────────

function StepCategory({ onPick }: { onPick: (c: Category) => void }) {
  return (
    <StepWrap>
      <h2 className="text-lg font-semibold tracking-tight shrink-0">What did you spend on?</h2>
      <p className="text-xs text-muted-foreground mt-0.5 shrink-0">Pick a category</p>
      {/* 5-col grid fills remaining space evenly — no scroll */}
      <div className="mt-3 flex-1 grid grid-cols-5 gap-2 content-start">
        {CATEGORIES.map((c, i) => (
          <motion.button
            key={c.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.015 }}
            whileTap={{ scale: 0.90 }}
            onClick={() => onPick(c.id)}
            className="group flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl bg-muted/50 border border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-150"
          >
            <span className="text-2xl leading-none">{c.emoji}</span>
            <span className="text-[9px] font-medium text-muted-foreground text-center leading-tight px-0.5 line-clamp-1">
              {c.label}
            </span>
          </motion.button>
        ))}
      </div>
    </StepWrap>
  );
}

// ─── Step 1: Amount + Description + Who Paid ──────────────────────────────────

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
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the invisible input on mount so keyboard works immediately
  useEffect(() => {
    const t = setTimeout(() => amountInputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  function handleAmountKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Only intercept digit/dot/backspace — let Tab still work
    if (e.key === "Tab") return;
    e.preventDefault();
    if (e.key === "Backspace" || e.key === "Delete") return onKey("back");
    if (e.key === ".") return onKey(".");
    if (e.key >= "0" && e.key <= "9") return onKey(e.key);
  }

  return (
    <StepWrap>
      {/* Category badge */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
        <span className="text-lg">{cat.emoji}</span><span className="font-medium">{cat.label}</span>
      </div>

      {/* Amount display — click to focus invisible input */}
      <div
        className="mt-2 flex items-baseline justify-center gap-1 cursor-text shrink-0"
        onClick={() => amountInputRef.current?.focus()}
      >
        <span className="text-xl font-medium text-muted-foreground">₹</span>
        <span className="text-4xl font-bold tabular tracking-tight">{display}</span>
        {/* Blinking cursor indicator — visible when input is focused */}
        <span className="sr-only">Amount field active. Type digits.</span>
      </div>

      {/* Hidden input — captures keyboard, invisible but positioned for real cursor */}
      <input
        ref={amountInputRef}
        type="text"
        inputMode="none"
        value=""
        onChange={() => {}}
        onKeyDown={handleAmountKeyDown}
        aria-label="Amount — type digits or use numpad below"
        className="absolute opacity-0 top-[4.5rem] left-1/2 w-1 h-1 pointer-events-none"
        tabIndex={0}
      />

      {/* Description */}
      <div className="mt-3 shrink-0">
        <label htmlFor="expense-desc" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
          Description <span className="text-primary normal-case font-normal tracking-normal">· required</span>
        </label>
        <input
          id="expense-desc"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g. Domino's pizza, Electricity bill…"
          autoComplete="off"
          className="w-full h-10 px-3 rounded-xl border-2 border-border bg-muted/40 text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:bg-card focus:shadow-[0_0_0_3px_oklch(0.68_0.17_155_/_0.12)] transition-all"
        />
      </div>

      {/* Who paid */}
      <div className="mt-2 shrink-0">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
          Who paid?
        </label>
        <div className="relative">
          <select
            value={paidById}
            onChange={(e) => onPaidByChange(e.target.value)}
            className="w-full h-9 pl-3 pr-9 rounded-xl bg-muted/40 border border-border text-sm font-medium appearance-none focus:outline-none focus:border-primary cursor-pointer"
          >
            {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Numpad — fills remaining space */}
      <div className="mt-2 flex-1 grid grid-cols-3 gap-1.5 content-evenly">
        {keys.map((k) => (
          <motion.button
            key={k}
            whileTap={{ scale: 0.85 }}
            onClick={() => { onKey(k); amountInputRef.current?.focus(); }}
            className="h-10 rounded-xl bg-muted/60 text-base font-semibold active:bg-muted grid place-items-center hover:bg-muted transition-colors select-none"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {k === "back" ? <Delete className="size-4" /> : k}
          </motion.button>
        ))}
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        disabled={!Number(amount) || !title.trim()}
        onClick={onNext}
        className="mt-2 shrink-0 w-full h-10 rounded-2xl gradient-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 shadow-[var(--shadow-glow)]"
      >
        Continue
      </motion.button>
    </StepWrap>
  );
}

// ─── Step 2: Split Among ───────────────────────────────────────────────────────

function StepMembers({
  members, selected, toggle, guestNames, knownGuests,
  onAddGuest, onUpdateGuest, onRemoveGuest, onNext,
}: {
  members: ApiUser[]; selected: string[]; toggle: (id: string) => void;
  guestNames: string[]; knownGuests: string[];
  onAddGuest: () => void; onUpdateGuest: (i: number, v: string) => void;
  onRemoveGuest: (i: number) => void; onNext: () => void;
}) {
  const validGuests = guestNames.filter((n) => n.trim().length > 0);
  const total = selected.length + validGuests.length;

  return (
    <StepWrap>
      <div className="flex items-center justify-between shrink-0 mb-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Split with</h2>
          <p className="text-xs text-muted-foreground">
            {selected.length} member{selected.length !== 1 ? "s" : ""}
            {validGuests.length > 0 && ` + ${validGuests.length} guest${validGuests.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={onAddGuest}
          className="flex items-center gap-1 text-xs text-primary font-semibold px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
        >
          <Plus className="size-3" /> Guest
        </button>
      </div>

      {/* Members list — flex fills remaining space */}
      <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
        {members.map((m) => {
          const active = selected.includes(m._id);
          return (
            <motion.button
              key={m._id}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggle(m._id)}
              className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-colors ${
                active ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border"
              }`}
            >
              <div className="size-9 rounded-full overflow-hidden bg-muted grid place-items-center text-base shrink-0">
                {m.avatar ? <img src={m.avatar} alt={m.name} className="size-full object-cover" /> : "👤"}
              </div>
              <div className="flex-1 text-left text-sm font-medium truncate">{m.name}</div>
              <div className={`size-5 rounded-full grid place-items-center border-2 shrink-0 transition-colors ${
                active ? "bg-primary border-primary text-primary-foreground" : "border-border"
              }`}>
                {active && <Check className="size-3" strokeWidth={3} />}
              </div>
            </motion.button>
          );
        })}

        {/* Guest inputs */}
        <AnimatePresence>
          {guestNames.map((name, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 pt-1">
                <div className="size-9 rounded-full bg-amber-500/15 grid place-items-center text-base shrink-0">👤</div>
                <input
                  type="text" value={name} onChange={(e) => onUpdateGuest(i, e.target.value)}
                  placeholder="Guest name" maxLength={100} list={`gs-${i}`}
                  className="flex-1 h-9 px-3 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary"
                  autoFocus={name === ""}
                />
                <datalist id={`gs-${i}`}>{knownGuests.map((g) => <option key={g} value={g} />)}</datalist>
                <button
                  onClick={() => onRemoveGuest(i)}
                  className="size-9 rounded-xl bg-red-500/10 text-red-400 grid place-items-center shrink-0"
                >
                  <UserX className="size-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {guestNames.length === 0 && members.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No members found</p>
        )}
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }} disabled={total === 0} onClick={onNext}
        className="mt-2 shrink-0 w-full h-11 rounded-2xl gradient-primary text-primary-foreground font-semibold text-sm disabled:opacity-40"
      >
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
      <h2 className="text-lg font-semibold tracking-tight shrink-0">Looks good?</h2>

      <div className="mt-3 flex-1 rounded-3xl gradient-balance p-5 text-white shadow-[var(--shadow-card)] flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <span className="text-xl">{cat.emoji}</span> {cat.label}
          </div>
          <div className="mt-3 text-5xl font-bold tabular">₹{amount.toLocaleString("en-IN")}</div>
          <div className="mt-1 text-white/70 text-sm">Paid by {paidByName}</div>
          {guestCount > 0 && (
            <div className="mt-0.5 text-white/60 text-xs">
              {memberCount} member{memberCount !== 1 ? "s" : ""} + {guestCount} guest{guestCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 text-sm my-3">
            <div className="flex-1 h-px bg-white/30" />
            <span>÷ {total} people</span>
            <div className="flex-1 h-px bg-white/30" />
          </div>
          <div className="text-center">
            <div className="text-white/80 text-sm">Each pays</div>
            <div className="text-4xl font-bold tabular mt-1">₹{perHead.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-400 text-center shrink-0">{error}</p>}

      <motion.button
        whileTap={{ scale: 0.97 }} onClick={onConfirm} disabled={loading}
        className="mt-3 shrink-0 w-full h-11 rounded-2xl gradient-primary text-primary-foreground font-semibold shadow-[var(--shadow-glow)] flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading
          ? <><div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
          : "Save expense"}
      </motion.button>
    </StepWrap>
  );
}

// ─── Step 4: Success ──────────────────────────────────────────────────────────

function buildShareText({
  title, amount, category, paidByName, memberNames, guestNames, perHead,
}: {
  title: string; amount: number; category: Category;
  paidByName: string; memberNames: string[]; guestNames: string[]; perHead: number;
}) {
  const cat = CATEGORIES.find((c) => c.id === category)!;
  const allParticipants = [...memberNames, ...guestNames];
  const total = allParticipants.length;
  const lines: string[] = [];

  lines.push(`${cat.emoji}  ${title}`);
  lines.push(`─────────────────────`);
  lines.push(`💰  Total    : ₹${amount.toLocaleString("en-IN")}`);
  lines.push(`👤  Paid by  : ${paidByName}`);
  lines.push(`📂  Category : ${cat.label}`);
  lines.push(``);
  lines.push(`👥  Split among ${total} ${total === 1 ? "person" : "people"}:`);
  allParticipants.forEach((name, i) => {
    lines.push(`    ${i + 1}. ${name}`);
  });
  lines.push(``);
  lines.push(`💸  Each pays: ₹${perHead.toFixed(2)}`);
  lines.push(`─────────────────────`);
  lines.push(`Shared via Splitit 🧾`);

  return lines.join("\n");
}

function StepSuccess({
  amount, title, category, paidByName, memberNames, guestNames, perHead, onClose,
}: {
  amount: number; title: string; category: Category;
  paidByName: string; memberNames: string[]; guestNames: string[];
  perHead: number; onClose: () => void;
}) {
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const cat = CATEGORIES.find((c) => c.id === category)!;
  const shareText = buildShareText({ title, amount, category, paidByName, memberNames, guestNames, perHead });

  // Show the tick for 900ms, then slide up the share card
  useEffect(() => {
    const t = setTimeout(() => setShowShare(true), 900);
    return () => clearTimeout(t);
  }, []);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Expense: ${title}`, text: shareText });
      } catch {
        // user cancelled — fine
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="absolute inset-0 flex flex-col items-center justify-start overflow-hidden"
    >
      {/* ── Tick section ── */}
      <motion.div
        animate={showShare ? { y: -16, scale: 0.82 } : { y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="flex flex-col items-center gap-3 pt-10"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className="size-24 rounded-full gradient-success grid place-items-center shadow-[var(--shadow-glow)]"
        >
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.1 }}
            className="size-14 rounded-full bg-white grid place-items-center shadow-[0_8px_24px_rgba(0,0,0,0.16)]"
          >
            <motion.svg viewBox="0 0 24 24" className="size-9 text-emerald-500">
              <motion.path
                d="M5 12 L10 17 L19 7" fill="none" stroke="currentColor"
                strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 0.35, delay: 0.22 }}
              />
            </motion.svg>
          </motion.div>
        </motion.div>
        <div className="text-center">
          <motion.h3
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="text-2xl font-semibold"
          >
            Expense added!
          </motion.h3>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="text-muted-foreground mt-1 text-sm"
          >
            ₹{amount.toLocaleString("en-IN")} split with your group
          </motion.p>
        </div>
      </motion.div>

      {/* ── Share card — slides up after tick ── */}
      <AnimatePresence>
        {showShare && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="absolute bottom-0 left-0 right-0 px-5 pb-5"
          >
            <div className="rounded-3xl border border-border/70 bg-card shadow-[0_-8px_40px_rgba(0,0,0,0.12)] overflow-hidden">
              {/* Preview of what'll be shared */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{cat.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{title}</p>
                    <p className="text-xs text-muted-foreground">{cat.label} · Paid by {paidByName}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-base font-bold tabular">₹{amount.toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-muted-foreground">₹{perHead.toFixed(2)} / person</p>
                  </div>
                </div>

                {/* Participant chips */}
                <div className="flex flex-wrap gap-1.5">
                  {[...memberNames, ...guestNames].map((name, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-border/60 mx-4" />

              {/* Action buttons */}
              <div className="px-4 py-3 flex items-center gap-2.5">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleShare}
                  className="flex-1 h-10 rounded-2xl gradient-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-[var(--shadow-glow)]"
                >
                  {copied
                    ? <><CheckCheck className="size-4" /> Copied!</>
                    : <><Share2 className="size-4" /> {navigator.share ? "Share" : "Copy"}</>
                  }
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={onClose}
                  className="h-10 px-4 rounded-2xl bg-muted text-muted-foreground font-semibold text-sm hover:bg-muted/70 transition-colors"
                >
                  Done
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
