// Texto legible para un error de conexión. Con "localhost", Node prueba IPv4 e IPv6 y junta
// los rechazos en un AggregateError sin mensaje: en ese caso el dato útil es el código.
export function describeError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const code = (err as NodeJS.ErrnoException).code;
  return err.message || code || err.name;
}
