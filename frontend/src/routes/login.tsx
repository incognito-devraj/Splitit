import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login · PG Split" }] }),
  component: LoginPage,
});

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    setLoading(true);
    setError("");
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate({ to: "/" });
    } catch (e: unknown) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="dark min-h-screen bg-background text-foreground gradient-mesh-bg flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Logo / Brand */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
              className="size-20 rounded-3xl gradient-primary mx-auto grid place-items-center shadow-[var(--shadow-float)] mb-5"
            >
              <span className="text-4xl">🏠</span>
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight">PG Splito</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Split expenses with your PG mates, effortlessly.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-10">
            {[
              { emoji: "💸", text: "Track shared expenses instantly" },
              { emoji: "⚖️", text: "Auto-calculate who owes what" },
              { emoji: "✅", text: "Settle up with one tap" },
            ].map((f, i) => (
              <motion.div
                key={f.text}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
              >
                <span className="text-xl">{f.emoji}</span>
                <span className="text-sm font-medium">{f.text}</span>
              </motion.div>
            ))}
          </div>

          {/* Google Sign-In */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex flex-col items-center gap-3"
          >
            {loading ? (
              <div className="h-12 w-full rounded-2xl bg-card border border-border flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Signing in…
              </div>
            ) : (
              <div className="w-full flex justify-center">
                <GoogleLogin
                  onSuccess={handleSuccess}
                  onError={() => setError("Google sign-in failed. Please try again.")}
                  theme="filled_black"
                  shape="rectangular"
                  size="large"
                  text="continue_with"
                  width="320"
                />
              </div>
            )}

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-red-400 text-center"
              >
                {error}
              </motion.p>
            )}

            <p className="text-xs text-muted-foreground text-center mt-2">
              By continuing, you agree to our Terms of Service
            </p>
          </motion.div>
        </motion.div>
      </div>
    </GoogleOAuthProvider>
  );
}
