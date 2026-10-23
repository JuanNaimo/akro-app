// Error general del formulario (el que no es de un campo). No renderiza nada si está vacío.
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger"
    >
      {message}
    </p>
  );
}
