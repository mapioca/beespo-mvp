import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getItemTypeLabel, getItemTypeBadgeVariant } from "@/types/agenda";

interface MeetingTypeBadgeProps {
    type: string;
    className?: string;
}

export function MeetingTypeBadge({ type, className }: MeetingTypeBadgeProps) {
    const label = getItemTypeLabel(type);
    const variant = getItemTypeBadgeVariant(type);

    return (
        <Badge
            variant={variant}
            className={cn("capitalize font-normal", className)}
        >
            {label}
        </Badge>
    );
}
