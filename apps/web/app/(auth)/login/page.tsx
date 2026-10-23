import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-strong">Entrar</h1>
      {/* useSearchParams (next) necesita Suspense con cacheComponents */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
