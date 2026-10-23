import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmail } from "./verify-email";

export const metadata: Metadata = { title: "Verificar mail" };

export default function VerifyEmailPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-strong">Verificar mail</h1>
      {/* useSearchParams (token) necesita Suspense con cacheComponents */}
      <Suspense>
        <VerifyEmail />
      </Suspense>
    </>
  );
}
