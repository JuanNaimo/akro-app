"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { TextLink } from "@/components/ui/text-link";
import { resetPassword } from "@/lib/auth";
import {
  errorState,
  initialFormState,
  readField,
  type FormState,
} from "@/lib/form-state";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";

  const [state, action, pending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await resetPassword({
          token,
          password: readField(formData, "password"),
        });
      } catch (error) {
        return errorState(error);
      }
      return { fieldErrors: {}, done: true };
    },
    initialFormState,
  );

  if (state.done) {
    return (
      <>
        <Notice tone="success">Listo, ya cambiaste tu contraseña.</Notice>
        <TextLink href="/login">Entrar</TextLink>
      </>
    );
  }

  if (!token) {
    return (
      <>
        <FormError message="El link venció o no es válido." />
        <TextLink href="/forgot-password">Pedir un link nuevo</TextLink>
      </>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField
        name="password"
        type="password"
        label="Contraseña nueva"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        error={state.fieldErrors.password}
      />
      <FormError message={state.error} />
      {state.error && (
        <TextLink href="/forgot-password">Pedir un link nuevo</TextLink>
      )}
      <Button type="submit" fullWidth loading={pending}>
        Cambiar contraseña
      </Button>
    </form>
  );
}
