import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "@/lib/toast";
import { getTemplateCache, setTemplateCache, getWorkspaceProfile } from "@/lib/cache/form-data-cache";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TemplateSelectorProps {
    value: string[];
    onChange: (value: string[]) => void;
    disabled?: boolean;
    label?: string;
    hideHelperText?: boolean;
    className?: string;
    mode?: "field" | "pill";
    pillLabel?: string;
    pillIcon?: React.ReactNode;
    onTemplatesLoaded?: (templates: TemplateStub[]) => void;
}

interface TemplateStub {
    id: string;
    name: string;
}

export function TemplateSelector({
    value,
    onChange,
    disabled,
    label = "Meeting Template",
    hideHelperText = false,
    className,
    mode = "field",
    pillLabel = "Link to template",
    pillIcon,
    onTemplatesLoaded,
}: TemplateSelectorProps) {
    const [templates, setTemplates] = useState<TemplateStub[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Hydrate from cache on mount — the prefetch from the parent page
    // will have already populated the template cache in most cases.
    useEffect(() => {
        const wp = getWorkspaceProfile();
        const cached = getTemplateCache(wp?.workspaceId ?? null);
        if (cached) {
            setTemplates(cached);
            onTemplatesLoaded?.(cached);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchTemplates = async () => {
        if (isLoading) return;
        setIsLoading(true);
        const supabase = createClient();

        const { data: { user } } = await supabase.auth.getUser();
        let workspaceId: string | null = null;
        if (user) {
            const { data: profile } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
                .select("workspace_id")
                .eq("id", user.id)
                .single();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            workspaceId = (profile as any)?.workspace_id ?? null;
        }

        const cached = getTemplateCache(workspaceId);
        if (cached) {
            setTemplates(cached);
            onTemplatesLoaded?.(cached);
            setIsLoading(false);
            return;
        }

        const filter = workspaceId
            ? `workspace_id.is.null,workspace_id.eq.${workspaceId}`
            : "workspace_id.is.null";

        const { data, error } = await supabase
            .from("templates")
            .select("id, name")
            .or(filter)
            .order("name");

        if (error) {
            console.error("Error fetching templates:", error);
            toast.error("Failed to load templates");
        } else {
            const result = data || [];
            setTemplateCache(workspaceId, result);
            setTemplates(result);
            onTemplatesLoaded?.(result);
        }
        setIsLoading(false);
    };

    const toggleTemplate = (templateId: string) => {
        if (value.includes(templateId)) {
            onChange(value.filter((id) => id !== templateId));
            return;
        }
        onChange([...value, templateId]);
    };

    const selectedLabel =
        value.length === 0
            ? "Select template(s)..."
            : value.length === 1
                ? templates.find((template) => template.id === value[0])?.name ?? "1 template selected"
                : `${value.length} templates selected`;

    if (mode === "pill") {
        const isActive = value.length > 0;

        return (
            <DropdownMenu onOpenChange={(open) => { if (open && templates.length === 0) fetchTemplates(); }}>
                <DropdownMenuTrigger asChild>
                    <Button
                        id="template-selector-trigger"
                        type="button"
                        variant="outline"
                        disabled={disabled || isLoading}
                        className={cn(
                            "h-7 rounded-full px-2.5 text-[11px] font-medium shadow-sm transition-colors",
                            isActive
                                ? "border-transparent bg-[hsl(var(--chip-active-bg))] text-[hsl(var(--chip-active-text))]"
                                : "border-[hsl(var(--chip-border))] bg-background text-[hsl(var(--chip-text))] hover:bg-[hsl(var(--chip-hover-bg))]"
                        )}
                    >
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                            {pillIcon}
                            {pillLabel}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[14rem]">
                    {templates.map((template) => (
                        <DropdownMenuCheckboxItem
                            key={template.id}
                            checked={value.includes(template.id)}
                            onCheckedChange={() => toggleTemplate(template.id)}
                            onSelect={(event) => event.preventDefault()}
                        >
                            {template.name}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <div className={`space-y-2 ${className ?? ""}`}>
            <Label htmlFor="template-selector-trigger">{label}</Label>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        id="template-selector-trigger"
                        type="button"
                        variant="outline"
                        disabled={disabled || isLoading}
                        className="w-full justify-between rounded-xl border-input bg-background px-3 font-normal text-foreground hover:bg-background"
                    >
                        <span className="truncate">{selectedLabel}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[14rem]">
                    {templates.map((template) => (
                        <DropdownMenuCheckboxItem
                            key={template.id}
                            checked={value.includes(template.id)}
                            onCheckedChange={() => toggleTemplate(template.id)}
                            onSelect={(event) => event.preventDefault()}
                        >
                            {template.name}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            {!hideHelperText && (
                <p className="text-xs text-muted-foreground">
                    Link this item to a specific meeting type (e.g., Ward Council) to have it automatically appear on agendas.
                </p>
            )}
        </div>
    );
}
