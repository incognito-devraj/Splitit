import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronRight, Bell, Moon, HelpCircle, Shield, LogOut, Copy, Check, Users } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { groupApi } from "@/lib/api/endpoints";
import { QK } from "@/lib/queryKeys";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Splitit - Settings" }] }),
  component: Settings,
});

function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const activeGroupId = user?.groupId ?? null;

  const { data: group } = useQuery({
    queryKey: QK.group(activeGroupId),
    queryFn: () => groupApi.current().then((r) => r.data.data),
    enabled: !!activeGroupId,
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
    { icon: Bell,        label: "Notifications" },
    { icon: Moon,        label: "Appearance" },
    { icon: Shield,      label: "Privacy" },
    { icon: HelpCircle,  label: "Help & Support" },
  ];

  return (
    <AppShell>
      <div className="px-4 sm:px-6 pt-6">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      </div>

      {/* Profile card */}
      <div className="px-4 sm:px-6 mt-6">
        <motion.div whileHover={{ y: -3, scale: 1.01 }} className="p-5 rounded-3xl gradient-balance text-white shadow-[var(--shadow-card)] flex items-center gap-4 transition-shadow hover:shadow-[0_24px_60px_rgba(0,128,170,0.28)]">
          <div className="size-16 rounded-full bg-white/25 overflow-hidden grid place-items-center shrink-0">
            {user?.avatar
              ? <img src={user.avatar} alt={user.name} className="size-full object-cover" />
              : <span className="text-3xl">👤</span>}
          </div>
          <div className="min-w-0">
            <div className="text-xl font-semibold truncate">{user?.name ?? "—"}</div>
            <div className="text-sm text-white/80 truncate">
              {group?.name ?? "No group"} · {user?.role === "admin" ? "Admin" : "Member"}
            </div>
            <div className="text-xs text-white/60 mt-0.5 truncate">{user?.email}</div>
          </div>
        </motion.div>
      </div>

      {/* Group section */}
      {group && (
        <div className="px-4 sm:px-6 mt-4 space-y-2">
          {/* Members link */}
          <Link to="/members"
            className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border transition-all hover:translate-x-1 hover:border-primary/30 hover:bg-primary/5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.10)]">
            <div className="size-10 rounded-xl bg-muted grid place-items-center">
              <Users className="size-4" />
            </div>
            <div className="flex-1">
              <div className="font-medium">Members</div>
              <div className="text-xs text-muted-foreground">
                {(group.members as { _id?: string }[])?.length ?? 0} people in {group.name}
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>

          {/* Invite code — permanent, copy only */}
          <div className="p-4 rounded-2xl bg-card border border-border transition-all hover:border-primary/30 hover:shadow-[0_12px_28px_rgba(0,0,0,0.10)]">
            <div className="text-xs text-muted-foreground mb-2">Group Invite Code</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 font-mono font-bold tracking-[0.25em] text-xl">{group.inviteCode}</div>
              <button onClick={copyCode} className="size-9 rounded-xl bg-muted grid place-items-center transition-all hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary">
                {copied ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Share this code with people you want to invite. It never changes.
            </p>
          </div>
        </div>
      )}

      {/* Settings rows */}
      <div className="px-4 sm:px-6 mt-4">
        <div className="rounded-3xl bg-card border border-border overflow-hidden divide-y divide-border">
          {rows.map((r) => {
            const Icon = r.icon;
            return (
              <button key={r.label} className="group w-full flex items-center gap-3 p-4 active:bg-muted transition-all hover:bg-primary/5 hover:translate-x-1">
                <div className="size-10 rounded-xl bg-muted grid place-items-center transition-colors group-hover:bg-primary/10 group-hover:text-primary">
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
      <div className="px-4 sm:px-6 mt-4 pb-4">
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-3xl bg-card border border-border text-red-400 font-medium transition-all hover:-translate-y-0.5 hover:border-red-400/30 hover:bg-red-500/10">
          <LogOut className="size-4" /> Log out
        </button>
      </div>

      <div className="text-center text-xs text-muted-foreground mt-2 pb-8">Splitit · v1.0</div>
    </AppShell>
  );
}
