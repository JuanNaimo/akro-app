import type { Metadata } from "next";
import { Suspense } from "react";
import { MagicLink } from "./magic-link";

export const metadata: Metadata = { title: "Entrar con un link" };

export default function MagicLinkPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-strong">Entrar con un link</h1>
      {/* useSearchParams (token) necesita Suspense con cacheComponents */}
      <Suspense>
        <MagicLink />
      </Suspense>
    </>
  );
}
