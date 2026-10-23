"use client";

import { useEffect, useState } from "react";

// Misma forma que HealthReport en apps/api/src/health/health.service.ts.
type CheckStatus = "up" | "down";
interface HealthReport {
  status: "ok" | "degraded";
  checks: Record<"database" | "redis" | "storage", CheckStatus>;
}

const LABELS: Record<keyof HealthReport["checks"], string> = {
  database: "Base de datos",
  redis: "Caché",
  storage: "Archivos",
};

type State =
  | { kind: "loading" }
  | { kind: "unreachable" }
  | { kind: "report"; report: HealthReport };

// Estado del API visto desde el navegador: prueba de punta a punta del rewrite de /api.
export function ApiStatus() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    fetch("/api/health", { cache: "no-store" })
      .then((res) => res.json() as Promise<HealthReport>)
      .then((report) => active && setState({ kind: "report", report }))
      .catch(() => active && setState({ kind: "unreachable" }));
    return () => {
      active = false;
    };
  }, []);

  if (state.kind === "loading") {
    return <p className="text-sm text-zinc-500">Consultando el API…</p>;
  }
  if (state.kind === "unreachable") {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        No hay conexión con el API.
      </p>
    );
  }

  const { report } = state;
  return (
    <section aria-label="Estado del API" className="w-full max-w-xs text-sm">
      <p className="mb-2 font-medium">
        API: {report.status === "ok" ? "todo en orden" : "con problemas"}
      </p>
      <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {Object.entries(report.checks).map(([name, status]) => (
          <li key={name} className="flex justify-between px-3 py-2">
            <span>{LABELS[name as keyof HealthReport["checks"]]}</span>
            <span
              className={
                status === "up"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }
            >
              {status === "up" ? "arriba" : "caído"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
