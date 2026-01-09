"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Database } from "@/types/database";
import { ArrowLeft, Check, ChevronRight, ChevronLeft, StopCircle, Clock } from "lucide-react";
import { MeetingTypeBadge } from "@/components/meetings/meeting-type-badge";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";

type AgendaItem = Database['public']['Tables']['agenda_items']['Row'];
type Meeting = Database['public']['Tables']['meetings']['Row'];

interface ConductMeetingProps {
    params: Promise<{
        id: string;
    }>;
}

export default function ConductMeetingPage({ params }: ConductMeetingProps) {
    const { id } = use(params);
    const router = useRouter();

    const [items, setItems] = useState<AgendaItem[]>([]);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [meeting, setMeeting] = useState<Meeting | null>(null);

    // Load initial data
    useEffect(() => {
        const fetchMeeting = async () => {
            const supabase = createClient();
            const { data: m } = await supabase.from('meetings').select('*').eq('id', id).single();
            const { data: i } = await supabase.from('agenda_items').select('*').eq('meeting_id', id).order('order_index');

            if (m && i) {
                setMeeting(m);
                setItems(i);
                // Find first incomplete item
                const firstIncomplete = i.findIndex(item => !item.is_completed);
                if (firstIncomplete !== -1) setCurrentItemIndex(firstIncomplete);
            }
        };
        fetchMeeting();
    }, [id]);

    // Timer
    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Real-time subscription for remote updates (optional but good for multi-device)
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel(`meeting-${id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'agenda_items', filter: `meeting_id=eq.${id}` }, () => {
                // Update local state if the change didn't come from us (simplified check)
                // For now, we just rely on local state to avoid overwrite conflicts in this simple version
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    // Debounced Note Saving
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const saveNotes = useCallback(
        debounce(async (itemId: string, content: string) => {
            const supabase = createClient();
            console.log('Saving notes...', itemId);
            await supabase
                .from('agenda_items')
                .update({ notes: content })
                .eq('id', itemId);
        }, 1000),
        []
    );

    const handleNoteChange = (content: string) => {
        const newItems = [...items];
        newItems[currentItemIndex].notes = content;
        setItems(newItems);
        saveNotes(items[currentItemIndex].id, content);
    };

    const handleToggleComplete = async () => {
        const item = items[currentItemIndex];
        const newStatus = !item.is_completed;

        // Optimistic update
        const newItems = [...items];
        newItems[currentItemIndex].is_completed = newStatus;
        setItems(newItems);

        const supabase = createClient();
        await supabase.from('agenda_items').update({ is_completed: newStatus }).eq('id', item.id);

        if (newStatus && currentItemIndex < items.length - 1) {
            // Auto-advance if marking complete
            setCurrentItemIndex(prev => prev + 1);
        }
    };

    const currentItem = items[currentItemIndex];

    if (!currentItem || !meeting) return <div className="p-8 text-center">Loading conductor...</div>;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col bg-background">
            {/* Top Bar */}
            <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/meetings/${id}`)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Exit
                    </Button>
                    <div>
                        <h1 className="font-semibold">{meeting.title}</h1>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Live • {formatTime(elapsedTime)} elapsed
                        </div>
                    </div>
                </div>
                <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                    <StopCircle className="mr-2 h-4 w-4" />
                    End Meeting
                </Button>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Active Item */}
                <div className="flex-1 p-8 overflow-y-auto flex flex-col max-w-3xl mx-auto w-full">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <span className="text-4xl font-bold text-muted-foreground/30">#{currentItemIndex + 1}</span>
                            <MeetingTypeBadge type={currentItem.item_type} className="text-base px-3 py-0.5" />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentItemIndex(Math.max(0, currentItemIndex - 1))}
                                disabled={currentItemIndex === 0}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentItemIndex(Math.min(items.length - 1, currentItemIndex + 1))}
                                disabled={currentItemIndex === items.length - 1}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-6 flex-1">
                        <div>
                            <h2 className="text-3xl font-bold mb-2">{currentItem.title}</h2>
                            {currentItem.duration_minutes && (
                                <div className="flex items-center text-muted-foreground text-sm mb-4">
                                    <Clock className="w-4 h-4 mr-2" />
                                    Planned: {currentItem.duration_minutes} min
                                </div>
                            )}
                            {currentItem.description && (
                                <p className="text-lg text-muted-foreground bg-muted/30 p-4 rounded-lg border">
                                    {currentItem.description}
                                </p>
                            )}
                        </div>

                        <div className="flex-1 flex flex-col">
                            <label className="text-sm font-medium mb-2">Meeting Notes</label>
                            <Textarea
                                className="flex-1 text-lg min-h-[200px] resize-none"
                                placeholder="Type notes here..."
                                value={currentItem.notes || ""}
                                onChange={(e) => handleNoteChange(e.target.value)}
                            />
                        </div>

                        <div className="pt-4 border-t">
                            <Button
                                size="lg"
                                className={cn("w-full transition-all", currentItem.is_completed ? "bg-green-600 hover:bg-green-700" : "")}
                                onClick={handleToggleComplete}
                            >
                                {currentItem.is_completed ? (
                                    <>
                                        <Check className="mr-2 h-5 w-5" />
                                        Completed
                                    </>
                                ) : "Mark as Complete"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right: Sidebar */}
                <div className="w-80 border-l bg-muted/10 overflow-y-auto p-4 hidden md:block">
                    <h3 className="font-semibold text-sm text-muted-foreground mb-4 uppercase tracking-wider">Up Next</h3>
                    <div className="space-y-3">
                        {items.map((item, idx) => (
                            <div
                                key={item.id}
                                onClick={() => setCurrentItemIndex(idx)}
                                className={cn(
                                    "p-3 rounded-lg border text-sm cursor-pointer hover:bg-accent transition-colors",
                                    idx === currentItemIndex ? "bg-accent border-primary ring-1 ring-primary" : "bg-card",
                                    item.is_completed && "opacity-50"
                                )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium line-clamp-2">{item.title}</span>
                                    {item.is_completed && <Check className="w-3 h-3 text-green-600" />}
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{getItemTypeLabel(item.item_type)}</span>
                                    {item.duration_minutes && <span>{item.duration_minutes}m</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function getItemTypeLabel(type: string): string {
    // Basic mapping, duplicated from type helper for now or import it
    const map: Record<string, string> = {
        procedural: 'Procedural',
        discussion: 'Discussion',
        business: 'Business',
        announcement: 'Announcement',
        speaker: 'Speaker'
    };
    return map[type] || type;
}
