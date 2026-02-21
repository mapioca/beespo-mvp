"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Users,
    UserCheck,
    ChevronRight,
    Building2,
    Clock
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { CallingProcessStage, CallingProcessStatus } from "@/types/database";

interface CallingCandidate {
    id: string;
    status: string;
    notes: string | null;
    candidate: { id: string; name: string } | null;
}

interface CallingProcess {
    id: string;
    current_stage: CallingProcessStage;
    status: CallingProcessStatus;
    candidate: { id: string; name: string } | null;
}

interface Calling {
    id: string;
    title: string;
    organization: string | null;
    is_filled: boolean;
    filled_by_name: { id: string; name: string } | null;
    candidates: CallingCandidate[];
    processes: CallingProcess[];
    created_at: string;
}

interface CallingCardProps {
    calling: Calling;
    onClick?: () => void;
}

export function CallingCard({ calling, onClick }: CallingCardProps) {
    const t = useTranslations("Callings.card");
    const ts = useTranslations("Callings.stages");
    const activeProcess = calling.processes.find(p => p.status === 'active');
    const candidateCount = calling.candidates.filter(c => c.status !== 'archived').length;

    return (
        <Card
            className={cn(
                "transition-all hover:shadow-md cursor-pointer group",
                calling.is_filled && "bg-green-50/50 border-green-200"
            )}
            onClick={onClick}
        >
            <CardHeader className="p-4 pb-2 flex flex-row justify-between items-start space-y-0">
                <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="font-semibold leading-tight truncate">
                        {calling.title}
                    </h3>
                    {calling.organization && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="w-3 h-3" />
                            <span className="truncate">{calling.organization}</span>
                        </div>
                    )}
                </div>
                {calling.is_filled ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 shrink-0">
                        <UserCheck className="w-3 h-3 mr-1" />
                        {t("filled")}
                    </Badge>
                ) : activeProcess ? (
                    <Badge variant="default" className="shrink-0">
                        <Clock className="w-3 h-3 mr-1" />
                        {ts(activeProcess.current_stage as CallingProcessStage)}
                    </Badge>
                ) : (
                    <Badge variant="outline" className="shrink-0">
                        {t("open")}
                    </Badge>
                )}
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {candidateCount > 0 && (
                            <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {t("candidates", { count: candidateCount })}
                            </div>
                        )}
                        {activeProcess?.candidate && (
                            <div className="flex items-center gap-1 text-primary font-medium">
                                <UserCheck className="w-3 h-3" />
                                {activeProcess.candidate.name}
                            </div>
                        )}
                        {calling.is_filled && calling.filled_by_name && (
                            <div className="flex items-center gap-1 text-green-700 font-medium">
                                <UserCheck className="w-3 h-3" />
                                {calling.filled_by_name.name}
                            </div>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
