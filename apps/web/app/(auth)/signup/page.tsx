import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-strong">Crear cuenta</h1>
      <SignupForm />
    </>
  );
}
