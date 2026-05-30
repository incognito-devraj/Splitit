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

        // Store in localStorage for axios interceptor
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);

        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) await authApi.logout(refreshToken);
        } catch { /* ignore */ }
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      setUser: (user: ApiUser) => set({ user }),

      initialize: async () => {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }
        try {
          const { data } = await authApi.me();
          localStorage.setItem("accessToken", token);
          set({ user: data.data, isAuthenticated: true, isLoading: false });
        } catch {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: "splito-auth",
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user }),
    },
  ),
);
