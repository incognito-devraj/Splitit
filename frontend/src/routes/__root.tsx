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
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import appCss from "../styles.css?url";
import { ThemeProvider } from "@/lib/theme";

const PUBLIC_ROUTES = ["/login", "/onboarding"];
const NO_GROUP_ROUTES = ["/onboarding", "/groups"];

function AuthGuard() {
  const { isAuthenticated, isLoading, user, initialize } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

    if (!isAuthenticated && !isPublic) {
      navigate({ to: "/login" });
      return;
    }
    if (isAuthenticated && pathname === "/login") {
      const hasAnyGroup = !!(user?.groupId || (user?.groupIds && user.groupIds.length > 0));
      navigate({ to: hasAnyGroup ? "/" : "/onboarding" });
      return;
    }
    // Only redirect to onboarding if user has no groups at all
    const hasAnyGroup = !!(user?.groupId || (user?.groupIds && user.groupIds.length > 0));
    if (isAuthenticated && !hasAnyGroup && !isPublic && !NO_GROUP_ROUTES.some((r) => pathname.startsWith(r))) {
      navigate({ to: "/onboarding" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, user?.groupId, pathname]);

  // Only show the splash/loading screen if we have NO cached user at all.
  // If we have a persisted user, isAuthenticated is already true and we render
  // the app immediately — the background /me refresh is silent.
  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f1923] flex items-center justify-center overflow-hidden">
        <style>{`
          @keyframes splashLogoIn {
            0%   { opacity: 0; transform: scale(0.6) translateY(20px); }
            60%  { opacity: 1; transform: scale(1.08) translateY(-4px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes splashTextIn {
            from { opacity: 0; transform: translateY(14px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes glowPulse {
            0%, 100% { opacity: 0.5; transform: scale(1.1); }
            50%       { opacity: 0.85; transform: scale(1.28); }
          }
          @keyframes dotBounce {
            0%, 80%, 100% { transform: scale(0.7); opacity: 0.35; }
            40%            { transform: scale(1.15); opacity: 1; }
          }
          .splash-logo  { animation: splashLogoIn 0.7s cubic-bezier(0.16,1,0.3,1) both; }
          .splash-text  { animation: splashTextIn 0.55s 0.35s cubic-bezier(0.16,1,0.3,1) both; opacity: 0; }
          .splash-sub   { animation: splashTextIn 0.55s 0.48s cubic-bezier(0.16,1,0.3,1) both; opacity: 0; }
          .splash-glow  { animation: glowPulse 2.2s 0.2s ease-in-out infinite; }
          .splash-dot   { animation: dotBounce 1.2s ease-in-out infinite; }
          .splash-dot:nth-child(2) { animation-delay: 0.18s; }
          .splash-dot:nth-child(3) { animation-delay: 0.36s; }
        `}</style>

        <div className="flex flex-col items-center gap-5">
          {/* Logo + glow */}
          <div className="relative">
            <div
              className="absolute inset-0 rounded-[32px] splash-glow"
              style={{
                background: "radial-gradient(circle, oklch(0.72 0.18 155 / 0.7) 0%, oklch(0.68 0.20 245 / 0.4) 60%, transparent 100%)",
                filter: "blur(22px)",
              }}
            />
            <img
              src="/favicons/android-chrome-192x192.png"
              alt="Splitit"
              className="splash-logo relative size-24 rounded-[28px] shadow-[0_16px_48px_rgba(0,0,0,0.45)]"
              style={{ zIndex: 1 }}
            />
          </div>

          {/* App name */}
          <div className="text-center">
            <div className="splash-text text-3xl font-extrabold tracking-tight text-white">
              Splitit
            </div>
            <div className="splash-sub text-sm text-white/55 mt-1 font-medium">
              Split smarter, settle faster
            </div>
          </div>

          {/* Animated dots */}
          <div className="flex items-center gap-2 mt-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`splash-dot size-2 rounded-full`}
                style={{
                  background: i === 0
                    ? "oklch(0.72 0.18 155)"
                    : i === 1
                    ? "oklch(0.68 0.20 245)"
                    : "oklch(0.72 0.18 35)",
                  animationDelay: `${i * 0.18}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
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
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
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
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Try again
          </button>
          <a href="/" className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground">
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
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthGuard />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
