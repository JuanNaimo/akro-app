"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ResendVerification } from "@/components/resend-verification";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Notice } from "@/components/ui/notice";
import { ApiError } from "@/lib/api";
import { logout, me, type PublicUser } from "@/lib/auth";
import { GENERIC_ERROR } from "@/lib/form-state";
import { hardNavigate } from "@/lib/navigation";

export function Home() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let active = true;
    me().then(
      (u) => active && setUser(u),
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

  async function leave() {
    setLeaving(true);
    try {
      await logout();
      hardNavigate("/login");
    } catch (e) {
      setLeaving(false);
      setError(e instanceof ApiError ? e.message : GENERIC_ERROR);
    }
  }

  if (!user) {
    return error ? (
      <FormError message={error} />
    ) : (
      <p className="text-sm text-soft">Cargando…</p>
    );
  }

  return (
    <>
      {!user.emailVerified && (
        <Notice tone="warning" action={<ResendVerification />}>
          <strong>Confirmá tu mail</strong>
          <p>Te mandamos un link para verificarlo.</p>
        </Notice>
      )}
      <FormError message={error} />
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-semibold tracking-tight text-strong">
          Akro
        </h1>
        <p className="text-soft">Estudiar con amigos, con intención.</p>
      </div>
      <p className="text-strong">
        Entraste como <strong className="break-all">{user.email}</strong>
      </p>
      <div>
        <Button variant="secondary" loading={leaving} onClick={leave}>
          Salir
        </Button>
      </div>
    </>
  );
}
