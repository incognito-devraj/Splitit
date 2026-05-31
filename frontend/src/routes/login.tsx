import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { ThemeToggle } from "@/lib/theme";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Splitit - Login" }] }),
  component: LoginPage,
});

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      const axiosErr = e as { response?: { data?: { message?: string; success?: boolean } }; message?: string };
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
      <div className="min-h-screen bg-background text-foreground theme-app-bg relative">
        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle />
        </div>
        {/* Two-column on desktop, single column on mobile */}
        <div className="min-h-screen flex flex-col lg:flex-row">

          {/* Left panel — branding (hidden on small screens, shown on lg+) */}
          <div className="hidden lg:flex lg:w-1/2 gradient-balance flex-col items-center justify-center p-12 text-white">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="size-24 rounded-3xl bg-white/20 grid place-items-center text-5xl mb-8 shadow-2xl">🏠</div>
              <h1 className="text-5xl font-bold tracking-tight mb-4">Splitit</h1>
              <p className="text-white/80 text-xl max-w-sm leading-relaxed">
                The smartest way to split expenses with your PG mates.
              </p>
              <div className="mt-10 space-y-4">
                {[
                  { emoji: "💸", text: "Track every shared expense instantly" },
                  { emoji: "⚖️", text: "Auto-calculate who owes what" },
                  { emoji: "✅", text: "Settle up with one tap" },
                  { emoji: "📊", text: "WhatsApp-ready expense reports" },
                ].map((f) => (
                  <div key={f.text} className="flex items-center gap-3">
                    <span className="text-2xl">{f.emoji}</span>
                    <span className="text-white/90 font-medium">{f.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right panel — login form */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-16">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="w-full max-w-sm">

              {/* Mobile logo */}
              <div className="lg:hidden text-center mb-10">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                  className="size-20 rounded-3xl gradient-primary mx-auto grid place-items-center shadow-[var(--shadow-float)] mb-5">
                  <span className="text-4xl">🏠</span>
                </motion.div>
                <h1 className="text-3xl font-bold tracking-tight">Splitit</h1>
                <p className="text-muted-foreground mt-2 text-sm">Split expenses with your PG mates, effortlessly.</p>
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
                  <motion.div key={f.text} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
                    <span className="text-xl">{f.emoji}</span>
                    <span className="text-sm font-medium">{f.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Google Sign-In */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                className="flex flex-col items-center gap-4">

                {loading ? (
                  <div className="h-12 w-full rounded-2xl bg-card border border-border flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Signing in…
                  </div>
                ) : (
                  <div className="w-full flex justify-center">
                    <GoogleLogin
                      onSuccess={handleSuccess}
                      onError={() => setError("Google sign-in was cancelled or failed. Make sure localhost:3000 is added to your Google OAuth authorized origins.")}
                      theme="filled_black"
                      shape="rectangular"
                      size="large"
                      text="continue_with"
                      width="320"
                    />
                  </div>
                )}

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-400 text-center">{error}</p>
                    {error.includes("origin") && (
                      <p className="text-xs text-red-400/70 text-center mt-1">
                        Go to Google Cloud Console → OAuth Client → Add <code className="bg-red-500/10 px-1 rounded">http://localhost:3000</code> to Authorized JavaScript Origins
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
      </div>
    </GoogleOAuthProvider>
  );
}
