"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ResendIfSession } from "@/components/resend-if-session";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Notice } from "@/components/ui/notice";
import { TextLink } from "@/components/ui/text-link";
import { verifyEmail } from "@/lib/auth";
import { linkFailure, type LinkFailure } from "@/lib/link-failure";

type Result = { kind: "ok" } | LinkFailure;

export function VerifyEmail() {
  const token = useSearchParams().get("token") ?? "";
  const [result, setResult] = useState<Result | null>(null);
  // El token se usa una sola vez: el ref sobrevive al doble efecto de StrictMode.
  const startedFor = useRef<string | null>(null);

  const redeem = useCallback(() => {
    setResult(null);
    verifyEmail(token).then(
      () => setResult({ kind: "ok" }),
      (error: unknown) => setResult(linkFailure(error)),
    );
  }, [token]);

  useEffect(() => {
    if (!token || startedFor.current === token) return;
    startedFor.current = token;
    redeem();
  }, [token, redeem]);

  // Sin token no se llama al API: es directamente el estado inválido.
  const status: Result | { kind: "loading" } = !token
    ? { kind: "invalid" }
    : (result ?? { kind: "loading" });

  if (status.kind === "loading") {
    return <p className="text-sm text-soft">Verificando tu mail…</p>;
  }

  if (status.kind === "ok") {
    return (
      <>
        <Notice tone="success">Mail verificado</Notice>
        <TextLink href="/">Seguir a Akro</TextLink>
      </>
    );
  }

  if (status.kind === "retry") {
    return (
      <>
        <FormError message={status.message} />
        <Button fullWidth onClick={redeem}>
          Probar de nuevo
        </Button>
      </>
    );
  }

  return (
    <>
      <FormError message="El link venció o no es válido." />
      <ResendIfSession />
      <TextLink href="/">Ir al inicio</TextLink>
    </>
  );
}
