


"use client";

import { useEffect } from "react";

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-pwc-black/40 px-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-bold text-pwc-black">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-pwc-gray-400 hover:bg-pwc-gray-100 hover:text-pwc-gray-600 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {description && (
          <div className="mt-3 text-sm leading-relaxed text-pwc-gray-600">{description}</div>
        )}

        {children && <div className="mt-3">{children}</div>}

        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-pwc-black px-5 py-2 text-sm font-semibold text-pwc-black hover:bg-pwc-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={[
              "rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50",
              destructive ? "bg-pwc-red hover:bg-pwc-red/90" : "bg-pwc-black hover:bg-pwc-gray-800",
            ].join(" ")}
          >
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
