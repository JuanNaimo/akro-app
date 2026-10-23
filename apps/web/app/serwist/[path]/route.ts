import { createSerwistRoute } from "@serwist/turbopack";
import { spawnSync } from "node:child_process";

// Revisión de la página offline precacheada: el commit actual, o un valor al azar si no hay
// git a mano (por ejemplo, dentro de Docker).
const git = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" });
const revision = (git.status === 0 && git.stdout.trim()) || crypto.randomUUID();

// Con cacheComponents, Next no acepta dynamic, dynamicParams ni revalidate en una ruta, así
// que de lo que arma Serwist se exportan solo estos dos.
export const { generateStaticParams, GET } = createSerwistRoute({
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  swSrc: "app/sw.ts",
  useNativeEsbuild: true,
});
