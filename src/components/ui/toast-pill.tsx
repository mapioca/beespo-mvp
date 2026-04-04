"use client";

import * as React from "react";
import { CheckCircle2, Info, AlertTriangle, XCircle, Loader2, X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { type ToastItem, removeToast, pauseToast, resumeToast } from "@/lib/toast";

const toastVariants = cva(
  "pointer-events-auto relative flex w-full items-start gap-3 rounded-md border border-gray-200 bg-white px-4 py-3 shadow-lg",
  {
    variants: {
      variant: {
        success: "border-l-4 border-l-success",
        error: "border-l-4 border-l-error",
        info: "border-l-4 border-l-primary",
        warning: "border-l-4 border-l-warning",
        loading: "border-l-4 border-l-gray-400",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

type ToastVariant = NonNullable<VariantProps<typeof toastVariants>["variant"]>;

const iconMap: Record<ToastVariant, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
  loading: Loader2,
};

const iconColorMap: Record<ToastVariant, string> = {
  success: "text-success",
  error: "text-error",
  info: "text-primary",
  warning: "text-warning",
  loading: "text-gray-500",
};

export interface ToastPillProps extends React.HTMLAttributes<HTMLDivElement> {
  item: ToastItem;
}

const ToastPill = React.forwardRef<HTMLDivElement, ToastPillProps>(({ item, className, ...props }, ref) => {
  const Icon = iconMap[item.type];

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className={cn(toastVariants({ variant: item.type }), className)}
      onMouseEnter={() => pauseToast(item.id)}
      onMouseLeave={() => resumeToast(item.id)}
      {...props}
    >
      <span className="mt-0.5 shrink-0">
        <Icon
          className={cn(
            "h-4 w-4",
            iconColorMap[item.type],
            item.type === "loading" ? "animate-spin" : ""
          )}
          aria-hidden
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-700">{item.message}</p>
        {item.description ? <p className="mt-1 text-sm text-gray-500">{item.description}</p> : null}
      </div>

      <button
        type="button"
        onClick={() => removeToast(item.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-sm p-0.5 text-gray-400 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
});

ToastPill.displayName = "ToastPill";

export { ToastPill, toastVariants };
