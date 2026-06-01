import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, Copy, Check, LogOut, Settings2,
  Users, Calendar, Loader2, CheckCircle, Clock, XCircle,
  Globe, Lock, UserCheck, UserX,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { groupApi, joinRequestApi, ApiDiscoverGroup } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth";
import { QK } from "@/lib/queryKeys";

export const Route = createFileRoute("/groups")({
  head: () => ({ meta: [{ title: "Splitit - Groups" }] }),
  component: GroupsPage,
});

type Tab = "my" | "discover" | "join" | "requests";

function GroupsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>(user?.groupId ? "my" : "discover");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "my",       label: "My Group",   icon: <Users className="size-3.5" /> },
    { id: "discover", label: "Discover",   icon: <Globe className="size-3.5" /> },
    { id: "join",     label: "Join",       icon: <Plus className="size-3.5" /> },
    { id: "requests", label: "Requests",   icon: <Clock className="size-3.5" /> },
  ];

  return (
    <AppShell>
      <div className="px-4 sm:px-6 pt-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Groups</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your PG groups</p>
      </div>

      {/* Tab bar */}
      <div className="px-4 sm:px-6 mt-4">
        <div className="flex rounded-2xl bg-card border border-border p-1 gap-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all hover:-translate-y-0.5 ${
                tab === t.id ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === "my"       && <MyGroupTab key="my" />}
        {tab === "discover" && <DiscoverTab key="discover" />}
        {tab === "join"     && <JoinTab key="join" onSuccess={() => setTab("my")} />}
        {tab === "requests" && <RequestsTab key="requests" />}
      </AnimatePresence>
    </AppShell>
  );
}

// ─── My Group Tab ─────────────────────────────────────────────────────────────

