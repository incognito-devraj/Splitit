import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, Copy, Check, LogOut, Settings2,
  Users, Calendar, Loader2, CheckCircle, Clock, XCircle,
  Globe, Lock, UserCheck, UserX, Crown, ChevronRight, Zap,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { groupApi, joinRequestApi, authApi, ApiDiscoverGroup, ApiGroup } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth";
import { QK } from "@/lib/queryKeys";

export const Route = createFileRoute("/groups")({
  head: () => ({ meta: [{ title: "Splitit - Groups" }] }),
  component: GroupsPage,
});

type Tab = "my" | "create" | "discover" | "join" | "requests";

function GroupsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>(user?.groupId ? "my" : "create");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "my",       label: "My Groups", icon: <Users className="size-3.5" /> },
    { id: "create",   label: "Create",    icon: <Plus className="size-3.5" /> },
    { id: "discover", label: "Discover",  icon: <Globe className="size-3.5" /> },
    { id: "join",     label: "Join",      icon: <Zap className="size-3.5" /> },
    { id: "requests", label: "Requests",  icon: <Clock className="size-3.5" /> },
  ];

  return (
    <AppShell>
      <div className="px-4 sm:px-6 pt-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Groups</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage all your groups</p>
      </div>

      <div className="px-4 sm:px-6 mt-4">
        <div className="flex rounded-2xl bg-card border border-border p-1 gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold transition-all hover:-translate-y-0.5 whitespace-nowrap px-2 ${
                tab === t.id ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === "my"       && <MyGroupsTab key="my" onManage={(id) => { void id; }} />}
        {tab === "create"   && <CreateGroupTab key="create" onSuccess={() => setTab("my")} />}
        {tab === "discover" && <DiscoverTab key="discover" onJoined={() => setTab("my")} />}
        {tab === "join"     && <JoinTab key="join" onSuccess={() => setTab("my")} />}
        {tab === "requests" && <RequestsTab key="requests" />}
      </AnimatePresence>
    </AppShell>
  );
}

// ─── My Groups Tab — lists ALL groups the user belongs to ────────────────────

