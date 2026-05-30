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
        try {
          // Always fetch fresh user data from /me on app start
          const { data } = await authApi.me();
          const freshUser = data.data;
          // Sync tokens from localStorage
          const storedRefresh = localStorage.getItem("refreshToken");
          set({
            user: freshUser,
            accessToken: token,
            refreshToken: storedRefresh,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
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
          state.isLoading = true;
          state.isAuthenticated = !!state.accessToken;
        }
      },
    },
  ),
);
