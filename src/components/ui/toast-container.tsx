"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
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
      className="fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col-reverse items-center gap-2 pointer-events-none w-[90vw] sm:w-auto sm:max-w-md"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((item) => (
          <ToastPill key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
