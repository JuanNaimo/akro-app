import type { ReactNode } from "react";

type Tone = "info" | "success" | "warning";

const TONES: Record<Tone, string> = {
  info: "bg-brand-soft text-brand-text",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
};

interface NoticeProps {
  tone?: Tone;
  children: ReactNode;
  // Acción opcional, por ejemplo un botón «Reenviar».
  action?: ReactNode;
}

export function Notice({ tone = "info", children, action }: NoticeProps) {
  return (
    <div
      role={tone === "warning" ? "alert" : "status"}
      className={`flex flex-col gap-3 rounded-lg px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${TONES[tone]}`}
    >
      <div>{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
