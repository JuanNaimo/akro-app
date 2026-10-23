"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ResendVerification } from "@/components/resend-verification";
import { FormError } from "@/components/ui/form-error";
import { TextLink } from "@/components/ui/text-link";
import { ApiError } from "@/lib/api";
import { me } from "@/lib/auth";
import { GENERIC_ERROR } from "@/lib/form-state";

export function CheckEmail() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    me().then(
      (user) => active && setEmail(user.email),
      (e) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 401) router.replace("/login");
        else setError(e instanceof ApiError ? e.message : GENERIC_ERROR);
      },
    );
    return () => {
      active = false;
    };
  }, [router]);

  if (error) return <FormError message={error} />;
  if (!email) return <p className="text-sm text-soft">Cargando…</p>;

  return (
    <>
      <p className="text-strong">
        Te mandamos un link a <strong className="break-all">{email}</strong>.
        Abrilo para verificar tu mail.
      </p>
      <ResendVerification />
      <TextLink href="/">Seguir a Akro</TextLink>
    </>
  );
}
