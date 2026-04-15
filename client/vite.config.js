import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      axios: path.resolve(__dirname, "./src/lib/axios.js"),
    },
  },
  server: {
    // Proxy /api requests to the local Express server in development.
    // This is only active when running `vite dev` — production builds
    // use VITE_API_BASE_URL (set in your deployment environment).
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
