"use client";

import { useState } from "react";
import { Search, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Template } from "./templates-layout";

interface TemplatesListProps {
    templates: Template[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export function TemplatesList({ templates, selectedId, onSelect }: TemplatesListProps) {
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<"all" | "beespo" | "custom">("all");

    const filteredTemplates = templates.filter(template => {
        const matchesSearch = template.name.toLowerCase().includes(search.toLowerCase()) ||
            (template.description?.toLowerCase() || "").includes(search.toLowerCase());

        const isBeespo = template.is_shared;
        const matchesType = typeFilter === "all"
            ? true
            : typeFilter === "beespo"
                ? isBeespo
                : !isBeespo;

        return matchesSearch && matchesType;
    });

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b space-y-4 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Templates</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        {templates.length} templates available
                    </p>
                </div>

                <div className="space-y-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search templates..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 bg-white"
                        />
                    </div>
                    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "all" | "beespo" | "custom")}>
                        <SelectTrigger className="w-full bg-white">
                            <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Templates</SelectItem>
                            <SelectItem value="beespo">Beespo Templates</SelectItem>
                            <SelectItem value="custom">Custom Templates</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                    {filteredTemplates.length > 0 ? (
                        filteredTemplates.map(template => (
                            <div
                                key={template.id}
                                onClick={() => onSelect(template.id)}
                                className={cn(
                                    "group flex flex-col gap-2 p-3 rounded-lg border text-left transition-all hover:bg-accent/50 cursor-pointer",
                                    selectedId === template.id ? "bg-accent border-primary/50 shadow-sm" : "bg-white border-transparent hover:border-border"
                                )}
                            >
                                <div className="flex w-full items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "p-2 rounded-md",
                                            selectedId === template.id ? "bg-background text-primary" : "bg-primary/10 text-primary"
                                        )}>
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <span className="font-semibold text-sm line-clamp-1">
                                            {template.name}
                                        </span>
                                    </div>
                                    <Badge variant={template.is_shared ? "secondary" : "outline"} className="text-[10px] uppercase shrink-0">
                                        {template.is_shared ? "Beespo" : "Custom"}
                                    </Badge>
                                </div>
                                <div className="pl-11">
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {template.description || "No description provided."}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                                        <span>{template.items?.length || 0} agenda items</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            No templates found matching your search.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
