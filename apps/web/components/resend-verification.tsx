"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { resendVerification } from "@/lib/auth";
import { GENERIC_ERROR } from "@/lib/form-state";

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

// Botón «Reenviar» del mail de verificación; muestra el error del API (por ejemplo el 429).
export function ResendVerification({
  variant = "secondary",
}: {
  variant?: "primary" | "secondary";
}) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function resend() {
    setState({ kind: "sending" });
    try {
      await resendVerification();
      setState({ kind: "sent" });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof ApiError ? error.message : GENERIC_ERROR,
      });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={variant}
        loading={state.kind === "sending"}
        onClick={resend}
      >
        Reenviar
      </Button>
      <div aria-live="polite" className="text-sm">
        {state.kind === "sent" && <p>Listo, te lo mandamos de nuevo.</p>}
        {state.kind === "error" && (
          <p className="text-danger">{state.message}</p>
        )}
      </div>
    </div>
  );
}
