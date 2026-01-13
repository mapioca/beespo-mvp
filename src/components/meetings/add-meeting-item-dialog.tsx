"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    BookOpen,
    Music,
    MessageSquare,
    Briefcase,
    Megaphone,
    User,
    ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Types for different item categories
interface ProceduralType {
    id: string;
    name: string;
    description: string | null;
    default_duration_minutes: number | null;
    is_hymn: boolean | null;
}

interface Discussion {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
}

interface BusinessItem {
    id: string;
    title: string;
    description: string | null;
    business_type: string;
    status: string;
}

interface Announcement {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
}

interface Speaker {
    id: string;
    name: string;
    topic: string | null;
    is_confirmed: boolean;
}

export type CategoryType = "procedural" | "discussion" | "business" | "announcement" | "speaker";

export interface SelectedItem {
    category: CategoryType;
    title: string;
    description?: string | null;
    duration_minutes: number;
    procedural_item_type_id?: string;
    is_hymn?: boolean;
    discussion_id?: string;
    business_item_id?: string;
    announcement_id?: string;
    speaker_id?: string;
}

interface AddMeetingItemDialogProps {
    open: boolean;
    onClose: () => void;
    onAddItem: (item: SelectedItem) => void;
    templateId?: string; // For filtering linked items
    meetingDate?: Date;
}

