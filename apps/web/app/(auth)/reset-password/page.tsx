import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-strong">Nueva contraseña</h1>
      {/* useSearchParams (token) necesita Suspense con cacheComponents */}
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
