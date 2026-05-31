// In-memory demo store for Splitit (frontend-only)
import { create } from "zustand";

export type Category =
  | "food" | "grocery" | "electricity" | "wifi"
  | "rent" | "gas" | "maid" | "water" | "other";

export const CATEGORIES: { id: Category; label: string; emoji: string; tint: string }[] = [
  { id: "food",        label: "Food",        emoji: "🍕", tint: "oklch(0.72 0.18 35)" },
  { id: "grocery",     label: "Grocery",     emoji: "🛒", tint: "oklch(0.72 0.18 155)" },
  { id: "electricity", label: "Electricity", emoji: "💡", tint: "oklch(0.78 0.16 75)" },
  { id: "wifi",        label: "WiFi",        emoji: "📶", tint: "oklch(0.68 0.20 245)" },
  { id: "rent",        label: "Rent",        emoji: "🏠", tint: "oklch(0.65 0.25 295)" },
  { id: "gas",         label: "Gas",         emoji: "⛽", tint: "oklch(0.65 0.24 25)" },
  { id: "maid",        label: "Maid",        emoji: "🧹", tint: "oklch(0.70 0.18 195)" },
  { id: "water",       label: "Water",       emoji: "🚿", tint: "oklch(0.70 0.18 220)" },
  { id: "other",       label: "Other",       emoji: "✨", tint: "oklch(0.68 0.12 260)" },
];

export type Member = { id: string; name: string; emoji: string; color: string };

export type Expense = {
  id: string;
  category: Category;
  title?: string;
  amount: number;
  paidBy: string;
  splitWith: string[]; // includes paidBy
  date: number;
};

type State = {
  members: Member[];
  me: string;
  expenses: Expense[];
  addExpense: (e: Omit<Expense, "id" | "date">) => void;
};

const seedMembers: Member[] = [
  { id: "m1", name: "You",    emoji: "🦊", color: "oklch(0.72 0.18 155)" },
  { id: "m2", name: "Raj",    emoji: "🐼", color: "oklch(0.68 0.20 245)" },
  { id: "m3", name: "Aman",   emoji: "🦁", color: "oklch(0.78 0.16 75)" },
  { id: "m4", name: "Devraj", emoji: "🐯", color: "oklch(0.65 0.25 295)" },
];

const seedExpenses: Expense[] = [
  { id: "e1", category: "food",    title: "Dinner — Biryani",  amount: 600, paidBy: "m1", splitWith: ["m1","m2","m3","m4"], date: Date.now() - 1000 * 60 * 60 * 3 },
  { id: "e2", category: "wifi",    title: "WiFi recharge",      amount: 999, paidBy: "m2", splitWith: ["m1","m2","m3","m4"], date: Date.now() - 1000 * 60 * 60 * 26 },
  { id: "e3", category: "grocery", title: "Weekly grocery run", amount: 1240, paidBy: "m3", splitWith: ["m1","m2","m3"],     date: Date.now() - 1000 * 60 * 60 * 50 },
  { id: "e4", category: "maid",    title: "Maid",               amount: 800, paidBy: "m1", splitWith: ["m1","m2","m3","m4"], date: Date.now() - 1000 * 60 * 60 * 72 },
];

export const useStore = create<State>((set) => ({
  members: seedMembers,
  me: "m1",
  expenses: seedExpenses,
  addExpense: (e) =>
    set((s) => ({
      expenses: [
        { ...e, id: "e" + Math.random().toString(36).slice(2, 8), date: Date.now() },
        ...s.expenses,
      ],
    })),
}));

export function computeBalances(expenses: Expense[], members: Member[]) {
  const map = new Map<string, number>();
  members.forEach((m) => map.set(m.id, 0));
  for (const e of expenses) {
    const share = e.amount / e.splitWith.length;
    for (const mid of e.splitWith) {
      map.set(mid, (map.get(mid) ?? 0) - share);
    }
    map.set(e.paidBy, (map.get(e.paidBy) ?? 0) + e.amount);
  }
  return map; // positive => should receive, negative => owes
}
