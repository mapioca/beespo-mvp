import { cn } from "@/lib/utils";

interface HomeSectionProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function HomeSection({
  title,
  action,
  children,
  className,
}: HomeSectionProps) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h2>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
