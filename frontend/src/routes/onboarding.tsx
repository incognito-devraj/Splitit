import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { groupApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Setup · PG Split" }] }),
  component: OnboardingPage,
});

type Tab = "create" | "join";

function OnboardingPage() {
  const [tab, setTab] = useState<Tab>("create");
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const qc = useQueryClient();

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await groupApi.create(groupName.trim());
      setUser(data.data.user);
      qc.invalidateQueries({ queryKey: ["group"] });
      navigate({ to: "/" });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (inviteCode.trim().length !== 8) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await groupApi.join(inviteCode.trim().toUpperCase());
      setUser(data.data.user);
      qc.invalidateQueries({ queryKey: ["group"] });
      navigate({ to: "/" });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Invalid invite code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground gradient-mesh-bg flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold tracking-tight">Set up your PG</h1>
          <p className="text-muted-foreground text-sm mt-1">Create a new group or join an existing one</p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-2xl bg-card border border-border p-1 mb-6">
          {(["create", "join"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t ? "gradient-primary text-primary-foreground shadow" : "text-muted-foreground"
              }`}
            >
              {t === "create" ? "Create Group" : "Join Group"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "create" ? (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  PG Group Name
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="e.g. Sunrise PG, Boys Hostel"
                  maxLength={80}
                  className="w-full h-12 px-4 rounded-2xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={!groupName.trim() || loading}
                onClick={handleCreate}
                className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating…</>
                ) : "Create Group"}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="join"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Invite Code
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  placeholder="8-character code e.g. ABCD1234"
                  maxLength={8}
                  className="w-full h-12 px-4 rounded-2xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors tracking-widest font-mono text-center text-lg uppercase"
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={inviteCode.trim().length !== 8 || loading}
                onClick={handleJoin}
                className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Joining…</>
                ) : "Join Group"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-red-400 text-center mt-4"
          >
            {error}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
