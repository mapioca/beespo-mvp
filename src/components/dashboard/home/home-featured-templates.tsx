import Link from "next/link";
import { LayoutTemplate, FileText, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HomeFeaturedTemplate } from "@/lib/dashboard/home-data-fetchers";

interface HomeFeaturedTemplatesProps {
  templates: HomeFeaturedTemplate[];
}

export function HomeFeaturedTemplates({ templates }: HomeFeaturedTemplatesProps) {
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <LayoutTemplate className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No templates yet.</p>
        <Link
          href="/library"
          className="text-xs text-[hsl(var(--cp-primary))] hover:underline"
        >
          Browse the library →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {templates.map((template, i) => {
        // Alternate subtle accent colors for visual variety
        const accentClasses = [
          "from-violet-50/60 to-transparent dark:from-violet-900/10",
          "from-sky-50/60 to-transparent dark:from-sky-900/10",
          "from-amber-50/60 to-transparent dark:from-amber-900/10",
          "from-emerald-50/60 to-transparent dark:from-emerald-900/10",
          "from-rose-50/60 to-transparent dark:from-rose-900/10",
          "from-indigo-50/60 to-transparent dark:from-indigo-900/10",
        ];
        const accent = accentClasses[i % accentClasses.length];

        return (
          <Link
            key={template.id}
            href={`/library`}
            className={cn(
              "group flex flex-col gap-3 rounded-[10px] p-4",
              "border border-[hsl(var(--cp-border))]",
              "bg-gradient-to-br",
              accent,
              "bg-[hsl(var(--cp-surface))]",
              "hover:shadow-sm hover:border-[hsl(var(--cp-border)/0.7)]",
              "transition-all duration-150"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-white/70 dark:bg-white/10 shrink-0 border border-[hsl(var(--cp-border))]">
                <FileText className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground bg-white/60 dark:bg-white/5 border border-[hsl(var(--cp-border))] rounded-full px-2 py-0.5 shrink-0">
                {template.item_count} item{template.item_count === 1 ? "" : "s"}
              </span>
            </div>

            <div className="flex-1">
              <p className="text-[13px] font-semibold text-foreground leading-snug mb-1">
                {template.title}
              </p>
              {template.description && (
                <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
                  {template.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-[hsl(var(--cp-primary))] transition-colors">
              <span>Use template</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
