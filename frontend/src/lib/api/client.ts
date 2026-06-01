import axios from "axios";

const BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");

export const api = axios.create({
  baseURL: BASE,
  headers: {
    "Content-Type": "application/json",
    // NOTE: Do NOT set Cache-Control / Pragma here.
    // Custom headers on every request trigger a CORS preflight, and older
    // proxy/CDN layers may reject them. Cache busting is handled server-side
    // (etag disabled, no-store on auth routes).
  },
  timeout: 15000,
});

// ── Attach access token to every request ─────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auto-refresh on 401 ───────────────────────────────────────────────────────
let refreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }
    original._retry = true;

    if (refreshing) {
      return new Promise((resolve) => {
        queue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    refreshing = true;
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) throw new Error("No refresh token");

      const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken });
      const newAccess = data.data.accessToken;
      const newRefresh = data.data.refreshToken;

      localStorage.setItem("accessToken", newAccess);
      localStorage.setItem("refreshToken", newRefresh);

      queue.forEach((cb) => cb(newAccess));
      queue = [];

      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
      return Promise.reject(err);
    } finally {
      refreshing = false;
    }
  },
);
