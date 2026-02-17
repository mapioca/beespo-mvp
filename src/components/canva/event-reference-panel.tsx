"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { Calendar, Clock, MapPin, FileText, Copy, Check } from "lucide-react";

interface EventReferencePanelProps {
    title: string;
    date: string;
    time: string;
    location: string | null;
    description: string | null;
}

interface CopyableFieldProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
}

function CopyableField({ icon: Icon, label, value }: CopyableFieldProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            toast.success("Copied", { description: `${label} copied to clipboard` });
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy", { description: "Please try again" });
        }
    };

    return (
        <div className="flex items-start gap-3 group">
            <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm truncate">{value}</p>
            </div>
            <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleCopy}
            >
                {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                ) : (
                    <Copy className="h-3 w-3" />
                )}
            </Button>
        </div>
    );
}

export function EventReferencePanel({
    title,
    date,
    time,
    location,
    description,
}: EventReferencePanelProps) {
    const handleCopyAll = async () => {
        const text = [
            `Event: ${title}`,
            `Date: ${date}`,
            `Time: ${time}`,
            location ? `Location: ${location}` : null,
            description ? `\n${description}` : null,
        ]
            .filter(Boolean)
            .join("\n");

        try {
            await navigator.clipboard.writeText(text);
            toast.success("Copied", { description: "All event details copied to clipboard" });
        } catch {
            toast.error("Failed to copy", { description: "Please try again" });
        }
    };

    return (
        <Card className="bg-muted/50">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Event Details</CardTitle>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1"
                        onClick={handleCopyAll}
                    >
                        <Copy className="h-3 w-3" />
                        Copy All
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Use these details in your Canva design
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                <CopyableField icon={FileText} label="Title" value={title} />
                <CopyableField icon={Calendar} label="Date" value={date} />
                <CopyableField icon={Clock} label="Time" value={time} />
                {location && (
                    <CopyableField icon={MapPin} label="Location" value={location} />
                )}
                {description && (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Description</p>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6 line-clamp-3">
                            {description}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
