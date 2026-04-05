import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Breadcrumb = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  title: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  description?: string;
  className?: string;
};

export function PageHeader({
  title,
  breadcrumbs,
  actions,
  description,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-6 border-b border-border pb-4", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav className="mb-2 flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1">
                {crumb.href && !isLast ? (
                  <Link href={crumb.href} className="transition-colors hover:text-foreground">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={cn(isLast && "text-foreground")}>{crumb.label}</span>
                )}
                {!isLast ? <ChevronRight className="h-3 w-3" /> : null}
              </span>
            );
          })}
        </nav>
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
