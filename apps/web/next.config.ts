import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

// Adónde manda Next las llamadas a /api. Así la web y el API comparten origen (sin CORS y
// con cookies de primera parte); en producción el proxy hace lo mismo antes de llegar acá.
const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:3001";

// Polling del watcher, solo si el hot reload no ve los cambios (Docker en Windows con el
// repo fuera de WSL). Next lo desaconseja salvo como último recurso: consume bastante CPU.
const pollIntervalMs = Number(process.env.WATCH_POLL_MS) || undefined;

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  ...(pollIntervalMs && { watchOptions: { pollIntervalMs } }),
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default withSerwist(nextConfig);
