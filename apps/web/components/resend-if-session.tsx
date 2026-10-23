"use client";

import { useEffect, useState } from "react";
import { ResendVerification } from "@/components/resend-verification";
import { me } from "@/lib/auth";

// Muestra «Reenviar» solo si hay sesión (me() es de solo lectura, se puede repetir).
export function ResendIfSession() {
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let active = true;
    me()
      .then(() => active && setHasSession(true))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return hasSession ? <ResendVerification /> : null;
}
