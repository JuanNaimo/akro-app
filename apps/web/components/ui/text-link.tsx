import Link from "next/link";
import type { ComponentProps } from "react";

export function TextLink({
  className = "",
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      className={`inline-flex min-h-11 items-center font-medium text-brand-text underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-text ${className}`}
      {...props}
    />
  );
}
