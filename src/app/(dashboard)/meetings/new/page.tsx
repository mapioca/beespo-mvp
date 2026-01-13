"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Check, ChevronRight, Music, BookOpen, MessageSquare, Briefcase, Megaphone, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/hooks/use-toast";
import { Database } from "@/types/database";
import { MeetingComposer, ComposedAgendaItem } from "@/components/meetings/meeting-composer";

type Template = Database['public']['Tables']['templates']['Row'];

function CreateMeetingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState<Template[]>([]);

    // Form State
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(searchParams.get('templateId'));
    const [title, setTitle] = useState("");
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [time, setTime] = useState("07:00");
    const [composedAgenda, setComposedAgenda] = useState<ComposedAgendaItem[]>([]);

    useEffect(() => {
        const fetchTemplates = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('templates')
                .select('*')
                .order('name');

            if (data) setTemplates(data);
        };

        fetchTemplates();
    }, []);

    // Update title when template selected
    useEffect(() => {
        if (selectedTemplate) {
            const t = templates.find(t => t.id === selectedTemplate);
            if (t && !title) {
                setTitle(`${t.name} - ${format(new Date(), 'MMM d')}`);
            }
        }
    }, [selectedTemplate, templates, title]);

    const handleComposerNext = (agenda: ComposedAgendaItem[]) => {
        setComposedAgenda(agenda);
        setStep(4);
    };

    const handleSubmit = async () => {
        if (!selectedTemplate || !date || !title) return;

        setLoading(true);
        const supabase = createClient();

        // Combine date and time
        const [hours, minutes] = time.split(':').map(Number);
        const scheduledDate = new Date(date);
        scheduledDate.setHours(hours, minutes);

        // Convert composed agenda to JSON for the RPC
        const agendaJson = composedAgenda.map((item, index) => ({
            title: item.title,
            description: item.description,
            duration_minutes: item.duration_minutes,
            order_index: index,
            item_type: item.category,
            hymn_id: item.hymn_id || null,
            speaker_id: item.speaker_id || null,
            discussion_id: item.discussion_id || null,
            business_item_id: item.business_item_id || null,
            announcement_id: item.announcement_id || null,
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
            .rpc('create_meeting_with_agenda', {
                p_template_id: selectedTemplate,
                p_title: title,
                p_scheduled_date: scheduledDate.toISOString(),
                p_agenda_items: agendaJson
            });

        // Fallback to simple creation if new RPC doesn't exist
        if (error && error.code === 'PGRST202') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: fallbackData, error: fallbackError } = await (supabase as any)
                .rpc('create_meeting_from_template', {
                    p_template_id: selectedTemplate,
                    p_title: title,
                    p_scheduled_date: scheduledDate.toISOString()
                });

            if (fallbackError) {
                toast({
                    title: "Error creating meeting",
                    description: fallbackError.message || "Unknown error",
                    variant: "destructive"
                });
                setLoading(false);
                return;
            }

            toast({
                title: "Meeting created!",
                description: "Redirecting to meeting details..."
            });

            router.push(`/meetings/${fallbackData}`);
            router.refresh();
            setLoading(false);
            return;
        }

        if (error) {
            toast({
                title: "Error creating meeting",
                description: error.message || "Unknown error",
                variant: "destructive"
            });
            setLoading(false);
            return;
        }

        toast({
            title: "Meeting created!",
            description: "Redirecting to meeting details..."
        });

        router.push(`/meetings/${data}`);
        router.refresh();
        setLoading(false);
    };

    const getCategoryIcon = (category: string, isHymn?: boolean) => {
        if (category === "procedural" && isHymn) {
            return <Music className="h-4 w-4 text-blue-500" />;
        }
        const icons: Record<string, React.ReactNode> = {
            procedural: <BookOpen className="h-4 w-4 text-slate-500" />,
            discussion: <MessageSquare className="h-4 w-4 text-green-500" />,
            business: <Briefcase className="h-4 w-4 text-purple-500" />,
            announcement: <Megaphone className="h-4 w-4 text-orange-500" />,
            speaker: <User className="h-4 w-4 text-pink-500" />,
        };
        return icons[category] || <BookOpen className="h-4 w-4 text-slate-500" />;
    };

    return (
        <div className="max-w-3xl mx-auto p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">New Meeting</h1>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <span className={cn(step >= 1 && "text-primary font-medium")}>1. Template</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className={cn(step >= 2 && "text-primary font-medium")}>2. Details</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className={cn(step >= 3 && "text-primary font-medium")}>3. Compose</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className={cn(step >= 4 && "text-primary font-medium")}>4. Review</span>
                </div>
            </div>

            {/* Step 1: Select Template */}
            {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => (
                        <Card
                            key={template.id}
                            className={cn(
                                "cursor-pointer transition-all hover:border-primary",
                                selectedTemplate === template.id && "border-2 border-primary bg-primary/5"
                            )}
                            onClick={() => setSelectedTemplate(template.id)}
                        >
                            <CardHeader>
                                <CardTitle className="text-lg flex justify-between items-center">
                                    {template.name}
                                    {selectedTemplate === template.id && <Check className="w-5 h-5 text-primary" />}
                                </CardTitle>
                                <div className="text-sm text-muted-foreground">{template.description || "No description"}</div>
                            </CardHeader>
                        </Card>
                    ))}
                    <div className="md:col-span-2 flex justify-end mt-4">
                        <Button disabled={!selectedTemplate} onClick={() => setStep(2)}>
                            Next: Details
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 2: Meeting Details */}
            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Schedule Meeting</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Meeting Title</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Ward Council - Jan 15"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label>Time</Label>
                                <Input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                        <Button disabled={!title || !date} onClick={() => setStep(3)}>Next: Compose Agenda</Button>
                    </CardFooter>
                </Card>
            )}

            {/* Step 3: Compose Agenda */}
            {step === 3 && selectedTemplate && date && (
                <MeetingComposer
                    templateId={selectedTemplate}
                    meetingTitle={title}
                    meetingDate={date}
                    onBack={() => setStep(2)}
                    onNext={handleComposerNext}
                />
            )}

            {/* Step 4: Review & Create */}
            {step === 4 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Review & Create</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-lg border p-4 space-y-2 bg-muted/40">
                            <div className="grid grid-cols-3 text-sm">
                                <span className="text-muted-foreground">Template:</span>
                                <span className="col-span-2 font-medium">
                                    {templates.find(t => t.id === selectedTemplate)?.name}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 text-sm">
                                <span className="text-muted-foreground">Title:</span>
                                <span className="col-span-2 font-medium">{title}</span>
                            </div>
                            <div className="grid grid-cols-3 text-sm">
                                <span className="text-muted-foreground">When:</span>
                                <span className="col-span-2 font-medium">
                                    {date && format(date, "PPP")} at {time}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 text-sm">
                                <span className="text-muted-foreground">Agenda Items:</span>
                                <span className="col-span-2 font-medium">
                                    {composedAgenda.length} items
                                </span>
                            </div>
                        </div>

                        {/* Agenda Preview */}
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Agenda Preview</h4>
                            <ScrollArea className="h-[200px] border rounded-lg">
                                <div className="divide-y">
                                    {composedAgenda.map((item, index) => (
                                        <div key={item.id} className="p-2 flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                                            {getCategoryIcon(item.category, item.is_hymn)}
                                            <span className="text-sm flex-1 truncate">{item.title}</span>
                                            {item.hymn_title && (
                                                <span className="text-xs text-blue-600">#{item.hymn_number}</span>
                                            )}
                                            {item.speaker_name && (
                                                <span className="text-xs text-pink-600">{item.speaker_name}</span>
                                            )}
                                            <span className="text-xs text-muted-foreground">{item.duration_minutes}m</span>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Meeting
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}

export default function CreateMeetingWizard() {
    return (
        <Suspense fallback={
            <div className="max-w-3xl mx-auto p-8">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        }>
            <CreateMeetingContent />
        </Suspense>
    );
}
