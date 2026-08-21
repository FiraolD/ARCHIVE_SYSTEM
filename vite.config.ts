import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import checker from "vite-plugin-checker";

import dns from "node:dns";

dns.setDefaultResultOrder("verbatim");

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    checker({
      typescript: true,
    }),
  ],
  server: {
    // allow overriding via environment (cross-env or .env)
    port: parseInt(process.env.PORT || "", 10) || 3009,
    host: true,
    allowedHosts: true,
  },
  preview: {
    // preview should stay on 3009 by default but also use env if provided
    port: parseInt(process.env.PORT || "", 10) || 3009,
    host: true,
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
