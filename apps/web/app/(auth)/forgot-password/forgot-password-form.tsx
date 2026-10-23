"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { TextLink } from "@/components/ui/text-link";
import { forgotPassword } from "@/lib/auth";
import {
  errorState,
  initialFormState,
  readField,
  type FormState,
} from "@/lib/form-state";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const email = readField(formData, "email");
      try {
        await forgotPassword(email);
      } catch (error) {
        return errorState(error, { email });
      }
      return { fieldErrors: {}, email, done: true };
    },
    initialFormState,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-sm text-soft">
        Ingresá tu mail y te mandamos un link para elegir una contraseña nueva.
      </p>
      <TextField
        name="email"
        type="email"
        label="Mail"
        autoComplete="email"
        required
        defaultValue={state.email}
        error={state.fieldErrors.email}
      />
      <FormError message={state.error} />
      {state.done && (
        <Notice tone="success">
          Si hay una cuenta con ese mail, te mandamos un link.
        </Notice>
      )}
      <Button type="submit" fullWidth loading={pending}>
        Mandar link
      </Button>
      <div className="flex flex-col items-center">
        <TextLink href="/login">Volver a entrar</TextLink>
      </div>
    </form>
  );
}
