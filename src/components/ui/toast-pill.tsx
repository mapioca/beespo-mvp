"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { type ToastItem, removeToast, pauseToast, resumeToast } from "@/lib/toast";

// ---------------------------------------------------------------------------
// CVA variants
// ---------------------------------------------------------------------------

const pillVariants = cva(
  "relative flex items-center gap-2.5 rounded-full px-4 py-2.5 shadow-lg text-sm font-medium pointer-events-auto select-none",
  {
    variants: {
      variant: {
        success: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
        error: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
        info: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
        warning: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
        loading: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
);

type PillVariant = NonNullable<VariantProps<typeof pillVariants>["variant"]>;

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

const iconMap: Record<PillVariant, { icon: React.ElementType; className: string }> = {
  success: { icon: CheckCircle2, className: "text-emerald-400 dark:text-emerald-600" },
  error: { icon: XCircle, className: "text-red-400 dark:text-red-600" },
  info: { icon: Info, className: "text-blue-400 dark:text-blue-600" },
  warning: { icon: AlertTriangle, className: "text-amber-400 dark:text-amber-600" },
  loading: { icon: Loader2, className: "text-zinc-400 dark:text-zinc-500" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ToastPillProps {
  item: ToastItem;
}

export function ToastPill({ item }: ToastPillProps) {
  const handleDismiss = useCallback(() => {
    removeToast(item.id);
  }, [item.id]);

  const handleMouseEnter = useCallback(() => {
    pauseToast(item.id);
  }, [item.id]);

  const handleMouseLeave = useCallback(() => {
    resumeToast(item.id);
  }, [item.id]);


  const { icon: IconComp, className: iconClassName } = iconMap[item.type];

  return (
    <motion.div
      layout
      initial={{ y: 24, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -12, opacity: 0, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
        mass: 0.8,
      }}
      role="status"
      aria-live="polite"
      className={cn(pillVariants({ variant: item.type }))}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Icon with crossfade */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={item.type}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex-shrink-0"
        >
          {item.type === "loading" ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="block"
            >
              <IconComp className={cn("h-4 w-4", iconClassName)} />
            </motion.span>
          ) : (
            <IconComp className={cn("h-4 w-4", iconClassName)} />
          )}
        </motion.span>
      </AnimatePresence>

      {/* Content */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="truncate leading-tight">{item.message}</span>
        {item.description && (
          <span className="text-xs opacity-70 truncate leading-tight">
            {item.description}
          </span>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        className="flex-shrink-0 ml-1 rounded-full p-0.5 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
