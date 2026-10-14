"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { wrappingDialogFocusIndex } from "@/lib/dialog-focus.logic";

export function MobileFilterDialog({ open, onClose, label, children }: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const focusable = () => dialog?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable()?.[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items?.length) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      const index = Array.from(items).indexOf(document.activeElement as HTMLElement);
      const next = wrappingDialogFocusIndex(items.length, index, event.shiftKey);
      if (next !== null) {
        event.preventDefault();
        (next < 0 ? dialog : items[next])?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (returnFocusTo?.isConnected) returnFocusTo.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-slate-950/40 p-0 md:hidden" onMouseDown={(event) => {
      if (event.target === event.currentTarget) closeRef.current();
    }}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="max-h-[82dvh] w-full overflow-y-auto rounded-t-3xl bg-slate-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl focus:outline-none"
      >
        {children}
      </section>
    </div>
  );
}
