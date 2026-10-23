import { useId, type ComponentProps } from "react";

interface TextFieldProps extends ComponentProps<"input"> {
  label: string;
  // Error del campo: se muestra debajo y lo marca como inválido.
  error?: string;
}

export function TextField({
  label,
  error,
  id,
  className = "",
  "aria-describedby": describedBy,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const describedByIds =
    [describedBy, error ? errorId : undefined].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-strong">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedByIds}
        className={`min-h-11 w-full rounded-lg border bg-surface px-3 text-base text-strong placeholder:text-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-text disabled:opacity-60 ${error ? "border-danger" : "border-line"} ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