function MyGroupTab() {
  const { user, setUser } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const activeGroupId = user?.groupId ?? null;
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ name: "", description: "", isPublic: false });

  const { data: group, isLoading } = useQuery({
    queryKey: QK.group(activeGroupId),
    queryFn: () => groupApi.current().then((r) => r.data.data),
    enabled: !!activeGroupId,
  });

  const leaveMutation = useMutation({
    mutationFn: () => groupApi.leave(),
    onSuccess: async () => {
      const { authApi } = await import("@/lib/api/endpoints");
      const meRes = await authApi.me();
      setUser(meRes.data.data);
      qc.invalidateQueries({ queryKey: ["groups", "mine"] });
      qc.invalidateQueries({ queryKey: ["group"] });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      navigate({ to: meRes.data.data.groupId ? "/" : "/onboarding" });
    },
  });

  const settingsMutation = useMutation({
    mutationFn: (body: { name?: string; description?: string; isPublic?: boolean }) =>
      groupApi.updateSettings(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group"] });
      setShowSettings(false);
    },
  });

  const copyCode = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user?.groupId) {
    return (
      <TabWrap>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <span className="text-5xl">🏠</span>
          <p className="font-semibold">You're not in a group yet</p>
          <p className="text-sm text-muted-foreground">Discover a public group or join with an invite code.</p>
        </div>
      </TabWrap>
    );
  }

  if (isLoading) return <TabWrap><LoadingSkeleton /></TabWrap>;

  return (
    <TabWrap>
      {/* Group card */}
      <motion.div whileHover={{ y: -3, scale: 1.01 }} className="p-5 rounded-3xl gradient-balance text-white shadow-[var(--shadow-card)] transition-shadow hover:shadow-[0_24px_60px_rgba(0,128,170,0.28)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xl font-bold truncate">{group?.name}</div>
            {group?.description && (
              <p className="text-sm text-white/80 mt-0.5 line-clamp-2">{group.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-white/70">
              <span className="flex items-center gap-1"><Users className="size-3" /> {group?.members?.length ?? 0} members</span>
              <span className="flex items-center gap-1">
                {group?.isPublic ? <Globe className="size-3" /> : <Lock className="size-3" />}
                {group?.isPublic ? "Public" : "Private"}
              </span>
              <span className="capitalize">{user.role}</span>
            </div>
          </div>
          {user.role === "admin" && (
            <button onClick={() => { setSettingsForm({ name: group?.name ?? "", description: group?.description ?? "", isPublic: group?.isPublic ?? false }); setShowSettings(true); }}
              className="size-9 rounded-xl bg-white/20 grid place-items-center shrink-0 transition-all hover:-translate-y-0.5 hover:bg-white/30">
              <Settings2 className="size-4" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Invite code — permanent, copy only */}
      <div className="p-4 rounded-2xl bg-card border border-border transition-all hover:border-primary/30 hover:shadow-[0_12px_28px_rgba(0,0,0,0.10)]">
        <div className="text-xs text-muted-foreground mb-2">Invite Code</div>
        <div className="flex items-center gap-3">
          <div className="flex-1 font-mono font-bold tracking-[0.25em] text-xl">{group?.inviteCode}</div>
          <button onClick={copyCode} className="size-9 rounded-xl bg-muted grid place-items-center transition-all hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary">
            {copied ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Share this code to invite people. It never changes.
        </p>
      </div>

      {/* Members list */}
      <div>
        <div className="text-sm font-semibold mb-2">Members</div>
        <div className="space-y-2">
          {(group?.members ?? []).map((m) => (
            <div key={m._id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border transition-all hover:translate-x-1 hover:border-primary/30 hover:bg-primary/5">
              <div className="size-9 rounded-full bg-muted overflow-hidden grid place-items-center text-sm shrink-0">
                {m.avatar ? <img src={m.avatar} alt={m.name} className="size-full object-cover" /> : "👤"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.name}{m._id === user._id ? " (you)" : ""}</div>
                <div className="text-xs text-muted-foreground capitalize">{m.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leave group */}
      {user.role !== "admin" && (
        <button onClick={() => leaveMutation.mutate()} disabled={leaveMutation.isPending}
          className="w-full h-11 rounded-2xl bg-red-500/10 text-red-400 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 hover:bg-red-500/15 disabled:opacity-50">
          <LogOut className="size-4" /> {leaveMutation.isPending ? "Leaving…" : "Leave Group"}
        </button>
      )}

      {/* Settings modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowSettings(false)}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-card rounded-3xl p-6 border border-border space-y-4">
              <h3 className="font-semibold text-lg">Group Settings</h3>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Group Name</label>
                <input value={settingsForm.name} onChange={(e) => setSettingsForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <input value={settingsForm.description} onChange={(e) => setSettingsForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description…"
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
                <div>
                  <div className="text-sm font-medium">Public Group</div>
                  <div className="text-xs text-muted-foreground">Discoverable by anyone</div>
                </div>
                <button onClick={() => setSettingsForm(f => ({ ...f, isPublic: !f.isPublic }))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${settingsForm.isPublic ? "bg-primary" : "bg-muted-foreground/30"}`}>
                  <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${settingsForm.isPublic ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>
              {settingsMutation.isError && (
                <p className="text-xs text-red-400">
                  {(settingsMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to save"}
                </p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowSettings(false)} className="flex-1 h-11 rounded-2xl bg-muted text-sm font-semibold">Cancel</button>
                <button onClick={() => settingsMutation.mutate(settingsForm)} disabled={settingsMutation.isPending}
                  className="flex-1 h-11 rounded-2xl gradient-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                  {settingsMutation.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TabWrap>
  );
}

// ─── Discover Tab ─────────────────────────────────────────────────────────────

function DiscoverTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [memberType, setMemberType] = useState<"permanent" | "occasional">("permanent");
  const [message, setMessage] = useState("");

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((window as unknown as { _st?: ReturnType<typeof setTimeout> })._st);
    (window as unknown as { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => setDebouncedSearch(v), 350);
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["discover-groups", debouncedSearch],
    queryFn: () => groupApi.discover({ search: debouncedSearch, limit: 30 }).then((r) => r.data.data),
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

  if (false && user?.groupId) {
    return (
      <TabWrap>
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <span className="text-4xl">✅</span>
          <p className="font-semibold">You're already in a group</p>
          <p className="text-sm text-muted-foreground">Leave your current group to discover others.</p>
        </div>
      </TabWrap>
    );
  }

  return (
    <TabWrap>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search public groups…"
          className="w-full h-10 pl-9 pr-4 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary" />
      </div>

      {isLoading && <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}
      {isError && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 text-center">Failed to load groups.</div>}
      {!isLoading && !isError && groups.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          {debouncedSearch ? "No groups match your search" : "No public groups available yet"}
        </div>
      )}

      <div className="space-y-3">
        {groups.map((group: ApiDiscoverGroup, i: number) => (
          <motion.div key={group._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ y: -3, scale: 1.01 }}
            className="p-4 rounded-3xl bg-card border border-border transition-all hover:border-primary/30 hover:shadow-[0_16px_34px_rgba(0,0,0,0.12)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{group.name}</div>
                {group.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{group.description}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="size-3" /> {group.memberCount}</span>
                  <span className="flex items-center gap-1"><Calendar className="size-3" />
                    {new Date(group.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
              <DiscoverActionButton group={group}
                onRequest={() => setRequestingId(group._id)}
                onCancel={() => cancelMutation.mutate(group._id)}
                cancelling={cancelMutation.isPending} />
            </div>

            <AnimatePresence>
              {requestingId === group._id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-2 overflow-hidden">
                  <div className="grid grid-cols-2 gap-2">
                    {(["permanent", "occasional"] as const).map((t) => (
                      <button key={t} onClick={() => setMemberType(t)}
                        className={`p-2.5 rounded-xl border text-xs text-left transition-all hover:-translate-y-0.5 ${memberType === t ? "border-primary bg-primary/10" : "border-border hover:border-primary/30 hover:bg-primary/5"}`}>
                        <div className="font-semibold">{t === "permanent" ? "👤 Regular" : "⏱ Occasional"}</div>
                        <div className="text-muted-foreground mt-0.5">{t === "permanent" ? "Always split" : "Split when present"}</div>
                      </button>
                    ))}
                  </div>
                  <input type="text" value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="Message to admin (optional)" maxLength={200}
                    className="w-full h-9 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary" />
                  {requestMutation.isError && (
                    <p className="text-xs text-red-400">
                      {(requestMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed"}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => requestMutation.mutate({ groupId: group._id })} disabled={requestMutation.isPending}
                      className="flex-1 h-10 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 disabled:opacity-50">
                      {requestMutation.isPending ? <><Loader2 className="size-4 animate-spin" /> Sending…</> : "Send Request"}
                    </button>
                    <button onClick={() => { setRequestingId(null); setMessage(""); }}
                      className="px-4 h-10 rounded-xl bg-muted text-sm transition-colors hover:bg-primary/10 hover:text-primary">Cancel</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </TabWrap>
  );
}

function DiscoverActionButton({ group, onRequest, onCancel, cancelling }: {
  group: ApiDiscoverGroup; onRequest: () => void; onCancel: () => void; cancelling: boolean;
}) {
  if (group.myRequestStatus === "approved") return <span className="text-xs text-green-400 flex items-center gap-1 shrink-0"><CheckCircle className="size-3.5" /> Joined</span>;
  if (group.myRequestStatus === "pending") return (
    <button onClick={onCancel} disabled={cancelling}
      className="text-xs text-amber-400 shrink-0 hover:text-red-400 transition-colors disabled:opacity-50 flex items-center gap-1">
      {cancelling ? <Loader2 className="size-3.5 animate-spin" /> : <Clock className="size-3.5" />}
      {cancelling ? "…" : "Pending · Cancel"}
    </button>
  );
  if (group.myRequestStatus === "rejected") return (
    <button onClick={onRequest} className="text-xs text-muted-foreground shrink-0 flex items-center gap-1 hover:text-primary">
      <XCircle className="size-3.5" /> Retry
    </button>
  );
  return <button onClick={onRequest} className="px-3 py-1.5 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold shrink-0 transition-transform hover:-translate-y-0.5">Request Join</button>;
}

// ─── Join By Invite Code Tab ──────────────────────────────────────────────────

function JoinTab({ onSuccess }: { onSuccess: () => void }) {
  const { user, setUser } = useAuth();
  const qc = useQueryClient();
  const [inviteCode, setInviteCode] = useState("");
  const [memberType, setMemberType] = useState<"permanent" | "occasional">("permanent");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"form" | "pending">("form");
  const [pendingGroupName, setPendingGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRequest = async () => {
    if (inviteCode.trim().length !== 8) return;
    setLoading(true); setError("");
    try {
      const { data } = await joinRequestApi.request(inviteCode.trim().toUpperCase(), memberType, message);
      setPendingGroupName(data.data.groupName);
      setStep("pending");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Invalid invite code";
      setError(msg);
    } finally { setLoading(false); }
  };

  const checkApproval = async () => {
    setLoading(true); setError("");
    try {
      const { data } = await joinRequestApi.status(inviteCode.trim().toUpperCase());
      if (data.data.request?.status === "approved") {
        const { authApi } = await import("@/lib/api/endpoints");
        const meRes = await authApi.me();
        setUser(meRes.data.data);
        qc.invalidateQueries({ queryKey: ["group"] });
        onSuccess();
      } else if (data.data.request?.status === "rejected") {
        setError("Your request was rejected by the admin.");
        setStep("form");
      } else {
        setError("Still pending. Ask the admin to approve your request.");
      }
    } catch { setError("Could not check status. Try again."); }
    finally { setLoading(false); }
  };

  if (false && user?.groupId) {
    return (
      <TabWrap>
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <span className="text-4xl">✅</span>
          <p className="font-semibold">You're already in a group</p>
          <p className="text-sm text-muted-foreground">Leave your current group to join another.</p>
        </div>
      </TabWrap>
    );
  }

  return (
    <TabWrap>
      <AnimatePresence mode="wait">
        {step === "form" ? (
          <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Invite Code</label>
              <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="8-character code" maxLength={8}
                className="w-full h-12 px-4 rounded-2xl bg-card border border-border text-foreground focus:outline-none focus:border-primary tracking-widest font-mono text-center text-xl uppercase" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(["permanent", "occasional"] as const).map((t) => (
                <button key={t} onClick={() => setMemberType(t)}
                  className={`p-3 rounded-2xl border text-left transition-all hover:-translate-y-0.5 ${memberType === t ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"}`}>
                  <div className="text-sm font-semibold">{t === "permanent" ? "👤 Regular" : "⏱ Occasional"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t === "permanent" ? "Always split" : "Split when present"}</div>
                </button>
              ))}
            </div>
            <input type="text" value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Message to admin (optional)" maxLength={200}
              className="w-full h-10 px-4 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary" />
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <button disabled={inviteCode.trim().length !== 8 || loading} onClick={handleRequest}
              className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-40 flex items-center justify-center gap-2">
              {loading ? <><div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending…</> : "Send Join Request"}
            </button>
          </motion.div>
        ) : (
          <motion.div key="pending" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5">
            <div className="size-20 rounded-full bg-primary/15 grid place-items-center mx-auto">
              <UserCheck className="size-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Request Sent!</h2>
              <p className="text-muted-foreground text-sm mt-2">Waiting for admin to approve your request to join <strong>{pendingGroupName}</strong>.</p>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button onClick={checkApproval} disabled={loading}
              className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-40 flex items-center justify-center gap-2">
              {loading ? <><div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Checking…</> : "I've been approved →"}
            </button>
            <button onClick={() => { setStep("form"); setError(""); }} className="text-sm text-muted-foreground underline">Use a different code</button>
          </motion.div>
        )}
      </AnimatePresence>
    </TabWrap>
  );
}

// ─── Requests Tab (admin: approve/reject; member: view own status) ────────────

function RequestsTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";

  const { data: pendingRequests = [], isLoading } = useQuery({
    queryKey: ["join-requests-pending"],
    queryFn: () => joinRequestApi.pending().then((r) => r.data.data),
    enabled: !!user?.groupId && isAdmin,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => joinRequestApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["join-requests-pending"] });
      qc.invalidateQueries({ queryKey: ["group"] });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => joinRequestApi.reject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["join-requests-pending"] }),
  });

  if (!user?.groupId) {
    return (
      <TabWrap>
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <span className="text-4xl">📋</span>
          <p className="text-sm text-muted-foreground">Join a group to see requests.</p>
        </div>
      </TabWrap>
    );
  }

  if (!isAdmin) {
    return (
      <TabWrap>
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <span className="text-4xl">🔒</span>
          <p className="font-semibold">Admin only</p>
          <p className="text-sm text-muted-foreground">Only the group admin can manage join requests.</p>
        </div>
      </TabWrap>
    );
  }

  if (isLoading) return <TabWrap><LoadingSkeleton /></TabWrap>;

  return (
    <TabWrap>
      {pendingRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <UserCheck className="size-12 opacity-30" />
          <p className="text-sm">No pending join requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingRequests.map((req, i) => (
            <motion.div key={req._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3, scale: 1.01 }}
              className="p-4 rounded-3xl bg-card border border-border transition-all hover:border-primary/30 hover:shadow-[0_16px_34px_rgba(0,0,0,0.12)]">
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
                  className="flex-1 h-10 rounded-xl bg-green-500/15 text-green-400 text-sm font-semibold flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 hover:bg-green-500/20 disabled:opacity-50">
                  <UserCheck className="size-4" /> Approve
                </button>
                <button onClick={() => rejectMutation.mutate(req._id)}
                  disabled={rejectMutation.isPending}
                  className="flex-1 h-10 rounded-xl bg-red-500/15 text-red-400 text-sm font-semibold flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 hover:bg-red-500/20 disabled:opacity-50">
                  <UserX className="size-4" /> Reject
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </TabWrap>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function TabWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="px-4 sm:px-6 mt-4 pb-6 space-y-3"
    >
      {children}
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-3xl bg-card border border-border animate-pulse" />
      ))}
    </div>
  );
}
