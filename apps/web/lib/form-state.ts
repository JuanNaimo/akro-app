import { ApiError } from "@/lib/api";

// Estado común de los formularios con useActionState.
export interface FormState {
  error?: string;
  fieldErrors: Record<string, string>;
  // Para no perder el mail cuando React resetea el formulario después de la acción.
  email?: string;
  done?: boolean;
}

export const initialFormState: FormState = { fieldErrors: {} };

export const GENERIC_ERROR = "Algo salió mal. Probá de nuevo en un rato.";

// Campos que los formularios muestran. Un issue de otro campo (por ejemplo, el token del link)
// no tiene dónde verse, así que va como error general.
const VISIBLE_FIELDS = new Set(["email", "password"]);

// Convierte un error del API en estado: por campo si hay fieldErrors, si no uno general.
export function errorState(
  error: unknown,
  extra: Partial<FormState> = {},
): FormState {
  if (error instanceof ApiError) {
    const fields = Object.keys(error.fieldErrors);
    const allVisible =
      fields.length > 0 && fields.every((field) => VISIBLE_FIELDS.has(field));
    return {
      ...extra,
      fieldErrors: error.fieldErrors,
      error: allVisible ? undefined : error.message,
    };
  }
  return { ...extra, fieldErrors: {}, error: GENERIC_ERROR };
}

export function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
