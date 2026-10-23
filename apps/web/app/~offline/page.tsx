import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sin conexión",
};

export default function Offline() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-semibold text-strong">Sin conexión</h1>
      <p className="max-w-sm text-soft">
        Akro necesita internet para esta pantalla. Cuando vuelva la conexión,
        recargá la página.
      </p>
    </main>
  );
}
