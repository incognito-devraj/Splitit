import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { publicConfig } from "@/lib/config";
import { ArrowRight, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Splitit – Sign In" }] }),
  component: LoginPage,
});

const GOOGLE_CLIENT_ID = publicConfig.googleClientId;

// ─── Animated splash for unauthenticated users only ──────────────────────────
function LoginSplash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    // Session check runs in parallel — navigate as soon as splash finishes.
    // 1200ms feels premium without feeling slow.
    const t = setTimeout(onDone, 1200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(160deg, #0d1f2d 0%, #0f1923 45%, #160d28 100%)" }}
    >
      {/* Ambient orbs */}
      <motion.div
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 0.32, scale: 1 }}
        transition={{ duration: 1.6, ease: "easeOut" }}
        className="absolute top-1/4 -left-16 size-72 rounded-full blur-3xl pointer-events-none"
        style={{ background: "oklch(0.72 0.18 155)" }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 0.22, scale: 1 }}
        transition={{ duration: 1.8, delay: 0.15, ease: "easeOut" }}
        className="absolute bottom-1/4 -right-16 size-60 rounded-full blur-3xl pointer-events-none"
        style={{ background: "oklch(0.68 0.20 245)" }}
      />

      <div className="flex flex-col items-center gap-5 relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 18 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.08 }}
          className="relative"
        >
          {/* Glow ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 0.8, 0.5], scale: [0.6, 1.3, 1.1] }}
            transition={{ duration: 0.8, delay: 0.2, times: [0, 0.5, 1] }}
            className="absolute inset-[-12px] rounded-[36px] blur-[18px] pointer-events-none"
            style={{ background: "radial-gradient(circle, oklch(0.72 0.18 155 / 0.85) 0%, oklch(0.68 0.20 245 / 0.4) 60%, transparent 100%)" }}
          />
          <img
            src="/favicons/android-chrome-192x192.png"
            alt="Splitit"
            className="relative size-28 rounded-[28px] shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
            style={{ zIndex: 1 }}
          />
        </motion.div>

        {/* Title + tagline */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <h1 className="text-5xl font-extrabold text-white tracking-tight">Splitit</h1>
          <p className="text-white/55 text-sm mt-2 font-medium">Split smarter, settle faster</p>
        </motion.div>

        {/* Dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="flex items-center gap-2"
        >
          {[
            "oklch(0.72 0.18 155)",
            "rgba(255,255,255,0.75)",
            "oklch(0.68 0.20 245)",
          ].map((color, i) => (
            <motion.div
              key={i}
              className="size-2 rounded-full"
              style={{ background: color }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.7, 1.25, 0.7] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Feature card component ───────────────────────────────────────────────────
function FeatureCard({
  icon,
  text,
  delay,
  visible,
}: {
  icon: string;
  text: string;
  delay: number;
  visible: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 20 }}
      transition={{ duration: 0.42, delay, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-sm"
    >
      <span className="text-xl shrink-0">{icon}</span>
      <span className="text-sm font-medium text-foreground">{text}</span>
    </motion.div>
  );
}

// ─── Main login page ──────────────────────────────────────────────────────────
function LoginPage() {
  const { loginWithGoogle, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Show splash only for unauthenticated users
  const [showSplash, setShowSplash] = useState(!isAuthenticated);
  const [contentVisible, setContentVisible] = useState(false);

  // Redirect immediately if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const hasAnyGroup = !!(user?.groupId || (user?.groupIds && user.groupIds.length > 0));
      navigate({ to: hasAnyGroup ? "/" : "/onboarding" });
    }
  }, [isAuthenticated, user, navigate]);

  // Reveal content after splash exits
  useEffect(() => {
    if (!showSplash) {
      // Small delay to let AnimatePresence exit animation finish
      const t = setTimeout(() => setContentVisible(true), 60);
      return () => clearTimeout(t);
    }
  }, [showSplash]);

  const handleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError("No credential received from Google. Please try again.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await loginWithGoogle(credentialResponse.credential);
      const hasAnyGroup = !!(user?.groupId || (user?.groupIds && user.groupIds.length > 0));
      navigate({ to: hasAnyGroup ? "/" : "/onboarding" });
    } catch (e: unknown) {
      console.error("Login error:", e);
      const axiosErr = e as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        axiosErr?.response?.data?.message ??
        axiosErr?.message ??
        "Login failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const FEATURES = [
    { icon: "✓", text: "Track shared expenses instantly" },
    { icon: "✓", text: "Auto-calculate who owes what" },
    { icon: "✓", text: "Settle up in one tap" },
  ];

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {/* Splash — only for unauthenticated visitors */}
      <AnimatePresence>
        {showSplash && <LoginSplash onDone={() => setShowSplash(false)} />}
      </AnimatePresence>

      {/* ── Main login UI ── */}
      <div className="min-h-screen bg-background text-foreground theme-app-bg flex flex-col lg:flex-row">

        {/* ── Desktop left branding panel ── */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: contentVisible ? 1 : 0, x: contentVisible ? 0 : -24 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="hidden lg:flex lg:w-[46%] xl:w-[42%] gradient-balance flex-col items-center justify-center p-12 text-white"
        >
          <div className="max-w-sm w-full">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: contentVisible ? 1 : 0.8, opacity: contentVisible ? 1 : 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 20, delay: 0.1 }}
              className="mb-7"
            >
              <img
                src="/favicons/android-chrome-192x192.png"
                alt="Splitit"
                className="size-24 rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,.30)]"
              />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: contentVisible ? 1 : 0, y: contentVisible ? 0 : 16 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="text-5xl font-extrabold tracking-tight mb-3"
            >
              Splitit
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: contentVisible ? 1 : 0, y: contentVisible ? 0 : 12 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="text-white/80 text-lg leading-relaxed mb-9"
            >
              Split expenses with friends, roommates & PG mates.
            </motion.p>

            {/* Feature list */}
            <div className="space-y-3">
              {[
                { icon: "💸", text: "Track every shared expense instantly" },
                { icon: "⚖️", text: "Auto-calculate who owes what" },
                { icon: "✅", text: "Settle up with one tap" },
                { icon: "📊", text: "WhatsApp-ready expense reports" },
              ].map((f, i) => (
                <motion.div
                  key={f.text}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: contentVisible ? 1 : 0, x: contentVisible ? 0 : -14 }}
                  transition={{ duration: 0.42, delay: 0.3 + i * 0.08 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-2xl">{f.icon}</span>
                  <span className="text-white/90 font-medium">{f.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Right / mobile login panel ── */}
        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-10 lg:py-0">
          <div className="w-full max-w-[340px]">

            {/* Mobile logo + title */}
            <div className="lg:hidden text-center mb-7">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: contentVisible ? 1 : 0.6, opacity: contentVisible ? 1 : 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.06 }}
                className="mx-auto mb-4 w-fit"
              >
                <img
                  src="/favicons/android-chrome-192x192.png"
                  alt="Splitit"
                  className="size-[72px] rounded-[22px] shadow-[0_12px_36px_rgba(0,0,0,.18)]"
                />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: contentVisible ? 1 : 0, y: contentVisible ? 0 : 10 }}
                transition={{ duration: 0.42, delay: 0.14 }}
                className="text-3xl font-extrabold tracking-tight"
              >
                Splitit
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: contentVisible ? 1 : 0, y: contentVisible ? 0 : 8 }}
                transition={{ duration: 0.42, delay: 0.2 }}
                className="text-muted-foreground mt-1.5 text-sm leading-snug"
              >
                Split expenses with friends,<br />roommates &amp; PG mates.
              </motion.p>
            </div>

            {/* Desktop heading */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: contentVisible ? 1 : 0, y: contentVisible ? 0 : 14 }}
              transition={{ duration: 0.45, delay: 0.06 }}
              className="hidden lg:block mb-7"
            >
              <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
              <p className="text-muted-foreground mt-1.5">Sign in to continue to your group</p>
            </motion.div>

            {/* Mobile feature cards */}
            <div className="lg:hidden space-y-2.5 mb-6">
              {FEATURES.map((f, i) => (
                <FeatureCard
                  key={f.text}
                  icon={f.icon}
                  text={f.text}
                  delay={0.22 + i * 0.07}
                  visible={contentVisible}
                />
              ))}
            </div>

            {/* Auth section */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: contentVisible ? 1 : 0, y: contentVisible ? 0 : 12 }}
              transition={{ duration: 0.42, delay: 0.42 }}
              className="flex flex-col items-center gap-3"
            >
              {/* Smart "Continue as" card — known user, not yet authenticated */}
              <AnimatePresence>
                {user && !isAuthenticated && (
                  <motion.button
                    key="continue-as"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => navigate({ to: "/" })}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-primary/10 border border-primary/30 hover:bg-primary/18 active:scale-[0.98] transition-all group"
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="size-10 rounded-full shrink-0 ring-2 ring-primary/20"
                      />
                    ) : (
                      <div className="size-10 rounded-full bg-primary/20 grid place-items-center text-primary font-semibold text-sm shrink-0">
                        {user.name?.charAt(0) ?? "?"}
                      </div>
                    )}
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-semibold truncate">{user.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-xs text-primary font-semibold">
                      Continue
                      <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Google sign-in */}
              {loading ? (
                <div className="h-11 w-full rounded-2xl bg-card border border-border flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: contentVisible ? 1 : 0, scale: contentVisible ? 1 : 0.94 }}
                  transition={{ duration: 0.38, delay: 0.5 }}
                  className="w-full flex justify-center"
                >
                  <GoogleLogin
                    onSuccess={handleSuccess}
                    onError={() =>
                      setError(
                        "Google sign-in was cancelled or failed. Make sure this app origin is added to your Google OAuth authorized origins."
                      )
                    }
                    theme="filled_black"
                    shape="rectangular"
                    size="large"
                    text={user && !isAuthenticated ? "signin_with" : "continue_with"}
                    width="320"
                  />
                </motion.div>
              )}

              {/* "Use another account" link when known user is present */}
              <AnimatePresence>
                {user && !isAuthenticated && !loading && (
                  <motion.button
                    key="use-another"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.1 }}
                    onClick={() => {/* GoogleLogin button handles this */}}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw className="size-3" />
                    Use another account
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Error state */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                  >
                    <p className="text-sm text-red-400 text-center">{error}</p>
                    {error.includes("origin") && (
                      <p className="text-xs text-red-400/70 text-center mt-1">
                        Add the current app URL to Google Cloud Console OAuth Authorized JavaScript origins.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: contentVisible ? 1 : 0 }}
                transition={{ delay: 0.58 }}
                className="text-xs text-muted-foreground text-center"
              >
                By continuing, you agree to our Terms of Service
              </motion.p>
            </motion.div>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
