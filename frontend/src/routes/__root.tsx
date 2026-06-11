import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { QK } from "@/lib/queryKeys";
import appCss from "../styles.css?url";
import { ThemeProvider } from "@/lib/theme";

const PUBLIC_ROUTES = ["/login", "/onboarding"];
const NO_GROUP_ROUTES = ["/onboarding", "/groups", "/discover"];

function hasGroups(user: { groupId?: string | null; groupIds?: string[] } | null): boolean {
  if (!user) return false;
  return !!(user.groupId || (user.groupIds && user.groupIds.length > 0));
}

// ── Animated splash shown only while auth is resolving (no cached user) ──────
function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0d1f2d 0%, #0f1923 45%, #160d28 100%)" }}
    >
      <style>{`
        /* Ambient background pulse */
        @keyframes ambientDrift {
          0%   { transform: translate(0,   0)   scale(1);    opacity: 0.28; }
          50%  { transform: translate(18px,-12px) scale(1.12); opacity: 0.42; }
          100% { transform: translate(0,   0)   scale(1);    opacity: 0.28; }
        }
        @keyframes ambientDrift2 {
          0%   { transform: translate(0,  0)   scale(1);    opacity: 0.18; }
          50%  { transform: translate(-14px,10px) scale(1.09); opacity: 0.32; }
          100% { transform: translate(0,  0)   scale(1);    opacity: 0.18; }
        }

        /* Logo: fade in → scale 0.9 → 1 */
        @keyframes logoIn {
          0%   { opacity: 0; transform: scale(0.72) translateY(16px); }
          55%  { opacity: 1; transform: scale(1.06) translateY(-3px); }
          100% { opacity: 1; transform: scale(1)    translateY(0); }
        }
        /* Glow behind logo */
        @keyframes glowExpand {
          0%   { opacity: 0;    transform: scale(0.6); }
          40%  { opacity: 0.9;  transform: scale(1.3); }
          100% { opacity: 0.55; transform: scale(1.1); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.55; transform: scale(1.1);  }
          50%       { opacity: 0.85; transform: scale(1.28); }
        }
        /* Text fade-up */
        @keyframes textIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* Dots */
        @keyframes dotPop {
          0%, 80%, 100% { transform: scale(0.65); opacity: 0.3; }
          40%            { transform: scale(1.2);  opacity: 1;   }
        }

        .splash-ambient-1 {
          position: absolute;
          top: 20%; left: -10%;
          width: 360px; height: 360px;
          border-radius: 9999px;
          background: oklch(0.72 0.18 155 / 1);
          filter: blur(80px);
          pointer-events: none;
          animation: ambientDrift 6s ease-in-out infinite;
        }
        .splash-ambient-2 {
          position: absolute;
          bottom: 20%; right: -10%;
          width: 300px; height: 300px;
          border-radius: 9999px;
          background: oklch(0.68 0.20 245 / 1);
          filter: blur(70px);
          pointer-events: none;
          animation: ambientDrift2 7s ease-in-out infinite;
        }
        .splash-ambient-3 {
          position: absolute;
          top: 60%; left: 30%;
          width: 200px; height: 200px;
          border-radius: 9999px;
          background: oklch(0.65 0.25 295 / 1);
          filter: blur(60px);
          pointer-events: none;
          animation: ambientDrift 9s ease-in-out infinite reverse;
        }

        .splash-logo-wrap {
          position: relative;
          animation: logoIn 0.65s cubic-bezier(0.16,1,0.3,1) 0.05s both;
        }
        .splash-glow {
          position: absolute;
          inset: -12px;
          border-radius: 36px;
          background: radial-gradient(circle, oklch(0.72 0.18 155 / 0.9) 0%, oklch(0.68 0.20 245 / 0.4) 55%, transparent 100%);
          filter: blur(20px);
          animation: glowExpand 0.7s cubic-bezier(0.16,1,0.3,1) 0.15s both,
                     glowPulse  2.4s ease-in-out 0.85s infinite;
        }
        .splash-logo {
          position: relative;
          width: 96px; height: 96px;
          border-radius: 28px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          z-index: 1;
        }
        .splash-title {
          animation: textIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.38s both;
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #fff;
        }
        .splash-sub {
          animation: textIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.50s both;
          font-size: 0.875rem;
          color: rgba(255,255,255,0.52);
          margin-top: 4px;
          font-weight: 500;
        }
        .splash-dots {
          animation: textIn 0.4s cubic-bezier(0.16,1,0.3,1) 0.62s both;
          display: flex; align-items: center; gap: 8px;
          margin-top: 4px;
        }
        .splash-dot {
          width: 8px; height: 8px;
          border-radius: 9999px;
          animation: dotPop 1.3s ease-in-out infinite;
        }
        .splash-dot:nth-child(1) { animation-delay: 0s;     background: oklch(0.72 0.18 155); }
        .splash-dot:nth-child(2) { animation-delay: 0.2s;   background: oklch(0.68 0.20 245); }
        .splash-dot:nth-child(3) { animation-delay: 0.4s;   background: oklch(0.72 0.18 35);  }
      `}</style>

      {/* Ambient orbs */}
      <div className="splash-ambient-1" />
      <div className="splash-ambient-2" />
      <div className="splash-ambient-3" />

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", position: "relative", zIndex: 1 }}>
        {/* Logo + glow */}
        <div className="splash-logo-wrap">
          <div className="splash-glow" />
          <img
            src="/favicons/android-chrome-192x192.png"
            alt="Splitit"
            className="splash-logo"
          />
        </div>

        {/* Text */}
        <div style={{ textAlign: "center" }}>
          <div className="splash-title">Splitit</div>
          <div className="splash-sub">Split smarter, settle faster</div>
        </div>

        {/* Loading dots */}
        <div className="splash-dots">
          <div className="splash-dot" />
          <div className="splash-dot" />
          <div className="splash-dot" />
        </div>
      </div>
    </div>
  );
}

