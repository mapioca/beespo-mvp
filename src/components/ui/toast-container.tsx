"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useToastStore } from "@/lib/toast";
import { ToastPill } from "./toast-pill";

export function ToastContainer() {
  const [mounted, setMounted] = useState(false);
  const toasts = useToastStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-label="Notifications"
      className="fixed right-6 top-6 z-[100] flex w-[92vw] max-w-md flex-col gap-2 pointer-events-none"
    >
      {toasts.map((item) => (
        <ToastPill key={item.id} item={item} />
      ))}
    </div>,
    document.body,
  );
}
