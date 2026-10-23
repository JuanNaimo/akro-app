import { ApiStatus } from "./api-status";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold tracking-tight">Akro</h1>
        <p className="max-w-sm text-zinc-600 dark:text-zinc-400">
          Estudiar con amigos, con intención.
        </p>
      </div>
      <ApiStatus />
    </main>
  );
}
