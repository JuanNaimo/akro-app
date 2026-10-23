"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { TextLink } from "@/components/ui/text-link";
import { login, requestMagicLink } from "@/lib/auth";
import {
  errorState,
  initialFormState,
  readField,
  type FormState,
} from "@/lib/form-state";
import { safeNext } from "@/lib/safe-next";

type MagicState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "needs-email"; message: string }
  | { kind: "error"; message: string };

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [magic, setMagic] = useState<MagicState>({ kind: "idle" });

  const [state, action, pending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const email = readField(formData, "email");
      setMagic({ kind: "idle" });
      try {
        await login({ email, password: readField(formData, "password") });
      } catch (error) {
        return errorState(error, { email });
      }
      router.replace(next);
      return { fieldErrors: {}, email, done: true };
    },
    initialFormState,
  );

  async function sendMagicLink(form: HTMLFormElement | null) {
    const input = form?.elements.namedItem("email") as HTMLInputElement | null;
    const email = input?.value.trim() ?? "";
    if (!input || !email || !input.checkValidity()) {
      setMagic({
        kind: "needs-email",
        message: "Ingresá tu mail para mandarte el link.",
      });
      return;
    }
    setMagic({ kind: "sending" });
    try {
      await requestMagicLink(email);
      setMagic({ kind: "sent" });
    } catch (error) {
      setMagic({ kind: "error", message: errorState(error).error ?? "" });
    }
  }

  const emailError =
    state.fieldErrors.email ??
    (magic.kind === "needs-email" ? magic.message : undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField
        name="email"
        type="email"
        label="Mail"
        autoComplete="email"
        required
        defaultValue={state.email}
        error={emailError}
      />
      <TextField
        name="password"
        type="password"
        label="Contraseña"
        autoComplete="current-password"
        required
        error={state.fieldErrors.password}
      />
      <FormError message={state.error} />
      <Button type="submit" fullWidth loading={pending}>
        Entrar
      </Button>
      <Button
        variant="secondary"
        fullWidth
        loading={magic.kind === "sending"}
        disabled={pending}
        onClick={(event) => sendMagicLink(event.currentTarget.form)}
      >
        Mandame un link para entrar
      </Button>
      {magic.kind === "sent" && (
        <Notice tone="success">
          Si hay una cuenta con ese mail, te mandamos un link (vence en 15
          minutos).
        </Notice>
      )}
      {magic.kind === "error" && <FormError message={magic.message} />}
      <div className="flex flex-col items-center">
        <TextLink href="/forgot-password">Olvidé mi contraseña</TextLink>
        <TextLink href="/signup">Crear una cuenta</TextLink>
      </div>
    </form>
  );
}
