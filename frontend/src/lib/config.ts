const localhostApi = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api\/?$/;

function requiredPublicEnv(name: string): string {
  const value = import.meta.env[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function apiUrl(): string {
  const value = import.meta.env.VITE_API_URL;

  if (typeof value !== "string" || value.trim() === "") {
    if (import.meta.env.DEV) return "http://localhost:5000/api";
    throw new Error("VITE_API_URL is required in production");
  }

  const normalized = value.trim().replace(/\/$/, "");

  try {
    new URL(normalized);
  } catch {
    throw new Error("VITE_API_URL must be a valid URL");
  }

  if (import.meta.env.PROD && localhostApi.test(normalized)) {
    throw new Error("VITE_API_URL must point to the deployed backend in production");
  }

  return normalized;
}

function googleClientId(): string {
  const value = requiredPublicEnv("VITE_GOOGLE_CLIENT_ID");
  if (!value.endsWith(".apps.googleusercontent.com")) {
    throw new Error("VITE_GOOGLE_CLIENT_ID must be a Google OAuth client ID");
  }
  return value;
}

export const publicConfig = {
  apiUrl: apiUrl(),
  googleClientId: googleClientId(),
};
