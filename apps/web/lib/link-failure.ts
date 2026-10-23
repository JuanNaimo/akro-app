import { ApiError } from "@/lib/api";
import { GENERIC_ERROR } from "@/lib/form-state";

// Al canjear un link del mail, solo un 400 quiere decir que venció o no es válido. Sin
// conexión, un 429 o un 5xx el token no se usó: se muestra el error y se puede reintentar.
export type LinkFailure =
  | { kind: "invalid" }
  | { kind: "retry"; message: string };

export function linkFailure(error: unknown): LinkFailure {
  if (error instanceof ApiError && error.status === 400) return { kind: "invalid" };
  return {
    kind: "retry",
    message: error instanceof ApiError ? error.message : GENERIC_ERROR,
  };
}
