import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Music, MessageSquare, Briefcase, Megaphone, User, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface ProceduralItemType {
    id: string;
    name: string;
    description: string | null;
    default_duration_minutes: number | null;
    is_custom: boolean | null;
    is_hymn: boolean | null;
}

export type NewItemData = {
    title: string;
    item_type: 'procedural' | 'discussion' | 'business' | 'announcement' | 'speaker';
    duration_minutes: number;
    procedural_item_type_id?: string;
    is_hymn?: boolean;
};

interface AddTemplateItemDialogProps {
    onAddItem: (item: NewItemData) => void;
    existingItemTypes: string[]; // To handle singletons
    trigger?: React.ReactNode;
}

export function AddTemplateItemDialog({
    onAddItem,
    existingItemTypes,
    trigger,
}: AddTemplateItemDialogProps) {
    const [open, setOpen] = useState(false);
    const [proceduralTypes, setProceduralTypes] = useState<ProceduralItemType[]>([]);
    const [isLoadingProcedural, setIsLoadingProcedural] = useState(false);

    useEffect(() => {
        if (open && proceduralTypes.length === 0) {
            fetchProceduralTypes();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const fetchProceduralTypes = async () => {
        setIsLoadingProcedural(true);
        const supabase = createClient();
        const { data } = await supabase
            .from("procedural_item_types")
            .select("*")
            .order("order_hint");

        if (data) {
            setProceduralTypes(data);
        }
        setIsLoadingProcedural(false);
    };

    const hasSingleton = (type: string) => existingItemTypes.includes(type);

    const handleSelectProcedural = (type: ProceduralItemType) => {
        onAddItem({
            title: type.name,
            item_type: 'procedural',
            duration_minutes: type.default_duration_minutes || 5,
            procedural_item_type_id: type.id,
            is_hymn: type.is_hymn || false,
        });
        setOpen(false);
    };

    const handleSelectSpecialized = (
        type: 'discussion' | 'business' | 'announcement' | 'speaker',
        defaultTitle: string
    ) => {
        onAddItem({
            title: defaultTitle,
            item_type: type,
            duration_minutes: type === 'discussion' ? 15 : 5,
        });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Item
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add Agenda Item</DialogTitle>
                    <DialogDescription>
                        Choose a type of item to add to your template.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">

                    {/* Procedural Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Procedural & Standard Items
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {isLoadingProcedural ? (
                                <div className="col-span-3 text-center py-4 text-sm text-muted-foreground">Loading...</div>
                            ) : (
                                proceduralTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => handleSelectProcedural(type)}
                                        className="flex flex-col items-start gap-2 p-3 text-left border rounded-lg hover:bg-accent transition-colors"
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            {type.is_hymn ? (
                                                <Music className="h-4 w-4 text-blue-500" />
                                            ) : (
                                                <BookOpen className="h-4 w-4 text-slate-500" />
                                            )}
                                            <span className="font-medium text-sm">{type.name}</span>
                                        </div>
                                        {type.description && (
                                            <span className="text-xs text-muted-foreground line-clamp-2">
                                                {type.description}
                                            </span>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Specialized Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Specialized Items
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <SpecializedButton
                                icon={<MessageSquare className="h-4 w-4 text-green-500" />}
                                title="Discussion"
                                description="Link to Discussion topics"
                                disabled={hasSingleton('discussion')}
                                onClick={() => handleSelectSpecialized('discussion', 'Discussion & Counsel')}
                            />
                            <SpecializedButton
                                icon={<Megaphone className="h-4 w-4 text-orange-500" />}
                                title="Announcements"
                                description="Link to active Announcements"
                                disabled={hasSingleton('announcement')}
                                onClick={() => handleSelectSpecialized('announcement', 'Announcements')}
                            />
                            <SpecializedButton
                                icon={<Briefcase className="h-4 w-4 text-purple-500" />}
                                title="Business"
                                description="Callings, Releases, Ordinations"
                                disabled={hasSingleton('business')}
                                onClick={() => handleSelectSpecialized('business', 'Ward Business')}
                            />
                            <SpecializedButton
                                icon={<User className="h-4 w-4 text-pink-500" />}
                                title="Speaker"
                                description="Assign speakers and topics"
                                disabled={false} // Speakers are NOT singletons
                                onClick={() => handleSelectSpecialized('speaker', 'Speaker')}
                            />
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function SpecializedButton({
    icon,
    title,
    description,
    disabled,
    onClick
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "flex flex-col items-start gap-2 p-3 text-left border rounded-lg transition-colors bg-white",
                disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : "hover:bg-accent"
            )}
        >
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-medium text-sm">{title}</span>
                </div>
                {disabled && <Badge variant="secondary" className="text-[10px] px-1 h-5">Added</Badge>}
            </div>
            <span className="text-xs text-muted-foreground">{description}</span>
        </button>
    );
}
