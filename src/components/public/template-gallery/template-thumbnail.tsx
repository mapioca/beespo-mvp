import { cn } from "@/lib/utils";
import { Database } from "@/types/database";

type TemplateItem = Database["public"]["Tables"]["template_items"]["Row"];

interface TemplateThumbnailProps {
  items: TemplateItem[];
}

const MAX_VISIBLE = 5;

export function TemplateThumbnail({ items }: TemplateThumbnailProps) {
  const sorted = [...items].sort((a, b) => a.order_index - b.order_index);
  const visible = sorted.slice(0, MAX_VISIBLE);
  const remainder = sorted.length - MAX_VISIBLE;

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground/50">
        No items
      </div>
    );
  }

  return (
    <div className="space-y-1.5 pointer-events-none select-none">
      {visible.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <div
            className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0",
              item.item_type === "procedural" ? "bg-slate-400" : "bg-blue-400"
            )}
          />
          <span className="text-[11px] leading-tight text-foreground/70 truncate">
            {item.title}
          </span>
        </div>
      ))}
      {remainder > 0 && (
        <p className="text-[10px] text-muted-foreground/60 pl-3.5">
          +{remainder} more item{remainder > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
