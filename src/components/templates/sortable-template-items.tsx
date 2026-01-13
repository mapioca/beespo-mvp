'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Trash2, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getItemTypeBadgeVariant, getItemTypeLabel } from '@/types/agenda';

interface SortableTemplateItemsProps {
    items: any[];
    onReorder: (items: any[]) => void;
    onUpdateItem: (id: string, updates: Partial<any>) => void;
    onDeleteItem: (id: string) => void;
}

export function SortableTemplateItems({
    items,
    onReorder,
    onUpdateItem,
    onDeleteItem,
}: SortableTemplateItemsProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const reorderedItems = Array.from(items);
        const [removed] = reorderedItems.splice(result.source.index, 1);
        reorderedItems.splice(result.destination.index, 0, removed);

        // Update order_index for all items
        const updated = reorderedItems.map((item, index) => ({
            ...item,
            order_index: index,
        }));

        onReorder(updated);
    };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="template-items">
                {(provided) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2"
                    >
                        {items.map((item, index) => (
                            <Draggable
                                key={item.id || item.tempId}
                                draggableId={item.id || item.tempId}
                                index={index}
                            >
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={cn(
                                            'bg-card border rounded-lg p-4 transition-all',
                                            snapshot.isDragging && 'shadow-lg ring-2 ring-primary'
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Drag Handle */}
                                            <div
                                                {...provided.dragHandleProps}
                                                className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                                            >
                                                <GripVertical className="h-5 w-5" />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 space-y-3">
                                                {/* Header */}
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={getItemTypeBadgeVariant(item.item_type)}>
                                                        {getItemTypeLabel(item.item_type)}
                                                    </Badge>
                                                    {item.hymn_number && (
                                                        <Badge variant="outline" className="flex items-center gap-1">
                                                            <Music className="h-3 w-3" />
                                                            #{item.hymn_number}
                                                        </Badge>
                                                    )}
                                                    <span className="text-sm text-muted-foreground">
                                                        {item.duration_minutes} min
                                                    </span>
                                                </div>

                                                {/* Editable Fields */}
                                                {expandedId === (item.id || item.tempId) ? (
                                                    <div className="space-y-3">
                                                        <div>
                                                            <Input
                                                                value={item.title}
                                                                onChange={(e) =>
                                                                    onUpdateItem(item.id || item.tempId, { title: e.target.value })
                                                                }
                                                                placeholder="Item title"
                                                                className="font-medium"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Textarea
                                                                value={item.description || ''}
                                                                onChange={(e) =>
                                                                    onUpdateItem(item.id || item.tempId, { description: e.target.value })
                                                                }
                                                                placeholder="Description (optional)"
                                                                rows={2}
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                type="number"
                                                                value={item.duration_minutes}
                                                                onChange={(e) =>
                                                                    onUpdateItem(item.id || item.tempId, {
                                                                        duration_minutes: parseInt(e.target.value) || 0,
                                                                    })
                                                                }
                                                                className="w-24"
                                                                min="1"
                                                            />
                                                            <span className="text-sm text-muted-foreground">minutes</span>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setExpandedId(null)}
                                                        >
                                                            Done
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => setExpandedId(item.id || item.tempId)}
                                                        className="cursor-pointer hover:bg-accent/50 p-2 -m-2 rounded transition-colors"
                                                    >
                                                        <h4 className="font-medium">{item.title}</h4>
                                                        {item.description && (
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Delete Button */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onDeleteItem(item.id || item.tempId)}
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
}
