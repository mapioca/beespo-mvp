"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Search,
    Music,
    MessageSquare,
    Briefcase,
    Megaphone,
    User,
    BookOpen,
    Users,
    GraduationCap,
    ChevronRight,
    ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface ProceduralItemType {
    id: string;
    name: string;
    description: string | null;
    default_duration_minutes: number | null;
    is_custom: boolean | null;
    is_hymn: boolean | null;
    category: string | null;
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

type CategoryType = 'administrative' | 'worship' | 'specialized' | 'music' | 'council' | 'teaching';

const categories = [
    { id: 'administrative' as const, label: 'Administrative', icon: ClipboardList, color: 'text-slate-600' },
    { id: 'worship' as const, label: 'Worship', icon: BookOpen, color: 'text-purple-600' },
    { id: 'specialized' as const, label: 'Specialized', icon: Briefcase, color: 'text-amber-600' },
    { id: 'music' as const, label: 'Music', icon: Music, color: 'text-blue-600' },
    { id: 'council' as const, label: 'Council', icon: Users, color: 'text-green-600' },
    { id: 'teaching' as const, label: 'Teaching', icon: GraduationCap, color: 'text-pink-600' },
];

export function AddTemplateItemDialog({
    onAddItem,
    existingItemTypes,
    trigger,
}: AddTemplateItemDialogProps) {
    const [open, setOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<CategoryType>('worship');
    const [search, setSearch] = useState("");
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

    const renderCategoryItems = () => {
        const searchLower = search.toLowerCase();

        if (selectedCategory === 'specialized') {
            // Show specialized items
            const specializedItems = [
                {
                    id: 'discussion',
                    icon: <MessageSquare className="h-4 w-4 text-green-500" />,
                    title: 'Discussion',
                    subtitle: 'Link to Discussion topics',
                    disabled: hasSingleton('discussion'),
                    onClick: () => handleSelectSpecialized('discussion', 'Discussion & Counsel'),
                },
                {
                    id: 'announcement',
                    icon: <Megaphone className="h-4 w-4 text-orange-500" />,
                    title: 'Announcements',
                    subtitle: 'Link to active Announcements',
                    disabled: hasSingleton('announcement'),
                    onClick: () => handleSelectSpecialized('announcement', 'Announcements'),
                },
                {
                    id: 'business',
                    icon: <Briefcase className="h-4 w-4 text-purple-500" />,
                    title: 'Business',
                    subtitle: 'Callings, Releases, Ordinations',
                    disabled: hasSingleton('business'),
                    onClick: () => handleSelectSpecialized('business', 'Ward Business'),
                },
                {
                    id: 'speaker',
                    icon: <User className="h-4 w-4 text-pink-500" />,
                    title: 'Speaker',
                    subtitle: 'Assign speakers and topics',
                    disabled: false,
                    onClick: () => handleSelectSpecialized('speaker', 'Speaker'),
                },
            ];

            const filteredItems = specializedItems.filter(
                (item) => item.title.toLowerCase().includes(searchLower)
            );

            return filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                    <ItemRow
                        key={item.id}
                        icon={item.icon}
                        title={item.title}
                        subtitle={item.subtitle}
                        badge={item.disabled ? <Badge variant="secondary" className="text-[10px] px-1 h-5">Added</Badge> : null}
                        onClick={item.onClick}
                        disabled={item.disabled}
                    />
                ))
            ) : (
                <EmptyState message="No items found" />
            );
        } else {
            // Show procedural items for the selected category
            const filteredProcedural = proceduralTypes.filter(
                (type) =>
                    (type.category === selectedCategory || (!type.category && selectedCategory === 'worship')) &&
                    type.name.toLowerCase().includes(searchLower)
            );

            return filteredProcedural.length > 0 ? (
                filteredProcedural.map((type) => (
                    <ItemRow
                        key={type.id}
                        icon={type.is_hymn ? <Music className="h-4 w-4 text-blue-500" /> : <BookOpen className="h-4 w-4 text-slate-500" />}
                        title={type.name}
                        subtitle={type.description}
                        onClick={() => handleSelectProcedural(type)}
                    />
                ))
            ) : (
                <EmptyState message="No items in this category" />
            );
        }
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
            <DialogContent className="sm:max-w-3xl p-0 gap-0">
                <DialogHeader className="p-4 pb-0">
                    <DialogTitle>Add Agenda Item</DialogTitle>
                    <DialogDescription>
                        Select a category and choose an item to add to your template
                    </DialogDescription>
                </DialogHeader>

                {/* Search bar */}
                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search items..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Split pane layout */}
                <div className="flex h-[500px]">
                    {/* Left pane - Categories */}
                    <div className="w-48 border-r bg-muted/30">
                        <nav className="py-2">
                            {categories.map((cat) => {
                                const Icon = cat.icon;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            setSelectedCategory(cat.id);
                                            setSearch("");
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors",
                                            selectedCategory === cat.id
                                                ? "bg-accent font-medium"
                                                : "hover:bg-accent/50"
                                        )}
                                    >
                                        <Icon className={cn("h-4 w-4", cat.color)} />
                                        <span className="flex-1">{cat.label}</span>
                                        {selectedCategory === cat.id && (
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Right pane - Items */}
                    <div className="flex-1 flex flex-col">
                        <div className="px-4 py-2 border-b bg-muted/20">
                            <h3 className="font-medium text-sm">
                                {categories.find((c) => c.id === selectedCategory)?.label}
                            </h3>
                        </div>
                        <ScrollArea className="flex-1">
                            {isLoadingProcedural ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    Loading...
                                </div>
                            ) : (
                                <div className="divide-y">{renderCategoryItems()}</div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Helper components
function ItemRow({
    icon,
    title,
    subtitle,
    badge,
    onClick,
    disabled,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string | null;
    badge?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "w-full text-left p-3 hover:bg-accent transition-colors flex items-start gap-3",
                disabled && "opacity-50 cursor-not-allowed bg-slate-50"
            )}
        >
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{title}</span>
                    {badge}
                </div>
                {subtitle && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {subtitle}
                    </p>
                )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        </button>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="p-8 text-center text-sm text-muted-foreground">
            {message}
        </div>
    );
}
