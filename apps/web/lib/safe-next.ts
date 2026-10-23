// Evita el open redirect: `next` solo se acepta si es una ruta interna del mismo origen.
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/";
  // Cualquier barra invertida o carácter de control se rechaza (los navegadores los normalizan).
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  try {
    if (new URL(value, "http://x").origin !== "http://x") return "/";
  } catch {
    return "/";
  }
  return value;
}
