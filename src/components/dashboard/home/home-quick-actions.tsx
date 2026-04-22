import type { ElementType } from "react";
import Link from "next/link";
import {
  CheckSquare,
  MessageSquare,
  ClipboardPen,
  Table2,
  NotebookPen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  href: string;
  icon: ElementType;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: "new-task",       label: "New task",       href: "/tasks?create=true", icon: CheckSquare },
  { id: "new-discussion", label: "New discussion", href: "/meetings/agendas/discussions", icon: MessageSquare },
  { id: "new-form",       label: "New form",       href: "/forms/new", icon: ClipboardPen },
  { id: "new-table",      label: "New table",      href: "/data/new", icon: Table2 },
  { id: "new-notebook",   label: "New notebook",   href: "/notebooks/new", icon: NotebookPen },
];

export function HomeQuickActions() {
  return (
    <div className="flex w-full -mx-6 px-6 sm:mx-0 sm:px-0">
      <div 
        className="flex gap-2 overflow-x-auto scroll-smooth scrollbar-hidden snap-x pt-1 pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              href={action.href}
              id={`quick-action-${action.id}`}
              className={cn(
                "flex items-center gap-1.5 rounded-[8px] px-3.5 py-1.5 shrink-0 snap-start",
                "border border-[hsl(var(--cp-border))] bg-surface-raised",
                "text-[13px] font-medium text-muted-foreground",
                "hover:bg-[hsl(var(--cp-hover))] hover:text-foreground hover:border-[hsl(var(--cp-border)/0.7)]",
                "transition-all duration-150"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {action.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
