import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (err, req) => {
            const timestamp = new Date().toISOString();
            const method = req.method ?? "???";
            const url = req.url ?? "???";
            console.error(
              `\x1b[31m${timestamp} PROXY ERROR\x1b[0m ${method} ${url} → http://localhost:3001`
            );
            console.error(
              `  \x1b[2m${err.message}\x1b[0m`
            );
            if ((err as NodeJS.ErrnoException).code === "ECONNREFUSED") {
              console.error(
                "  \x1b[33m↳ Is the API server running? Start it with: bun run dev (in apps/api)\x1b[0m"
              );
            }
          });
          proxy.on("proxyReq", (_proxyReq, req) => {
            console.log(
              `\x1b[2m${new Date().toISOString()}\x1b[0m \x1b[36mPROXY\x1b[0m ${req.method} ${req.url} → http://localhost:3001`
            );
          });
        },
      },
    },
  },
});
