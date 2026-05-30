import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Users, Calendar, Loader2, CheckCircle, Clock, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { groupApi, joinRequestApi, ApiDiscoverGroup } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/discover")({
  head: () => ({ meta: [{ title: "Discover Groups · PG Split" }] }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [memberType, setMemberType] = useState<"permanent" | "occasional">("permanent");
  const [message, setMessage] = useState("");

  // Debounce search
  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer);
    (window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(
      () => setDebouncedSearch(v),
      350,
    );
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["discover-groups", debouncedSearch],
    queryFn: () => groupApi.discover({ search: debouncedSearch, limit: 30 }).then((r) => r.data.data),
    enabled: !user?.groupId, // only show if user has no group
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

  const groups = data?.groups ?? [];

  if (user?.groupId) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-24 px-4 gap-4 text-center">
          <span className="text-5xl">✅</span>
          <p className="font-semibold text-lg">You're already in a group</p>
          <p className="text-sm text-muted-foreground">Leave your current group to discover others.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-4 sm:px-6 pt-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Discover Groups</h1>
        <p className="text-sm text-muted-foreground mt-1">Find a public PG group and request to join</p>
      </div>

      {/* Search */}
      <div className="px-4 sm:px-6 mt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by group name…"
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="px-4 sm:px-6 mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 text-center">
          Failed to load groups. Please try again.
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <span className="text-5xl">🔍</span>
          <p className="text-sm text-muted-foreground">
            {debouncedSearch ? "No groups match your search" : "No public groups available yet"}
          </p>
        </div>
      )}

      {/* Group cards */}
      <div className="px-4 sm:px-6 mt-4 pb-6 space-y-3">
        {groups.map((group, i) => (
          <motion.div
            key={group._id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="p-4 rounded-3xl bg-card border border-border"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-base">{group.name}</div>
                {group.description && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{group.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" /> {group.memberCount} members
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    {new Date(group.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>

              <RequestButton
                group={group}
                onRequest={() => setRequestingId(group._id)}
                onCancel={() => cancelMutation.mutate(group._id)}
                cancelling={cancelMutation.isPending}
              />
            </div>

            {/* Inline request form */}
            <AnimatePresence>
              {requestingId === group._id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-3 overflow-hidden"
                >
                  {/* Member type */}
                  <div className="grid grid-cols-2 gap-2">
                    {(["permanent", "occasional"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setMemberType(t)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                          memberType === t ? "border-primary bg-primary/10" : "border-border bg-muted"
                        }`}
                      >
                        <div className="font-semibold">{t === "permanent" ? "👤 Regular" : "⏱ Occasional"}</div>
                        <div className="text-muted-foreground mt-0.5">
                          {t === "permanent" ? "Always split expenses" : "Split when present"}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Message */}
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Message to admin (optional)"
                    maxLength={200}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary"
                  />

                  {requestMutation.isError && (
                    <p className="text-xs text-red-400">
                      {(requestMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to send request"}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => requestMutation.mutate({ groupId: group._id })}
                      disabled={requestMutation.isPending}
                      className="flex-1 h-10 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {requestMutation.isPending ? (
                        <><Loader2 className="size-4 animate-spin" /> Sending…</>
                      ) : "Send Request"}
                    </button>
                    <button
                      onClick={() => { setRequestingId(null); setMessage(""); }}
                      className="px-4 h-10 rounded-xl bg-muted text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </AppShell>
  );
}

function RequestButton({
  group,
  onRequest,
  onCancel,
  cancelling,
}: {
  group: ApiDiscoverGroup;
  onRequest: () => void;
  onCancel: () => void;
  cancelling: boolean;
}) {
  if (group.myRequestStatus === "approved") {
    return (
      <div className="flex items-center gap-1 text-xs text-green-400 font-medium shrink-0">
        <CheckCircle className="size-4" /> Approved
      </div>
    );
  }

  if (group.myRequestStatus === "pending") {
    return (
      <button
        onClick={onCancel}
        disabled={cancelling}
        className="flex items-center gap-1 text-xs text-amber-400 font-medium shrink-0 hover:text-red-400 transition-colors disabled:opacity-50"
      >
        {cancelling ? <Loader2 className="size-3.5 animate-spin" /> : <Clock className="size-3.5" />}
        {cancelling ? "Cancelling…" : "Pending · Cancel"}
      </button>
    );
  }

  if (group.myRequestStatus === "rejected") {
    return (
      <button
        onClick={onRequest}
        className="flex items-center gap-1 text-xs text-muted-foreground font-medium shrink-0 hover:text-primary transition-colors"
      >
        <XCircle className="size-3.5" /> Rejected · Retry
      </button>
    );
  }

  return (
    <button
      onClick={onRequest}
      className="px-3 py-1.5 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold shrink-0"
    >
      Request Join
    </button>
  );
}