function MyGroupsTab({ onManage }: { onManage: (id: string) => void }) {
  const { user, setUser } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const activeGroupId = user?.groupId ?? null;

  const { data: groups = [], isLoading } = useQuery({
    queryKey: QK.groupsMine,
    queryFn: () => groupApi.mine().then((r) => r.data.data),
    enabled: !!user,
  });

  const switchMutation = useMutation({
    mutationFn: (groupId: string) => groupApi.setActive(groupId),
    onSuccess: async () => {
      const { data } = await authApi.me();
      setUser(data.data);
      qc.invalidateQueries({ queryKey: QK.groupsMine });
      qc.invalidateQueries({ queryKey: ["group"] });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => groupApi.leave(),
    onSuccess: async () => {
      const { data } = await authApi.me();
      setUser(data.data);
      qc.invalidateQueries({ queryKey: QK.groupsMine });
      qc.invalidateQueries({ queryKey: ["group"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      if (!data.data.groupId) navigate({ to: "/onboarding" });
    },
  });

  if (isLoading) return <TabWrap><LoadingSkeleton /></TabWrap>;

  if (groups.length === 0) {
    return (
      <TabWrap>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <span className="text-5xl">🏠</span>
          <p className="font-semibold">No groups yet</p>
          <p className="text-sm text-muted-foreground">Create a new group or join one with an invite code.</p>
        </div>
      </TabWrap>
    );
  }

  return (
    <TabWrap>
      {groups.map((group, i) => {
        const isActive = group._id === activeGroupId;
        const isAdmin = typeof group.adminId === "object"
          ? group.adminId._id === user?._id
          : group.adminId === user?._id;

        return (
          <GroupCard
            key={group._id}
            group={group}
            isActive={isActive}
            isAdmin={isAdmin}
            index={i}
            switching={switchMutation.isPending}
            leaving={leaveMutation.isPending}
            onSwitch={() => !isActive && switchMutation.mutate(group._id)}
            onLeave={() => !isAdmin && leaveMutation.mutate()}
            onManage={() => onManage(group._id)}
            currentUserId={user?._id ?? ""}
          />
        );
      })}
    </TabWrap>
  );
}

// ─── Group Card — used inside MyGroupsTab ────────────────────────────────────

function GroupCard({
  group, isActive, isAdmin, index, switching, leaving,
  onSwitch, onLeave, onManage, currentUserId,
}: {
  group: ApiGroup; isActive: boolean; isAdmin: boolean; index: number;
  switching: boolean; leaving: boolean;
  onSwitch: () => void; onLeave: () => void;
  onManage: () => void; currentUserId: string;
}) {
  const { user, setUser } = useAuth();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    name: group.name, description: group.description ?? "", isPublic: group.isPublic,
  });

  const settingsMutation = useMutation({
    mutationFn: (body: { name?: string; description?: string; isPublic?: boolean }) =>
      groupApi.updateSettings(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.groupsMine });
      qc.invalidateQueries({ queryKey: ["group"] });
      setShowSettings(false);
    },
  });

  const copyCode = () => {
    navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-3xl border transition-all duration-200 overflow-hidden ${
        isActive
          ? "border-primary/40 shadow-[0_0_0_2px_oklch(0.68_0.17_155_/_0.15),0_8px_32px_rgba(0,0,0,0.1)]"
          : "border-border hover:border-primary/20 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
      }`}
    >
      {/* Card header */}
      <div className="p-4 flex items-start gap-3">
        {/* Active indicator dot */}
        <div className={`mt-1 size-2.5 rounded-full shrink-0 ${isActive ? "bg-primary" : "bg-border"}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-base truncate">{group.name}</span>
            {isAdmin && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20 shrink-0">
                <Crown className="size-2.5" /> Admin
              </span>
            )}
            {isActive && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 shrink-0">
                Active
              </span>
            )}
          </div>
          {group.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{group.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="size-3" />{group.members?.length ?? 0}</span>
            <span className="flex items-center gap-1">
              {group.isPublic ? <Globe className="size-3" /> : <Lock className="size-3" />}
              {group.isPublic ? "Public" : "Private"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isActive && (
            <button
              onClick={onSwitch} disabled={switching}
              className="h-8 px-3 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
            >
              {switching ? <Loader2 className="size-3 animate-spin" /> : null}
              Switch
            </button>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="size-8 rounded-xl bg-muted grid place-items-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <ChevronRight className={`size-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border/60">
              {/* Invite code */}
              <div className="flex items-center gap-3 pt-3">
                <span className="text-xs text-muted-foreground w-20 shrink-0">Invite code</span>
                <span className="font-mono font-bold tracking-widest text-sm flex-1">{group.inviteCode}</span>
                <button onClick={copyCode} className="size-8 rounded-lg bg-muted grid place-items-center hover:bg-primary/10 transition-colors">
                  {copied ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
                </button>
              </div>

              {/* Members */}
              <div className="space-y-1.5">
                {(group.members ?? []).slice(0, 5).map((m) => (
                  <div key={m._id} className="flex items-center gap-2 p-2 rounded-xl bg-muted/40">
                    <div className="size-7 rounded-full bg-muted overflow-hidden grid place-items-center text-xs shrink-0">
                      {m.avatar ? <img src={m.avatar} alt={m.name} className="size-full object-cover" /> : "👤"}
                    </div>
                    <span className="text-sm font-medium flex-1 truncate">{m.name}{m._id === currentUserId ? " (you)" : ""}</span>
                    <span className="text-xs text-muted-foreground capitalize">{m.role}</span>
                  </div>
                ))}
                {(group.members ?? []).length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">+{group.members.length - 5} more</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {isAdmin && (
                  <button
                    onClick={() => { setSettingsForm({ name: group.name, description: group.description ?? "", isPublic: group.isPublic }); setShowSettings(true); }}
                    className="flex-1 h-9 rounded-xl bg-muted text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <Settings2 className="size-3.5" /> Settings
                  </button>
                )}
                {!isAdmin && (
                  <button
                    onClick={onLeave} disabled={leaving}
                    className="flex-1 h-9 rounded-xl bg-red-500/10 text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-red-500/15 transition-colors disabled:opacity-50"
                  >
                    <LogOut className="size-3.5" /> Leave Group
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  placeholder="Optional…"
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
                <p className="text-xs text-red-400">{(settingsMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed"}</p>
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
    </motion.div>
  );
}

// ─── Create Group Tab — available any time, not just onboarding ──────────────

function CreateGroupTab({ onSuccess }: { onSuccess: () => void }) {
  const { setUser } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true); setError("");
    try {
      const { data } = await groupApi.create(name.trim(), description.trim() || undefined);
      setUser(data.data.user);
      qc.invalidateQueries({ queryKey: QK.groupsMine });
      qc.invalidateQueries({ queryKey: ["group"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      onSuccess();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create group");
    } finally { setLoading(false); }
  };

  return (
    <TabWrap>
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
        <div className="text-center py-4">
          <div className="text-4xl mb-2">🏗️</div>
          <h2 className="font-bold text-lg tracking-tight">Create a New Group</h2>
          <p className="text-sm text-muted-foreground mt-1">You'll be the admin with a unique invite code</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Group Name <span className="text-primary">*</span></label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="e.g. Sunrise PG, Trip to Goa…" maxLength={80}
            className="w-full h-11 px-4 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:border-primary transition-colors" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this group for?" maxLength={300}
            className="w-full h-11 px-4 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:border-primary transition-colors" />
        </div>
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        <motion.button whileTap={{ scale: 0.97 }} disabled={!name.trim() || loading} onClick={handleCreate}
          className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold disabled:opacity-40 flex items-center justify-center gap-2 shadow-[var(--shadow-glow)]">
          {loading
            ? <><div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating…</>
            : <><Plus className="size-4" /> Create Group</>}
        </motion.button>
      </motion.div>
    </TabWrap>
  );
}

// ─── Discover Tab ─────────────────────────────────────────────────────────────

function DiscoverTab({ onJoined }: { onJoined: () => void }) {
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
      setRequestingId(null); setMessage("");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (groupId: string) => joinRequestApi.cancelById(groupId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discover-groups"] }),
  });

  const groups = Array.isArray(data?.groups) ? data.groups : [];

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
            transition={{ delay: i * 0.04 }} whileHover={{ y: -3, scale: 1.01 }}
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
                        className={`p-2.5 rounded-xl border text-xs text-left transition-all hover:-translate-y-0.5 ${memberType === t ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"}`}>
                        <div className="font-semibold">{t === "permanent" ? "👤 Regular" : "⏱ Occasional"}</div>
                        <div className="text-muted-foreground mt-0.5">{t === "permanent" ? "Always split" : "Split when present"}</div>
                      </button>
                    ))}
                  </div>
                  <input type="text" value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="Message to admin (optional)" maxLength={200}
                    className="w-full h-9 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary" />
                  {requestMutation.isError && (
                    <p className="text-xs text-red-400">{(requestMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed"}</p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => requestMutation.mutate({ groupId: group._id })} disabled={requestMutation.isPending}
                      className="flex-1 h-10 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 disabled:opacity-50">
                      {requestMutation.isPending ? <><Loader2 className="size-4 animate-spin" /> Sending…</> : "Send Request"}
                    </button>
                    <button onClick={() => { setRequestingId(null); setMessage(""); }}
                      className="px-4 h-10 rounded-xl bg-muted text-sm hover:bg-primary/10 hover:text-primary">Cancel</button>
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
  const { setUser } = useAuth();
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
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Invalid invite code");
    } finally { setLoading(false); }
  };

  const checkApproval = async () => {
    setLoading(true); setError("");
    try {
      const { data } = await joinRequestApi.status(inviteCode.trim().toUpperCase());
      if (data.data.request?.status === "approved") {
        const meRes = await authApi.me();
        setUser(meRes.data.data);
        qc.invalidateQueries({ queryKey: QK.groupsMine });
        qc.invalidateQueries({ queryKey: ["group"] });
        qc.invalidateQueries({ queryKey: ["expenses"] });
        qc.invalidateQueries({ queryKey: ["balances"] });
        qc.invalidateQueries({ queryKey: ["summary"] });
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

  return (
    <TabWrap>
      <AnimatePresence mode="wait">
        {step === "form" ? (
          <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="text-center py-2">
              <div className="text-4xl mb-2">🔗</div>
              <h2 className="font-bold text-lg tracking-tight">Join with Invite Code</h2>
              <p className="text-sm text-muted-foreground mt-1">Enter the 8-character code shared by the group admin</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Invite Code</label>
              <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX" maxLength={8}
                className="w-full h-12 px-4 rounded-2xl bg-card border border-border text-center text-xl font-mono font-bold tracking-[0.3em] focus:outline-none focus:border-primary uppercase" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(["permanent", "occasional"] as const).map((t) => (
                <button key={t} onClick={() => setMemberType(t)}
                  className={`p-3 rounded-2xl border text-left transition-all hover:-translate-y-0.5 ${memberType === t ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"}`}>
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
              className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
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
              className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
              {loading ? <><div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Checking…</> : "I've been approved →"}
            </button>
            <button onClick={() => { setStep("form"); setError(""); }} className="text-sm text-muted-foreground underline">Use a different code</button>
          </motion.div>
        )}
      </AnimatePresence>
    </TabWrap>
  );
}

// ─── Requests Tab (admin only) ────────────────────────────────────────────────

function RequestsTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";

  const { data: pendingRequests = [], isLoading } = useQuery({
    queryKey: ["join-requests-pending"],
    queryFn: () => joinRequestApi.pending().then((r) => r.data.data),
    enabled: !!user?.groupId,
    refetchInterval: 20_000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => joinRequestApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["join-requests-pending"] });
      qc.invalidateQueries({ queryKey: QK.groupsMine });
      qc.invalidateQueries({ queryKey: ["group"] });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => joinRequestApi.reject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["join-requests-pending"] }),
  });

  if (!user?.groupId) return (
    <TabWrap>
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <span className="text-4xl">📋</span>
        <p className="text-sm text-muted-foreground">Join or create a group to see requests.</p>
      </div>
    </TabWrap>
  );

  if (isLoading) return <TabWrap><LoadingSkeleton /></TabWrap>;

  return (
    <TabWrap>
      {pendingRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <UserCheck className="size-12 opacity-30" />
          <p className="text-sm font-medium">No pending join requests</p>
          <p className="text-xs text-center opacity-70">Requests to join groups you admin will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingRequests.map((req, i) => (
            <motion.div key={req._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }} whileHover={{ y: -3, scale: 1.01 }}
              className="p-4 rounded-3xl bg-card border border-border transition-all hover:border-primary/30 hover:shadow-[0_16px_34px_rgba(0,0,0,0.12)]">
              <div className="flex items-start gap-3">
                <div className="size-12 rounded-full bg-muted overflow-hidden grid place-items-center shrink-0">
                  {req.userId.avatar ? <img src={req.userId.avatar} alt={req.userId.name} className="size-full object-cover" /> : <span className="text-xl">👤</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{req.userId.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{req.userId.email}</div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.memberType === "occasional" ? "bg-amber-500/15 text-amber-400" : "bg-blue-500/15 text-blue-400"}`}>
                      {req.memberType === "occasional" ? "⏱ Occasional" : "👤 Regular"}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>
                  {req.message && <p className="text-xs text-muted-foreground mt-1.5 italic">"{req.message}"</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => approveMutation.mutate(req._id)} disabled={approveMutation.isPending}
                  className="flex-1 h-10 rounded-xl bg-green-500/15 text-green-400 text-sm font-semibold flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 hover:bg-green-500/20 disabled:opacity-50">
                  <UserCheck className="size-4" /> Approve
                </button>
                <button onClick={() => rejectMutation.mutate(req._id)} disabled={rejectMutation.isPending}
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
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }} className="px-4 sm:px-6 mt-4 pb-6 space-y-3">
      {children}
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-3xl bg-card border border-border animate-pulse" />)}
    </div>
  );
}
