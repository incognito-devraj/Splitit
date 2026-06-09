import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/lib/theme";
import { publicConfig } from "@/lib/config";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Splitit - Login" }] }),
  component: LoginPage,
});

const GOOGLE_CLIENT_ID = publicConfig.googleClientId;

// ─── Splash screen — only shown to first-time / logged-out users ──────────────
function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.06 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-7 overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f3443 0%, #0d1b2a 40%, #1a0533 100%)" }}
    >
      {/* Background orbs */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 0.35, scale: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        className="absolute top-1/4 -left-20 size-72 rounded-full blur-3xl pointer-events-none"
        style={{ background: "oklch(0.72 0.18 155)" }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 0.25, scale: 1 }}
        transition={{ duration: 1.6, delay: 0.2, ease: "easeOut" }}
        className="absolute bottom-1/4 -right-20 size-64 rounded-full blur-3xl pointer-events-none"
        style={{ background: "oklch(0.68 0.20 245)" }}
      />

      {/* Logo */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 18, delay: 0.1 }}
        className="relative"
      >
        {/* Pulsing glow ring */}
        <motion.div
          animate={{ scale: [1.1, 1.35, 1.1], opacity: [0.5, 0.15, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-[32px] blur-2xl pointer-events-none"
          style={{ background: "oklch(0.72 0.18 155 / 0.8)" }}
        />
        <img
          src="/favicons/android-chrome-192x192.png"
          alt="Splitit"
          className="relative size-28 rounded-[28px] shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
          style={{ zIndex: 1 }}
        />
      </motion.div>

      {/* App name + tagline */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="text-center"
      >
        <h1 className="text-5xl font-extrabold text-white tracking-tight">Splitit</h1>
        <p className="text-white/60 text-base mt-2 font-medium">
          Split expenses with your PG mates
        </p>
      </motion.div>

      {/* Animated dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex items-center gap-2"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="size-2 rounded-full"
            style={{
              background: i === 0
                ? "oklch(0.72 0.18 155)"
                : i === 1 ? "white" : "oklch(0.68 0.20 245)",
            }}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.7, 1.25, 0.7] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}

// ─── Main login page ──────────────────────────────────────────────────────────
function LoginPage() {
  const { loginWithGoogle, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Skip splash if already authenticated (returning user who somehow landed here)
  const [showSplash, setShowSplash] = useState(!isAuthenticated);

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (isAuthenticated) {
      const hasAnyGroup = !!(user?.groupId || (user?.groupIds && user.groupIds.length > 0));
      navigate({ to: hasAnyGroup ? "/" : "/onboarding" });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError("No credential received from Google. Please try again.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate({ to: "/" });
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

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {/* Splash — only for first-time / logged-out users */}
      <AnimatePresence>
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      </AnimatePresence>

      {/* Login UI — fades in after splash */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showSplash ? 0 : 1 }}
        transition={{ duration: 0.45 }}
        className="min-h-screen bg-background text-foreground theme-app-bg relative"
      >
        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle />
        </div>

        <div className="min-h-screen flex flex-col lg:flex-row">

          {/* Left panel — desktop branding */}
          <div className="hidden lg:flex lg:w-1/2 gradient-balance flex-col items-center justify-center p-12 text-white">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: showSplash ? 0 : 1, y: showSplash ? 30 : 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="mb-8">
                <img
                  src="/favicons/android-chrome-192x192.png"
                  alt="Splitit"
                  className="size-24 rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,.25)]"
                />
              </div>
              <h1 className="text-5xl font-extrabold tracking-tight mb-4">Splitit</h1>
              <p className="text-white/80 text-xl max-w-sm leading-relaxed">
                The smartest way to split expenses with your PG mates.
              </p>
              <div className="mt-10 space-y-4">
                {[
                  { emoji: "💸", text: "Track every shared expense instantly" },
                  { emoji: "⚖️", text: "Auto-calculate who owes what" },
                  { emoji: "✅", text: "Settle up with one tap" },
                  { emoji: "📊", text: "WhatsApp-ready expense reports" },
                ].map((f, i) => (
                  <motion.div
                    key={f.text}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: showSplash ? 0 : 1, x: showSplash ? -16 : 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="flex items-center gap-3"
                  >
                    <span className="text-2xl">{f.emoji}</span>
                    <span className="text-white/90 font-medium">{f.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right panel — login form */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: showSplash ? 0 : 1, y: showSplash ? 24 : 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="w-full max-w-sm"
            >
              {/* Mobile logo */}
              <div className="lg:hidden text-center mb-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: showSplash ? 0 : 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
                  className="mx-auto mb-5 w-fit"
                >
                  <img
                    src="/favicons/android-chrome-192x192.png"
                    alt="Splitit"
                    className="size-20 rounded-[22px] shadow-[0_12px_40px_rgba(0,0,0,.18)]"
                  />
                </motion.div>
                <h1 className="text-3xl font-extrabold tracking-tight">Splitit</h1>
                <p className="text-muted-foreground mt-2 text-sm">
                  Split expenses with your PG mates, effortlessly.
                </p>
              </div>

              {/* Desktop heading */}
              <div className="hidden lg:block mb-8">
                <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
                <p className="text-muted-foreground mt-2">Sign in to continue to your PG group</p>
              </div>

              {/* Mobile feature list */}
              <div className="lg:hidden space-y-3 mb-8">
                {[
                  { emoji: "💸", text: "Track shared expenses instantly" },
                  { emoji: "⚖️", text: "Auto-calculate who owes what" },
                  { emoji: "✅", text: "Settle up with one tap" },
                ].map((f, i) => (
                  <motion.div
                    key={f.text}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: showSplash ? 0 : 1, x: showSplash ? -16 : 0 }}
                    transition={{ delay: 0.25 + i * 0.08 }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
                  >
                    <span className="text-xl">{f.emoji}</span>
                    <span className="text-sm font-medium">{f.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Sign-in section */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: showSplash ? 0 : 1, y: showSplash ? 12 : 0 }}
                transition={{ delay: 0.45 }}
                className="flex flex-col items-center gap-4"
              >
                {/* "Continue as" card — shown when user is cached but not yet redirected */}
                {user && !isAuthenticated && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    onClick={() => navigate({ to: "/" })}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-primary/10 border border-primary/30 hover:bg-primary/15 transition-colors group"
                  >
                    {user.avatar && (
                      <img src={user.avatar} alt={user.name} className="size-10 rounded-full shrink-0" />
                    )}
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-semibold truncate">{user.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-xs text-primary font-semibold">
                      Continue <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </motion.button>
                )}

                {loading ? (
                  <div className="h-12 w-full rounded-2xl bg-card border border-border flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Signing in…
                  </div>
                ) : (
                  <div className="w-full flex justify-center">
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
                      text="continue_with"
                      width="320"
                    />
                  </div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
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

                <p className="text-xs text-muted-foreground text-center">
                  By continuing, you agree to our Terms of Service
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </GoogleOAuthProvider>
  );
}
