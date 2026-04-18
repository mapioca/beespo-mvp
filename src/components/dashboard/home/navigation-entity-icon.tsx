import {
  CalendarDays,
  Database,
  FileText,
  MessageSquare,
  BookOpen,
  StickyNote,
} from "lucide-react";
import type { FavoriteEntityType } from "@/lib/navigation/types";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<FavoriteEntityType, React.ElementType> = {
  meeting: CalendarDays,
  table: Database,
  form: FileText,
  discussion: MessageSquare,
  notebook: BookOpen,
  note: StickyNote,
};

interface NavigationEntityIconProps {
  entityType: FavoriteEntityType;
  className?: string;
}

export function NavigationEntityIcon({
  entityType,
  className,
}: NavigationEntityIconProps) {
  const Icon = ICON_MAP[entityType] ?? FileText;
  return <Icon className={cn("h-4 w-4", className)} />;
}