function AuthGuard({ queryClient }: { queryClient: QueryClient }) {
  const { isAuthenticated, isLoading, user, initialize } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const initCalledRef = useRef(false);

  // Call initialize exactly once — never re-run on re-renders
  useEffect(() => {
    if (!initCalledRef.current) {
      initCalledRef.current = true;
      initialize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

    // Not logged in → send to login (except public pages)
    if (!isAuthenticated && !isPublic) {
      navigate({ to: "/login" });
      return;
    }

    // Logged in and on login page → go to dashboard or onboarding
    if (isAuthenticated && pathname === "/login") {
      // Read fresh user directly from store to avoid stale closure
      const freshUser = useAuth.getState().user;
      navigate({ to: hasGroups(freshUser) ? "/" : "/onboarding" });
      return;
    }

    // Prefetch critical data as soon as auth resolves and user has a group
    // This warms the cache so pages feel instant
    if (isAuthenticated && user?.groupId && queryClient) {
      const gid = user.groupId;
      const prefetch = (key: unknown[], fn: () => Promise<unknown>) =>
        queryClient.prefetchQuery({ queryKey: key, queryFn: fn, staleTime: 2 * 60_000 });

      prefetch(QK.group(gid),           () => import("@/lib/api/endpoints").then(({ groupApi }) => groupApi.current().then(r => r.data.data)));
      prefetch(QK.balances(gid),        () => import("@/lib/api/endpoints").then(({ balanceApi }) => balanceApi.all().then(r => r.data.data)));
      prefetch(QK.expenses(gid),        () => import("@/lib/api/endpoints").then(({ expenseApi }) => expenseApi.list({ limit: 200 }).then(r => r.data.data)));
      prefetch(QK.summaryCategory(gid), () => import("@/lib/api/endpoints").then(({ summaryApi }) => summaryApi.category().then(r => r.data.data)));
    }

    // Logged in, no groups, not on a safe page → onboarding
    if (
      isAuthenticated &&
      !hasGroups(user) &&
      !isPublic &&
      !NO_GROUP_ROUTES.some((r) => pathname.startsWith(r))
    ) {
      navigate({ to: "/onboarding" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, user?.groupId, user?.groupIds?.length, pathname]);

  // Show premium splash only while we're waiting on auth and have no cached user.
  // Returning users (cached user + token) skip this entirely — they go straight to dashboard.
  if (isLoading && !isAuthenticated) {
    return <SplashScreen />;
  }

  // Authenticated user landed on login page — show splash while navigation fires
  // to prevent the login page from flashing before the redirect completes.
  if (isAuthenticated && pathname === "/login") {
    return <SplashScreen />;
  }

  return <Outlet />;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex gap-2 justify-center">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0f1923" },
      { title: "Splitit" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicons/favicon.ico" },
      { rel: "icon", href: "/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { rel: "icon", href: "/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { rel: "apple-touch-icon", href: "/favicons/apple-touch-icon.png" },
      { rel: "manifest", href: "/favicons/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthGuard queryClient={queryClient} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
