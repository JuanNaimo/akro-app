const GENERIC_MESSAGE = "Algo salió mal. Probá de nuevo en un rato.";
const OFFLINE_MESSAGE = "No hay conexión. Revisá tu internet y probá de nuevo.";

// Error del API (o de la red, con status 0). fieldErrors tiene el primer mensaje de cada campo.
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(
    status: number,
    message: string,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export interface ApiInit extends Omit<RequestInit, "body"> {
  // Cuerpo JSON: se serializa y suma el Content-Type.
  json?: unknown;
}

// Mismo formato que los errores de apps/api (el de Nest, más issues en las validaciones).
interface ErrorBody {
  message?: unknown;
  issues?: unknown;
}

function toFieldErrors(issues: unknown): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  if (!Array.isArray(issues)) return fieldErrors;
  for (const issue of issues) {
    if (
      typeof issue?.path === "string" &&
      typeof issue?.message === "string" &&
      !(issue.path in fieldErrors)
    ) {
      fieldErrors[issue.path] = issue.message;
    }
  }
  return fieldErrors;
}

async function toApiError(res: Response): Promise<ApiError> {
  if (res.status >= 500) return new ApiError(res.status, GENERIC_MESSAGE);
  let body: ErrorBody;
  try {
    body = (await res.json()) as ErrorBody;
  } catch {
    return new ApiError(res.status, GENERIC_MESSAGE);
  }
  const message =
    typeof body?.message === "string" && body.message
      ? body.message
      : GENERIC_MESSAGE;
  return new ApiError(res.status, message, toFieldErrors(body?.issues));
}

// fetch same-origin a /api/... (el rewrite de Next lo manda al API). Devuelve el JSON
// parseado, o undefined si la respuesta es 204.
export async function apiFetch<T>(
  path: string,
  { json, headers, ...init }: ApiInit = {},
): Promise<T> {
  const finalHeaders = new Headers(headers);
  if (json !== undefined) finalHeaders.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: finalHeaders,
      body: json === undefined ? undefined : JSON.stringify(json),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, OFFLINE_MESSAGE);
  }

  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError(res.status, GENERIC_MESSAGE);
  }
}
