"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/hooks/use-toast";
import { Database } from "@/types/database";

type Template = Database['public']['Tables']['templates']['Row'];

export default function CreateMeetingWizard() {
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

    useEffect(() => {
        // Fetch available templates
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


    const handleSubmit = async () => {
        if (!selectedTemplate || !date || !title) return;

        setLoading(true);
        const supabase = createClient();

        // Combine date and time
        const [hours, minutes] = time.split(':').map(Number);
        const scheduledDate = new Date(date);
        scheduledDate.setHours(hours, minutes);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
            .rpc('create_meeting_from_template', {
                p_template_id: selectedTemplate,
                p_title: title,
                p_scheduled_date: scheduledDate.toISOString()
            });

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

        // RPC returns UUID string directly
        router.push(`/meetings/${data}`);
        router.refresh();
        setLoading(false);
    };

    return (
        <div className="max-w-3xl mx-auto p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">New Meeting</h1>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <span className={cn(step >= 1 && "text-primary font-medium")}>1. Select Template</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className={cn(step >= 2 && "text-primary font-medium")}>2. Meeting Details</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className={cn(step >= 3 && "text-primary font-medium")}>3. Preview</span>
                </div>
            </div>

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
                        <Button disabled={!title || !date} onClick={() => setStep(3)}>Next: Preview</Button>
                    </CardFooter>
                </Card>
            )}

            {step === 3 && (
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
                        </div>

                        <div className="text-sm text-muted-foreground p-2 border-l-2 bg-blue-50/50 border-blue-200">
                            <p>Note: Pending Business Items and Active Announcements will be automatically added to the agenda upon creation.</p>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
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
