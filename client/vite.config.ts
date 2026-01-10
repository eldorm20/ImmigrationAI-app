import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";
// Replit plugins removed - not needed for local development
// import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "../vite-plugin-meta-images";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    // runtimeErrorOverlay(), // Replit-specific, removed for local dev
    tailwindcss(),
    metaImagesPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "..", "shared"),
      "@assets": path.resolve(__dirname, "..", "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    port: 5173, // Different port from backend (5000)
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "http://localhost:5000",
        changeOrigin: true,
        ws: true, // WebSocket support
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
