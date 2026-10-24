import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // any request that starts with /api is forwarded to the Express server
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
});