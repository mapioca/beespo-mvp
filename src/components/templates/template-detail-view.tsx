"use client";

import { useState } from "react";
import { Template } from "./templates-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { X, CalendarPlus, Pencil, Clock, Copy, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { TemplateAgendaPreview } from "./template-agenda-preview";

interface TemplateDetailViewProps {
    template: Template;
    onClose: () => void;
    onDelete?: (templateId: string) => Promise<void>;
    userRole: string;
}

export function TemplateDetailView({ template, onClose, onDelete, userRole }: TemplateDetailViewProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const isBeespo = template.is_shared;
    const canEdit = !isBeespo && (userRole === 'leader' || userRole === 'admin');

    const handleDelete = async () => {
        if (!onDelete) return;
        setIsDeleting(true);
        try {
            await onDelete(template.id);
        } finally {
            setIsDeleting(false);
        }
    };

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

                <div className="flex gap-2">
                    <Button className="flex-1" asChild>
                        <Link href={`/meetings/new?templateId=${template.id}`}>
                            <CalendarPlus className="w-4 h-4 mr-2" />
                            Create Meeting
                        </Link>
                    </Button>

                    {canEdit && (
                        <TooltipProvider delayDuration={300}>
                            <div className="flex gap-1">
                                {/* Edit Button */}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            asChild
                                            aria-label="Edit Template"
                                        >
                                            <Link href={`/templates/${template.id}/edit`}>
                                                <Pencil className="w-4 h-4" />
                                            </Link>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Edit Template</p>
                                    </TooltipContent>
                                </Tooltip>

                                {/* Delete Button with Confirmation */}
                                <AlertDialog>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="Delete Template"
                                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    disabled={isDeleting}
                                                >
                                                    {isDeleting ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </AlertDialogTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Delete Template</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to delete &quot;{template.name}&quot;?
                                                This will permanently remove the template and its agenda structure.
                                                Meetings created from this template will not be affected.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleDelete}
                                                disabled={isDeleting}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                {isDeleting ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Deleting...
                                                    </>
                                                ) : (
                                                    "Delete"
                                                )}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TooltipProvider>
                    )}

                    {!canEdit && (
                        <TooltipProvider delayDuration={300}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Duplicate Template (Coming Soon)"
                                        disabled
                                    >
                                        <Copy className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Duplicate (Coming Soon)</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
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
