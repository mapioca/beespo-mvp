"use client";

import { Template } from "./templates-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, CalendarPlus, Pencil, Clock, Copy } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { TemplateAgendaPreview } from "./template-agenda-preview";

interface TemplateDetailViewProps {
    template: Template;
    onClose: () => void;
    userRole: string;
}

export function TemplateDetailView({ template, onClose, userRole }: TemplateDetailViewProps) {
    const isBeespo = template.is_shared;
    const canEdit = !isBeespo && (userRole === 'leader' || userRole === 'admin');

    return (
        <div className="flex flex-col h-full bg-white shadow-sm border-l animate-in fade-in-0 slide-in-from-right-5 duration-200">
            {/* Header */}
            <div className="p-6 pb-4 border-b bg-white">
                <div className="flex items-start justify-between mb-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Badge variant={isBeespo ? "secondary" : "outline"} className="uppercase text-[10px] tracking-wider">
                                {isBeespo ? "Beespo Template" : "Custom Template"}
                            </Badge>
                            {template.calling_type && (
                                <Badge variant="outline" className="capitalize text-[10px]">
                                    {template.calling_type.replace(/_/g, " ")}
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                            {template.name}
                        </h1>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>Created {formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}</span>
                    </div>
                    {/* Placeholder for future "Used X times" metric */}
                    {/* <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        <span>Used 24 times</span>
                    </div> */}
                </div>

                <div className="flex gap-3">
                    <Button className="flex-1" asChild>
                        <Link href={`/meetings/new?templateId=${template.id}`}>
                            <CalendarPlus className="w-4 h-4 mr-2" />
                            Create Meeting
                        </Link>
                    </Button>

                    {canEdit && (
                        <Button variant="outline" asChild>
                            <Link href={`/templates/${template.id}/edit`}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit Template
                            </Link>
                        </Button>
                    )}

                    {!canEdit && (
                        <Button variant="ghost" size="icon" title="Duplicate (Coming Soon)">
                            <Copy className="w-4 h-4 text-muted-foreground" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
                <div className="p-6 space-y-8 max-w-3xl mx-auto">
                    {/* Description Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wider">Description</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            {template.description || "No description provided for this template."}
                        </p>
                    </div>

                    <Separator />

                    {/* Pending Items Note */}
                    <div className="rounded-lg bg-blue-50/50 border border-blue-100 p-4 text-sm text-blue-800">
                        <p className="font-medium mb-1">Automated Agenda Items</p>
                        <p className="text-blue-600/90">
                            When created, this meeting will automatically include any
                            <span className="font-semibold"> pending business items</span> and
                            <span className="font-semibold"> active announcements</span> appropriate for your workspace.
                        </p>
                    </div>

                    <Separator />

                    {/* Visual Agenda Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wider">Agenda Structure</h3>
                        <div className="bg-gray-50/50 rounded-xl p-6 border">
                            <TemplateAgendaPreview items={template.items || []} />
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
