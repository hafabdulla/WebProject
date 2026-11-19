import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // any request that starts with /api is forwarded to the Express server
    proxy: {
      "/api": "http://localhost:5000",
      // the live connection for chat and notifications (ws: true allows WebSockets)
      "/socket.io": { target: "http://localhost:5000", ws: true },
    },
  },
});