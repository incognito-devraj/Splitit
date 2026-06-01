import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    // Nitro handles the server build and targets the Vercel Node runtime.
    // It generates .vercel/output automatically — no custom vercel.json needed.
    nitro({ preset: "vercel" }),
    tanstackStart(),
    react(),
    tsconfigPaths(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    strictPort: false,
  },
});