const categories = [
    { id: "procedural" as const, label: "Procedural", icon: BookOpen, color: "text-slate-500" },
    { id: "discussion" as const, label: "Discussions", icon: MessageSquare, color: "text-green-500" },
    { id: "business" as const, label: "Business", icon: Briefcase, color: "text-purple-500" },
    { id: "announcement" as const, label: "Announcements", icon: Megaphone, color: "text-orange-500" },
    { id: "speaker" as const, label: "Speakers", icon: User, color: "text-pink-500" },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AddMeetingItemDialog({
    open,
    onClose,
    onAddItem,
    templateId, // Reserved for future filtering
    meetingDate, // Reserved for future filtering
}: AddMeetingItemDialogProps) {
    // These props are intentionally unused for now, reserved for future filtering
    void templateId;
    void meetingDate;

    const [selectedCategory, setSelectedCategory] = useState<CategoryType>("procedural");
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Data for each category
    const [proceduralTypes, setProceduralTypes] = useState<ProceduralType[]>([]);
    const [discussions, setDiscussions] = useState<Discussion[]>([]);
    const [businessItems, setBusinessItems] = useState<BusinessItem[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [speakers, setSpeakers] = useState<Speaker[]>([]);

    useEffect(() => {
        if (open) {
            loadCategoryData(selectedCategory);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, selectedCategory]);

    const loadCategoryData = async (category: CategoryType) => {
        setIsLoading(true);
        const supabase = createClient();

        try {
            switch (category) {
                case "procedural": {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { data } = await (supabase.from("procedural_item_types") as any)
                        .select("*")
                        .order("order_hint");
                    if (data) setProceduralTypes(data);
                    break;
                }
                case "discussion": {
                    // Get discussions linked to template or unlinked active ones
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { data } = await (supabase.from("discussions") as any)
                        .select("id, title, description, status, priority")
                        .in("status", ["new", "active", "decision_required"])
                        .order("created_at", { ascending: false });
                    if (data) setDiscussions(data);
                    break;
                }
                case "business": {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { data } = await (supabase.from("business_items") as any)
                        .select("id, title, description, business_type, status")
                        .eq("status", "pending")
                        .order("created_at", { ascending: false });
                    if (data) setBusinessItems(data);
                    break;
                }
                case "announcement": {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { data } = await (supabase.from("announcements") as any)
                        .select("id, title, description, status, priority")
                        .eq("status", "active")
                        .order("created_at", { ascending: false });
                    if (data) setAnnouncements(data);
                    break;
                }
                case "speaker": {
                    // Get unassigned speakers
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { data } = await (supabase.from("speakers") as any)
                        .select("id, name, topic, is_confirmed")
                        .is("meeting_id", null)
                        .order("name");
                    if (data) setSpeakers(data);
                    break;
                }
            }
        } catch (error) {
            console.error("Error loading category data:", error);
        }

        setIsLoading(false);
    };

    const handleSelectItem = (item: SelectedItem) => {
        onAddItem(item);
        onClose();
    };

    const renderCategoryItems = () => {
        const searchLower = search.toLowerCase();

        switch (selectedCategory) {
            case "procedural":
                const filteredProcedural = proceduralTypes.filter(
                    (t) => t.name.toLowerCase().includes(searchLower)
                );
                return filteredProcedural.map((type) => (
                    <ItemRow
                        key={type.id}
                        icon={type.is_hymn ? <Music className="h-4 w-4 text-blue-500" /> : <BookOpen className="h-4 w-4 text-slate-500" />}
                        title={type.name}
                        subtitle={type.description}
                        onClick={() =>
                            handleSelectItem({
                                category: "procedural",
                                title: type.name,
                                description: type.description,
                                duration_minutes: type.default_duration_minutes || 5,
                                procedural_item_type_id: type.id,
                                is_hymn: type.is_hymn || false,
                            })
                        }
                    />
                ));

            case "discussion":
                const filteredDiscussions = discussions.filter(
                    (d) => d.title.toLowerCase().includes(searchLower)
                );
                return filteredDiscussions.length > 0 ? (
                    filteredDiscussions.map((disc) => (
                        <ItemRow
                            key={disc.id}
                            icon={<MessageSquare className="h-4 w-4 text-green-500" />}
                            title={disc.title}
                            subtitle={disc.description}
                            badge={<StatusBadge status={disc.status} />}
                            onClick={() =>
                                handleSelectItem({
                                    category: "discussion",
                                    title: disc.title,
                                    description: disc.description,
                                    duration_minutes: 15,
                                    discussion_id: disc.id,
                                })
                            }
                        />
                    ))
                ) : (
                    <EmptyState message="No active discussions available" />
                );

            case "business":
                const filteredBusiness = businessItems.filter(
                    (b) => b.title.toLowerCase().includes(searchLower)
                );
                return filteredBusiness.length > 0 ? (
                    filteredBusiness.map((item) => (
                        <ItemRow
                            key={item.id}
                            icon={<Briefcase className="h-4 w-4 text-purple-500" />}
                            title={item.title}
                            subtitle={item.description}
                            badge={<Badge variant="secondary" className="text-xs">{item.business_type}</Badge>}
                            onClick={() =>
                                handleSelectItem({
                                    category: "business",
                                    title: item.title,
                                    description: item.description,
                                    duration_minutes: 3,
                                    business_item_id: item.id,
                                })
                            }
                        />
                    ))
                ) : (
                    <EmptyState message="No pending business items" />
                );

            case "announcement":
                const filteredAnnouncements = announcements.filter(
                    (a) => a.title.toLowerCase().includes(searchLower)
                );
                return filteredAnnouncements.length > 0 ? (
                    filteredAnnouncements.map((ann) => (
                        <ItemRow
                            key={ann.id}
                            icon={<Megaphone className="h-4 w-4 text-orange-500" />}
                            title={ann.title}
                            subtitle={ann.description}
                            badge={<PriorityBadge priority={ann.priority} />}
                            onClick={() =>
                                handleSelectItem({
                                    category: "announcement",
                                    title: ann.title,
                                    description: ann.description,
                                    duration_minutes: 2,
                                    announcement_id: ann.id,
                                })
                            }
                        />
                    ))
                ) : (
                    <EmptyState message="No active announcements" />
                );

            case "speaker":
                const filteredSpeakers = speakers.filter(
                    (s) => s.name.toLowerCase().includes(searchLower)
                );
                return filteredSpeakers.length > 0 ? (
                    filteredSpeakers.map((speaker) => (
                        <ItemRow
                            key={speaker.id}
                            icon={<User className="h-4 w-4 text-pink-500" />}
                            title={speaker.name}
                            subtitle={speaker.topic}
                            badge={
                                speaker.is_confirmed ? (
                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Confirmed</Badge>
                                ) : null
                            }
                            onClick={() =>
                                handleSelectItem({
                                    category: "speaker",
                                    title: `Speaker: ${speaker.name}`,
                                    description: speaker.topic,
                                    duration_minutes: 10,
                                    speaker_id: speaker.id,
                                })
                            }
                        />
                    ))
                ) : (
                    <EmptyState message="No unassigned speakers available" />
                );

            default:
                return null;
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-3xl p-0 gap-0">
                <DialogHeader className="p-4 pb-0">
                    <DialogTitle>Add Agenda Item</DialogTitle>
                    <DialogDescription>
                        Select a category and choose an item to add to your agenda
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
                <div className="flex h-[400px]">
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
                            {isLoading ? (
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
}: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string | null;
    badge?: React.ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="w-full text-left p-3 hover:bg-accent transition-colors flex items-start gap-3"
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

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        new: "bg-blue-100 text-blue-700",
        active: "bg-green-100 text-green-700",
        decision_required: "bg-amber-100 text-amber-700",
    };
    return (
        <Badge variant="secondary" className={cn("text-xs", colors[status] || "")}>
            {status.replace("_", " ")}
        </Badge>
    );
}

function PriorityBadge({ priority }: { priority: string }) {
    const colors: Record<string, string> = {
        high: "bg-red-100 text-red-700",
        medium: "bg-amber-100 text-amber-700",
        low: "bg-slate-100 text-slate-700",
    };
    return (
        <Badge variant="secondary" className={cn("text-xs", colors[priority] || "")}>
            {priority}
        </Badge>
    );
}
