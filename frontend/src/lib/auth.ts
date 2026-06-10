import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi, ApiUser } from "./api/endpoints";

interface AuthState {
  user: ApiUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: ApiUser) => void;
  initialize: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      loginWithGoogle: async (idToken: string) => {
        const { data } = await authApi.googleLogin(idToken);
        const { user, accessToken, refreshToken } = data.data;

        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);

        set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) await authApi.logout(refreshToken);
        } catch { /* ignore */ }
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
      },

      setUser: (user: ApiUser) => set({ user }),

      initialize: async () => {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        // ── Optimistic unlock: if we already have a persisted user + token,
        //    mark as authenticated immediately so the dashboard shows at once.
        //    Then silently refresh user data in the background.
        const { user: persistedUser } = get();
        if (persistedUser) {
          set({ isAuthenticated: true, isLoading: false });
        }

        // Background refresh with a 6-second timeout so a slow/offline
        // server never blocks the app indefinitely.
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 6000)
          );
          const { data } = await Promise.race([authApi.me(), timeoutPromise]);
          const freshUser = data.data;
          const storedRefresh = localStorage.getItem("refreshToken");

          // Preserve groupIds from cached user if the fresh response omits them.
          // This prevents a race where /me returns before groups are fully loaded,
          // causing hasAnyGroup to flip false and triggering an onboarding redirect.
          const cachedUser = get().user;
          const mergedGroupIds =
            (freshUser.groupIds && freshUser.groupIds.length > 0)
              ? freshUser.groupIds
              : (cachedUser?.groupIds && cachedUser.groupIds.length > 0)
                ? cachedUser.groupIds
                : freshUser.groupIds;

          const mergedUser: typeof freshUser = {
            ...freshUser,
            groupIds: mergedGroupIds,
            // Prefer fresh groupId but fall back to cached if fresh is null
            groupId: freshUser.groupId ?? cachedUser?.groupId ?? null,
          };

          set({
            user: mergedUser,
            accessToken: token,
            refreshToken: storedRefresh,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err: unknown) {
          const isTimeout = err instanceof Error && err.message === "timeout";
          if (isTimeout) {
            // Network is slow — stay logged in with cached data, don't disrupt the user
            set({ isLoading: false });
            return;
          }
          // Token is genuinely invalid — clear and force re-login
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: "splito-auth",
      // Only persist tokens — user data is always refreshed from server
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
      }),
      // On rehydration, mark as loading so initialize() runs
      onRehydrateStorage: () => (state) => {
        if (state) {
          // If we have a persisted user + token, optimistically mark authenticated
          // so AuthGuard can render the app immediately
          state.isLoading = true;
          state.isAuthenticated = !!(state.accessToken && state.user);
        }
      },
    },
  ),
);
