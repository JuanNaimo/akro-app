import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-page px-4 py-8">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <p className="text-center text-3xl font-semibold tracking-tight text-strong">
          Akro
        </p>
        <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6">
          {children}
        </div>
      </div>
    </main>
  );
}
