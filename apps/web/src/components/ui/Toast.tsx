"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WIcon } from "@/components/ui/kit";

interface ToastState {
  message: string;
  onUndo?: () => void;
}

const DISMISS_MS = 5000;

/** Local (per-screen) toast queue with an optional "Undo" action. */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const show = useCallback((message: string, onUndo?: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, onUndo });
    timerRef.current = setTimeout(() => setToast(null), DISMISS_MS);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { toast, show, dismiss };
}

export function Toast({ toast, onUndo, onDismiss }: {
  toast: ToastState | null;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  if (!toast) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed", left: "50%", bottom: "calc(90px + env(safe-area-inset-bottom, 0px))",
        transform: "translateX(-50%)", zIndex: 90, width: "calc(100% - 44px)", maxWidth: 420,
        background: "var(--ink)", color: "var(--text-on-ink)", borderRadius: "var(--r-row)",
        padding: "13px 10px 13px 18px", display: "flex", alignItems: "center", gap: 10,
        boxShadow: "var(--shadow-pop)", animation: "wt-slide-up 220ms var(--ease-out) both",
      }}
    >
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{toast.message}</span>
      {toast.onUndo && (
        <button
          onClick={onUndo}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: 14, fontWeight: 700, padding: "8px 10px" }}
        >
          Undo
        </button>
      )}
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-on-ink)", opacity: 0.6, padding: 6, display: "flex" }}
      >
        <WIcon name="x" size={15} />
      </button>
    </div>
  );
}
