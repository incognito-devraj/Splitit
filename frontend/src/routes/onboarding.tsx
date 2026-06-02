import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery, useMutation } from "@tanstack/react-query";
import { groupApi, joinRequestApi, ApiDiscoverGroup } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth";
import { QK } from "@/lib/queryKeys";
import { ThemeToggle } from "@/lib/theme";
import { Clock, Users, UserCheck, Search, Loader2, CheckCircle, XCircle } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Splitit - Setup" }] }),
  component: OnboardingPage,
});

type Tab = "create" | "join" | "discover";
type JoinStep = "code" | "type" | "pending";

function OnboardingPage() {
  const [tab, setTab] = useState<Tab>("create");
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [memberType, setMemberType] = useState<"permanent" | "occasional">("permanent");
  const [message, setMessage] = useState("");
  const [joinStep, setJoinStep] = useState<JoinStep>("code");
  const [pendingGroupName, setPendingGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const qc = useQueryClient();

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setLoading(true); setError("");
    try {
      const { data } = await groupApi.create(groupName.trim());
      setUser(data.data.user);
      qc.invalidateQueries({ queryKey: QK.groupsMine });
      qc.invalidateQueries({ queryKey: ["group"] });
      navigate({ to: "/" });
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create group");
    } finally { setLoading(false); }
  };

  const handleJoinRequest = async () => {
    if (inviteCode.trim().length !== 8) return;
    setLoading(true); setError("");
    try {
      const { data } = await joinRequestApi.request(inviteCode.trim().toUpperCase(), memberType, message);
      setPendingGroupName(data.data.groupName);
      setJoinStep("pending");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "";
      // If direct join is allowed (no approval needed), try direct join
      if (msg.includes("already")) {
        setError(msg);
      } else {
        setError(msg || "Invalid invite code");
      }
    } finally { setLoading(false); }
  };

  // Check if request was approved
  const checkApproval = async () => {
    setLoading(true); setError("");
    try {
      const { data } = await joinRequestApi.status(inviteCode.trim().toUpperCase());
      if (data.data.request?.status === "approved") {
        // Refresh user from /me
        const { authApi } = await import("@/lib/api/endpoints");
        const meRes = await authApi.me();
        setUser(meRes.data.data);
        qc.invalidateQueries({ queryKey: QK.groupsMine });
        navigate({ to: "/" });
      } else if (data.data.request?.status === "rejected") {
        setError("Your request was rejected by the admin.");
        setJoinStep("code");
      } else {
        setError("Still pending. Ask the admin to approve your request.");
      }
    } catch {
      setError("Could not check status. Try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground theme-app-bg flex flex-col items-center justify-center px-4 py-8 relative">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold tracking-tight">Set up your PG</h1>
          <p className="text-muted-foreground text-sm mt-1">Create a new group or request to join one</p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-2xl bg-card border border-border p-1 mb-6">
          {(["create", "join", "discover"] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(""); setJoinStep("code"); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                tab === t ? "gradient-primary text-primary-foreground shadow" : "text-muted-foreground"
              }`}>
              {t === "create" ? "🏗️ Create" : t === "join" ? "🔗 Join" : "🔍 Discover"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "create" ? (
            <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">PG Group Name</label>
                <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="e.g. Sunrise PG, Boys Hostel" maxLength={80}
                  className="w-full h-12 px-4 rounded-2xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
              </div>
              <motion.button whileTap={{ scale: 0.97 }} disabled={!groupName.trim() || loading} onClick={handleCreate}
                className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                {loading ? <><div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating…</> : "Create Group"}
              </motion.button>
            </motion.div>

          ) : tab === "join" && joinStep === "code" ? (
            <motion.div key="join-code" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Invite Code</label>
                <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="8-character code" maxLength={8}
                  className="w-full h-12 px-4 rounded-2xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary tracking-widest font-mono text-center text-xl uppercase" />
              </div>

              {/* Member type */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">How often will you split?</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "permanent", icon: Users, label: "Regular Member", desc: "Always split all expenses" },
                    { value: "occasional", icon: Clock, label: "Occasional Guest", desc: "Split only when present" },
                  ].map((opt) => (
                    <button key={opt.value} onClick={() => setMemberType(opt.value as "permanent" | "occasional")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        memberType === opt.value ? "border-primary bg-primary/10" : "border-border bg-card"
                      }`}>
                      <opt.icon className={`size-5 mb-1.5 ${memberType === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="text-sm font-semibold">{opt.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional message */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Message to admin <span className="text-xs">(optional)</span></label>
                <input type="text" value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hi, I'm the new flatmate…" maxLength={200}
                  className="w-full h-10 px-4 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary" />
              </div>

              <motion.button whileTap={{ scale: 0.97 }} disabled={inviteCode.trim().length !== 8 || loading} onClick={handleJoinRequest}
                className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                {loading ? <><div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending…</> : "Send Join Request"}
              </motion.button>
            </motion.div>

          ) : tab === "join" ? (
            <motion.div key="pending" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5">
              <div className="size-20 rounded-full bg-primary/15 grid place-items-center mx-auto">
                <UserCheck className="size-10 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Request Sent!</h2>
                <p className="text-muted-foreground text-sm mt-2">
                  Your request to join <strong>{pendingGroupName}</strong> is pending admin approval.
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Ask the group admin to approve your request, then tap the button below.
                </p>
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={checkApproval} disabled={loading}
                className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                {loading ? <><div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Checking…</> : "I've been approved →"}
              </motion.button>
              <button onClick={() => { setJoinStep("code"); setError(""); }}
                className="text-sm text-muted-foreground underline">
                Use a different code
              </button>
            </motion.div>

          ) : (
            /* Discover tab */
            <DiscoverTab />
          )}
        </AnimatePresence>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400 text-center mt-4">
            {error}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}

// ─── Discover Tab (inline in onboarding) ─────────────────────────────────────

function DiscoverTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [memberType, setMemberType] = useState<"permanent" | "occasional">("permanent");
  const [message, setMessage] = useState("");

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((window as unknown as { _st?: ReturnType<typeof setTimeout> })._st);
    (window as unknown as { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(
      () => setDebouncedSearch(v), 350,
    );
  };

  const { data, isLoading } = useQuery({
    queryKey: ["discover-groups", debouncedSearch],
    queryFn: () => groupApi.discover({ search: debouncedSearch, limit: 20 }).then((r) => r.data.data),
  });

  const requestMutation = useMutation({
    mutationFn: ({ groupId }: { groupId: string }) =>
      joinRequestApi.requestById(groupId, memberType, message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover-groups"] });
      setRequestingId(null);
      setMessage("");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (groupId: string) => joinRequestApi.cancelById(groupId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discover-groups"] }),
  });

  const groups = Array.isArray(data?.groups) ? data.groups : [];

  return (
    <motion.div key="discover" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search public groups…"
          className="w-full h-10 pl-9 pr-4 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary"
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && groups.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          {debouncedSearch ? "No groups match your search" : "No public groups available yet"}
        </div>
      )}

      {groups.map((group: ApiDiscoverGroup) => (
        <div key={group._id} className="p-3 rounded-2xl bg-card border border-border">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{group.name}</div>
              {group.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{group.description}</p>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {group.memberCount} members
              </div>
            </div>

            {group.myRequestStatus === "approved" && (
              <span className="text-xs text-green-400 flex items-center gap-1 shrink-0">
                <CheckCircle className="size-3.5" /> Approved
              </span>
            )}
            {group.myRequestStatus === "pending" && (
              <button
                onClick={() => cancelMutation.mutate(group._id)}
                disabled={cancelMutation.isPending}
                className="text-xs text-amber-400 shrink-0 disabled:opacity-50"
              >
                {cancelMutation.isPending ? "…" : "Pending · Cancel"}
              </button>
            )}
            {group.myRequestStatus === "rejected" && (
              <button onClick={() => setRequestingId(group._id)} className="text-xs text-muted-foreground shrink-0">
                <XCircle className="size-3.5 inline mr-0.5" /> Retry
              </button>
            )}
            {group.myRequestStatus === "none" && requestingId !== group._id && (
              <button
                onClick={() => setRequestingId(group._id)}
                className="px-2.5 py-1 rounded-lg gradient-primary text-primary-foreground text-xs font-semibold shrink-0"
              >
                Request
              </button>
            )}
          </div>

          <AnimatePresence>
            {requestingId === group._id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-2 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-2">
                  {(["permanent", "occasional"] as const).map((t) => (
                    <button key={t} onClick={() => setMemberType(t)}
                      className={`p-2 rounded-xl border text-xs text-left transition-all ${
                        memberType === t ? "border-primary bg-primary/10" : "border-border"
                      }`}>
                      <div className="font-semibold">{t === "permanent" ? "👤 Regular" : "⏱ Occasional"}</div>
                    </button>
                  ))}
                </div>
                <input
                  type="text" value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder="Message (optional)" maxLength={200}
                  className="w-full h-9 px-3 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-primary"
                />
                {requestMutation.isError && (
                  <p className="text-xs text-red-400">
                    {(requestMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed"}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => requestMutation.mutate({ groupId: group._id })}
                    disabled={requestMutation.isPending}
                    className="flex-1 h-9 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                  >
                    {requestMutation.isPending ? "Sending…" : "Send Request"}
                  </button>
                  <button onClick={() => { setRequestingId(null); setMessage(""); }}
                    className="px-3 h-9 rounded-xl bg-muted text-xs">Cancel</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </motion.div>
  );
}
