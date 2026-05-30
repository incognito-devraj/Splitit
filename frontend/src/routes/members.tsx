import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Copy, Check, UserMinus, X, UserCheck, UserX, Clock, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { balanceApi, settlementApi, groupApi, joinRequestApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth";
import { QK } from "@/lib/queryKeys";

export const Route = createFileRoute("/members")({
  head: () => ({ meta: [{ title: "Members · PG Split" }] }),
  component: Members,
});

const EMOJIS = ["🦊","🐼","🦁","🐯","🐻","🦄","🐸","🦋","🐺","🦅"];
const COLORS = ["oklch(0.72 0.18 155)","oklch(0.68 0.20 245)","oklch(0.78 0.16 75)","oklch(0.65 0.25 295)","oklch(0.72 0.18 35)","oklch(0.70 0.18 195)"];
function avatarProps(id: string) {
  const n = id.charCodeAt(id.length - 1) % EMOJIS.length;
  return { emoji: EMOJIS[n], color: COLORS[n % COLORS.length] };
}

function Members() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [settling, setSettling] = useState<string | null>(null);
  const [settleAmt, setSettleAmt] = useState("");
  const [copied, setCopied] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"members" | "requests">("members");

  const isAdmin = user?.role === "admin";

  const { data: balances = [], isLoading } = useQuery({
    queryKey: QK.balances,
    queryFn: () => balanceApi.all().then((r) => r.data.data),
    enabled: !!user?.groupId,
    refetchInterval: 15_000,
  });

  const { data: group } = useQuery({
    queryKey: QK.group,
    queryFn: () => groupApi.current().then((r) => r.data.data),
    enabled: !!user?.groupId,
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["join-requests-pending"],
    queryFn: () => joinRequestApi.pending().then((r) => r.data.data),
    enabled: !!user?.groupId && isAdmin,
    refetchInterval: 30_000,
  });

  const settleMutation = useMutation({
    mutationFn: ({ toUserId, amt }: { toUserId: string; amt: number }) =>
      settlementApi.request(toUserId, amt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.balances });
      qc.invalidateQueries({ queryKey: QK.settlements });
      qc.invalidateQueries({ queryKey: QK.summary });
      setSettling(null); setSettleAmt("");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => groupApi.removeMember(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.group });
      qc.invalidateQueries({ queryKey: QK.members });
      qc.invalidateQueries({ queryKey: QK.balances });
      setRemovingId(null);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => joinRequestApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["join-requests-pending"] });
      qc.invalidateQueries({ queryKey: QK.group });
      qc.invalidateQueries({ queryKey: QK.members });
      qc.invalidateQueries({ queryKey: QK.balances });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => joinRequestApi.reject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["join-requests-pending"] }),
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
      {/* Header */}
      <div className="px-4 sm:px-6 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Members</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {balances.length} people · {group?.name ?? "your PG"}
            </p>
          </div>
          {/* Invite code pill */}
          {group?.inviteCode && (
            <button onClick={copyCode}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border shrink-0">
              <span className="font-mono font-bold tracking-widest text-sm">{group.inviteCode}</span>
              {copied ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5 text-muted-foreground" />}
            </button>
          )}
        </div>
      </div>

      {/* Tab bar — only show for admin */}
      {isAdmin && (
        <div className="px-4 sm:px-6 mt-4">
          <div className="flex rounded-2xl bg-card border border-border p-1">
            <button onClick={() => setTab("members")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "members" ? "gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>
              <Users className="size-4" /> Members
            </button>
            <button onClick={() => setTab("requests")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all relative ${tab === "requests" ? "gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>
              <Clock className="size-4" /> Requests
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 size-5 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── MEMBERS TAB ─────────────────────────────────────────────── */}
        {tab === "members" && (
          <motion.div key="members-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {isLoading && (
              <div className="px-4 sm:px-6 mt-4 space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-24 rounded-3xl bg-card border border-border animate-pulse" />)}
              </div>
            )}

            {!isLoading && balances.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-4 gap-4">
                <span className="text-5xl">👥</span>
                <div className="text-center">
                  <p className="font-semibold">No members yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Share the invite code to add your PG mates</p>
                </div>
                {group?.inviteCode && (
                  <button onClick={copyCode}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold">
                    <Copy className="size-4" /> Copy Invite Code
                  </button>
                )}
              </div>
            )}

            {/* Desktop grid / Mobile list */}
            <div className="px-4 sm:px-6 mt-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {balances.map((b, i) => {
                const isMe = b.userId === user?._id;
                const positive = b.netBalance >= 0;
                const settled = Math.abs(b.netBalance) < 0.5;
                const { emoji, color } = avatarProps(b.userId);

                return (
                  <motion.div key={b.userId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-3xl bg-card border border-border overflow-hidden">
                    <div className="p-4 flex items-center gap-3">
                      <div className="size-12 sm:size-14 rounded-full grid place-items-center text-xl shrink-0 overflow-hidden"
                        style={{ background: `color-mix(in oklab, ${color} 28%, transparent)` }}>
                        {b.avatar ? <img src={b.avatar} alt={b.name} className="size-full object-cover rounded-full" /> : emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{b.name}</span>
                          {isMe && <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium shrink-0">you</span>}
                        </div>
                        <div className={`text-xs font-medium mt-0.5 ${settled ? "text-muted-foreground" : positive ? "text-green-400" : "text-red-400"}`}>
                          {settled ? "✅ Settled" : positive ? "Gets back" : "Owes"}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-lg font-semibold tabular ${settled ? "text-muted-foreground" : positive ? "text-green-400" : "text-red-400"}`}>
                          {settled ? "₹0" : `${positive ? "+" : "−"}₹${Math.abs(b.netBalance).toFixed(0)}`}
                        </div>
                        {isAdmin && !isMe && (
                          <button onClick={() => setRemovingId(b.userId)}
                            className="mt-0.5 text-[10px] text-muted-foreground hover:text-red-400 flex items-center gap-0.5 ml-auto">
                            <UserMinus className="size-3" /> Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Settle up */}
                    {!isMe && !settled && (
                      <div className="px-4 pb-4">
                        <AnimatePresence mode="wait">
                          {settling === b.userId ? (
                            <motion.div key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex gap-2">
                              <input type="number" value={settleAmt} onChange={(e) => setSettleAmt(e.target.value)}
                                placeholder={`₹${Math.abs(b.netBalance).toFixed(0)}`} autoFocus
                                className="flex-1 h-9 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary" />
                              <button onClick={() => settleMutation.mutate({ toUserId: b.userId, amt: Number(settleAmt) || Math.abs(b.netBalance) })}
                                disabled={settleMutation.isPending}
                                className="px-4 h-9 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                                {settleMutation.isPending ? "…" : "Send"}
                              </button>
                              <button onClick={() => { setSettling(null); setSettleAmt(""); }} className="size-9 rounded-xl bg-muted grid place-items-center">
                                <X className="size-4" />
                              </button>
                            </motion.div>
                          ) : (
                            <motion.button key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileTap={{ scale: 0.97 }}
                              onClick={() => { setSettling(b.userId); setSettleAmt(Math.abs(b.netBalance).toFixed(0)); }}
                              className="w-full h-9 rounded-xl border border-primary/30 bg-primary/10 text-primary text-sm font-semibold">
                              💸 Settle · ₹{Math.abs(b.netBalance).toFixed(0)}
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── JOIN REQUESTS TAB (admin only) ───────────────────────────── */}
        {tab === "requests" && isAdmin && (
          <motion.div key="requests-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="px-4 sm:px-6 mt-4 pb-4 space-y-3">
            {pendingRequests.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <UserCheck className="size-12 opacity-30" />
                <p className="text-sm">No pending join requests</p>
              </div>
            )}
            {pendingRequests.map((req, i) => (
              <motion.div key={req._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-3xl bg-card border border-border">
                <div className="flex items-start gap-3">
                  <div className="size-12 rounded-full bg-muted overflow-hidden grid place-items-center shrink-0">
                    {req.userId.avatar
                      ? <img src={req.userId.avatar} alt={req.userId.name} className="size-full object-cover" />
                      : <span className="text-xl">👤</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{req.userId.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{req.userId.email}</div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        req.memberType === "occasional" ? "bg-amber-500/15 text-amber-400" : "bg-blue-500/15 text-blue-400"
                      }`}>
                        {req.memberType === "occasional" ? "⏱ Occasional" : "👤 Regular"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    {req.message && (
                      <p className="text-xs text-muted-foreground mt-1.5 italic">"{req.message}"</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => approveMutation.mutate(req._id)}
                    disabled={approveMutation.isPending}
                    className="flex-1 h-10 rounded-xl bg-green-500/15 text-green-400 text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
                    <UserCheck className="size-4" /> Approve
                  </button>
                  <button onClick={() => rejectMutation.mutate(req._id)}
                    disabled={rejectMutation.isPending}
                    className="flex-1 h-10 rounded-xl bg-red-500/15 text-red-400 text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
                    <UserX className="size-4" /> Reject
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remove confirmation dialog */}
      <AnimatePresence>
        {removingId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setRemovingId(null)}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-card rounded-3xl p-6 border border-border">
              <h3 className="font-semibold text-lg">Remove member?</h3>
              <p className="text-sm text-muted-foreground mt-1">Their expenses will remain in history.</p>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setRemovingId(null)} className="flex-1 h-11 rounded-2xl bg-muted text-sm font-semibold">Cancel</button>
                <button onClick={() => removeMutation.mutate(removingId)} disabled={removeMutation.isPending}
                  className="flex-1 h-11 rounded-2xl bg-red-500/20 text-red-400 text-sm font-semibold disabled:opacity-50">
                  {removeMutation.isPending ? "Removing…" : "Remove"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
