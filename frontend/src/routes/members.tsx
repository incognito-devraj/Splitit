import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { balanceApi, settlementApi, groupApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth";
import { Copy, Check } from "lucide-react";

export const Route = createFileRoute("/members")({
  head: () => ({ meta: [{ title: "Members · PG Split" }] }),
  component: Members,
});

// Generate a consistent color/emoji from user id
const EMOJIS = ["🦊","🐼","🦁","🐯","🐻","🦄","🐸","🦋","🐺","🦅"];
const COLORS = [
  "oklch(0.72 0.18 155)","oklch(0.68 0.20 245)","oklch(0.78 0.16 75)",
  "oklch(0.65 0.25 295)","oklch(0.72 0.18 35)","oklch(0.70 0.18 195)",
];
function avatarProps(id: string) {
  const n = id.charCodeAt(id.length - 1) % EMOJIS.length;
  return { emoji: EMOJIS[n], color: COLORS[n % COLORS.length] };
}

function Members() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [settling, setSettling] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: balances = [], isLoading } = useQuery({
    queryKey: ["balances"],
    queryFn: () => balanceApi.all().then((r) => r.data.data),
    enabled: !!user?.groupId,
    refetchInterval: 15_000,
  });

  const { data: group } = useQuery({
    queryKey: ["group"],
    queryFn: () => groupApi.current().then((r) => r.data.data),
    enabled: !!user?.groupId,
  });

  const settleMutation = useMutation({
    mutationFn: ({ toUserId, amt }: { toUserId: string; amt: number }) =>
      settlementApi.request(toUserId, amt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["balances"] });
      qc.invalidateQueries({ queryKey: ["settlements"] });
      setSettling(null);
      setAmount("");
    },
  });

  const copyCode = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AppShell>
      <div className="px-5 pt-6">
        <h1 className="text-3xl font-semibold tracking-tight">Members</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {balances.length} people in {group?.name ?? "your PG"}
        </p>
      </div>

      {/* Invite code */}
      {group?.inviteCode && (
        <div className="px-5 mt-4">
          <button
            onClick={copyCode}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-card border border-border"
          >
            <div>
              <div className="text-xs text-muted-foreground">Invite Code</div>
              <div className="font-mono font-bold tracking-widest text-lg">{group.inviteCode}</div>
            </div>
            {copied ? <Check className="size-4 text-green-400" /> : <Copy className="size-4 text-muted-foreground" />}
          </button>
        </div>
      )}

      {isLoading && (
        <div className="px-5 mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-3xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      )}

      <div className="px-5 mt-4 space-y-3 pb-4">
        {balances.map((b, i) => {
          const isMe = b.userId === user?._id;
          const positive = b.netBalance >= 0;
          const { emoji, color } = avatarProps(b.userId);

          return (
            <motion.div
              key={b.userId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-3xl bg-card border border-border"
            >
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-full grid place-items-center text-2xl shrink-0 overflow-hidden"
                  style={{ background: `color-mix(in oklab, ${color} 28%, transparent)` }}>
                  {b.avatar ? (
                    <img src={b.avatar} alt={b.name} className="size-full object-cover rounded-full" />
                  ) : emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{b.name}{isMe ? " (you)" : ""}</div>
                  <div className={`text-xs font-medium ${positive ? "text-green-400" : "text-red-400"}`}>
                    {Math.abs(b.netBalance) < 0.5 ? "All settled" : positive ? "should receive" : "owes the group"}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-semibold tabular ${Math.abs(b.netBalance) < 0.5 ? "text-muted-foreground" : positive ? "text-green-400" : "text-red-400"}`}>
                    {positive ? "+" : "−"}₹{Math.abs(b.netBalance).toFixed(0)}
                  </div>
                </div>
              </div>

              {/* Pay button — only show for others when they owe you or you owe them */}
              {!isMe && Math.abs(b.netBalance) >= 1 && (
                <div className="mt-3">
                  {settling === b.userId ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={`₹${Math.abs(b.netBalance).toFixed(0)}`}
                        className="flex-1 h-9 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary"
                      />
                      <button
                        onClick={() => settleMutation.mutate({ toUserId: b.userId, amt: Number(amount) || Math.abs(b.netBalance) })}
                        disabled={settleMutation.isPending}
                        className="px-4 h-9 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
                      >
                        {settleMutation.isPending ? "…" : "Send"}
                      </button>
                      <button onClick={() => setSettling(null)} className="px-3 h-9 rounded-xl bg-muted text-sm">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setSettling(b.userId); setAmount(Math.abs(b.netBalance).toFixed(0)); }}
                      className="w-full h-9 rounded-xl border border-primary/30 bg-primary/10 text-primary text-sm font-semibold"
                    >
                      💸 Settle up
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </AppShell>
  );
}
