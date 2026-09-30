"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function ActionSubmitButton({
  children,
  pendingLabel = "A guardar…",
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return <button
    type="submit"
    disabled={pending}
    aria-busy={pending}
    className={`${className} inline-flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-60`}
  >
    {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
    <span>{pending ? pendingLabel : children}</span>
  </button>;
}
