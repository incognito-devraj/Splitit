import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Bell, Moon, HelpCircle, Shield, LogOut, Copy, Check, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { groupApi } from "@/lib/api/endpoints";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · PG Split" }] }),
  component: Settings,
});

function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: group } = useQuery({
    queryKey: ["group"],
    queryFn: () => groupApi.current().then((r) => r.data.data),
    enabled: !!user?.groupId,
  });

  const regenMutation = useMutation({
    mutationFn: () => groupApi.regenerateCode(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group"] }),
  });

  const copyCode = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  const rows = [
    { icon: Bell, label: "Notifications" },
    { icon: Moon, label: "Appearance" },
    { icon: Shield, label: "Privacy" },
    { icon: HelpCircle, label: "Help & Support" },
  ];

  return (
    <AppShell>
      <div className="px-5 pt-6">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      </div>

      {/* Profile card */}
      <div className="px-5 mt-6">
        <div className="p-5 rounded-3xl gradient-balance text-white shadow-[var(--shadow-card)] flex items-center gap-4">
          <div className="size-16 rounded-full bg-white/25 overflow-hidden grid place-items-center">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="size-full object-cover" />
            ) : (
              <span className="text-3xl">👤</span>
            )}
          </div>
          <div>
            <div className="text-xl font-semibold">{user?.name ?? "—"}</div>
            <div className="text-sm text-white/80">
              {group?.name ?? "No group"} · {user?.role === "admin" ? "Admin" : "Member"}
            </div>
            <div className="text-xs text-white/60 mt-0.5">{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Invite code */}
      {group?.inviteCode && (
        <div className="px-5 mt-4">
          <div className="p-4 rounded-2xl bg-card border border-border">
            <div className="text-xs text-muted-foreground mb-2">Group Invite Code</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 font-mono font-bold tracking-widest text-xl">{group.inviteCode}</div>
              <button onClick={copyCode} className="size-9 rounded-xl bg-muted grid place-items-center">
                {copied ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
              </button>
              {user?.role === "admin" && (
                <button
                  onClick={() => regenMutation.mutate()}
                  disabled={regenMutation.isPending}
                  className="size-9 rounded-xl bg-muted grid place-items-center"
                  title="Regenerate code"
                >
                  <RefreshCw className={`size-4 ${regenMutation.isPending ? "animate-spin" : ""}`} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings rows */}
      <div className="px-5 mt-4">
        <div className="rounded-3xl bg-card border border-border overflow-hidden divide-y divide-border">
          {rows.map((r) => {
            const Icon = r.icon;
            return (
              <button key={r.label} className="w-full flex items-center gap-3 p-4 active:bg-muted transition-colors">
                <div className="size-10 rounded-xl bg-muted grid place-items-center">
                  <Icon className="size-4" />
                </div>
                <span className="flex-1 text-left font-medium">{r.label}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Logout */}
      <div className="px-5 mt-4 pb-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-3xl bg-card border border-border text-red-400 font-medium"
        >
          <LogOut className="size-4" /> Log out
        </button>
      </div>

      <div className="text-center text-xs text-muted-foreground mt-2 pb-8">PG Splito · v1.0</div>
    </AppShell>
  );
}
