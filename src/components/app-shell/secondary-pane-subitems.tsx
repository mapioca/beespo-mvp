"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SecondaryPaneSubitem<T extends string = string> {
  value: T;
  label: string;
}

interface SecondaryPaneSubitemsProps<T extends string = string> {
  items: ReadonlyArray<SecondaryPaneSubitem<T>>;
  activeValue: T;
  pendingValue?: T | null;
  onSelect: (value: T) => void;
  className?: string;
}

export function SecondaryPaneSubitems<T extends string = string>({
  items,
  activeValue,
  pendingValue = null,
  onSelect,
  className,
}: SecondaryPaneSubitemsProps<T>) {
  return (
    <div className={cn("relative ml-2 pl-6", className)}>
      <span
        className="pointer-events-none absolute bottom-0 left-0 top-0 w-0.5 bg-gray-300"
        aria-hidden
      />
      <div className="space-y-0">
        {items.map((item) => {
          const selected = activeValue === item.value;
          const loading = pendingValue === item.value;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onSelect(item.value)}
              className={cn(
                "group relative flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors",
                selected
                  ? "bg-gray-50 text-gray-900 hover:bg-gray-100"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
              aria-busy={loading}
            >
              <span
                className={cn(
                  "pointer-events-none absolute -left-6 bottom-0 top-0 w-0.5 transition-colors",
                  selected ? "bg-black" : "bg-transparent group-hover:bg-gray-500"
                )}
                aria-hidden
              />
              <span>{item.label}</span>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
