"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import { TextLink } from "@/components/ui/text-link";
import { signup } from "@/lib/auth";
import {
  errorState,
  initialFormState,
  readField,
  type FormState,
} from "@/lib/form-state";

export function SignupForm() {
  const router = useRouter();

  const [state, action, pending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const email = readField(formData, "email");
      try {
        await signup({ email, password: readField(formData, "password") });
      } catch (error) {
        return errorState(error, { email });
      }
      router.replace("/check-email");
      return { fieldErrors: {}, email, done: true };
    },
    initialFormState,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField
        name="email"
        type="email"
        label="Mail"
        autoComplete="email"
        required
        defaultValue={state.email}
        error={state.fieldErrors.email}
      />
      <TextField
        name="password"
        type="password"
        label="Contraseña"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        error={state.fieldErrors.password}
      />
      <p className="-mt-2 text-sm text-soft">Entre 8 y 128 caracteres.</p>
      <FormError message={state.error} />
      <Button type="submit" fullWidth loading={pending}>
        Crear cuenta
      </Button>
      <div className="flex flex-col items-center">
        <TextLink href="/login">Ya tengo cuenta</TextLink>
      </div>
    </form>
  );
}
