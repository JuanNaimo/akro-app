"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { TextLink } from "@/components/ui/text-link";
import { verifyMagicLink } from "@/lib/auth";
import { linkFailure, type LinkFailure } from "@/lib/link-failure";

export function MagicLink() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [failure, setFailure] = useState<LinkFailure | null>(null);
  // El token se usa una sola vez: el ref sobrevive al doble efecto de StrictMode.
  const startedFor = useRef<string | null>(null);

  const redeem = useCallback(() => {
    setFailure(null);
    verifyMagicLink(token).then(
      () => router.replace("/"),
      (error: unknown) => setFailure(linkFailure(error)),
    );
  }, [token, router]);

  useEffect(() => {
    if (!token || startedFor.current === token) return;
    startedFor.current = token;
    redeem();
  }, [token, redeem]);

  // Sin token no se llama al API: es directamente el estado inválido.
  if (!token || failure?.kind === "invalid") {
    return (
      <>
        <FormError message="El link venció o no es válido." />
        <TextLink href="/login">Volver a entrar</TextLink>
      </>
    );
  }

  if (failure?.kind === "retry") {
    return (
      <>
        <FormError message={failure.message} />
        <Button fullWidth onClick={redeem}>
          Probar de nuevo
        </Button>
      </>
    );
  }

  return <p className="text-sm text-soft">Entrando…</p>;
}
