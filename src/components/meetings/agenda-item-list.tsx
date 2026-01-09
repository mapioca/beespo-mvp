import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { MeetingTypeBadge } from "./meeting-type-badge";
import { cn } from "@/lib/utils";
import { Database } from "@/types/database";

type AgendaItem = Database['public']['Tables']['agenda_items']['Row'];

interface AgendaItemListProps {
    items: AgendaItem[];
    showNotes?: boolean;
}

export function AgendaItemList({ items, showNotes = false }: AgendaItemListProps) {
    if (items.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed text-sm">
                No agenda items added yet.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {items.map((item) => (
                <div
                    key={item.id}
                    className={cn(
                        "flex gap-4 p-4 rounded-lg border bg-card transition-colors",
                        item.is_completed && "bg-muted/50 opacity-80"
                    )}
                >
                    <div className="flex-none pt-1">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                            {item.order_index + 1}
                        </div>
                    </div>

                    <div className="flex-grow space-y-1.5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <div className="font-medium leading-none flex items-center gap-2">
                                    <span className={item.is_completed ? "line-through text-muted-foreground" : ""}>
                                        {item.title}
                                    </span>
                                    {item.duration_minutes && (
                                        <Badge variant="secondary" className="text-[10px] px-1 h-5 font-normal text-muted-foreground">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {item.duration_minutes}m
                                        </Badge>
                                    )}
                                </div>
                                {item.description && (
                                    <p className="text-sm text-muted-foreground">
                                        {item.description}
                                    </p>
                                )}
                            </div>
                            <MeetingTypeBadge type={item.item_type} />
                        </div>

                        {showNotes && item.notes && (
                            <div className="mt-2 text-sm bg-yellow-50/50 p-2 rounded border border-yellow-100 dark:bg-yellow-950/10 dark:border-yellow-900/30">
                                <span className="font-medium text-xs text-yellow-700 dark:text-yellow-500 block mb-1">Notes:</span>
                                {item.notes}
                            </div>
                        )}

                        {/* Linked Entity Badges - placeholders for now, could be links */}
                        <div className="flex gap-2 text-xs pt-1">
                            {/* Logic to show links based on item_type would go here */}
                        </div>
                    </div>

                    <div className="flex-none pt-1">
                        <Checkbox
                            checked={item.is_completed}
                            disabled
                            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
