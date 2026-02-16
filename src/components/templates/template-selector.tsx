import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";

interface TemplateSelectorProps {
    value: string | null;
    onChange: (value: string | null) => void;
    disabled?: boolean;
}

interface TemplateStub {
    id: string;
    name: string;
}

export function TemplateSelector({ value, onChange, disabled }: TemplateSelectorProps) {
    const [templates, setTemplates] = useState<TemplateStub[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchTemplates = async () => {
            setIsLoading(true);
            const supabase = createClient();

            const { data, error } = await supabase
                .from("templates")
                .select("id, name")
                .order("name");

            if (error) {
                console.error("Error fetching templates:", error);
                toast.error("Failed to load templates");
            } else {
                setTemplates(data || []);
            }
            setIsLoading(false);
        };

        fetchTemplates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="space-y-2">
            <Label htmlFor="template-selector">Meeting Template (Optional)</Label>
            <Select
                value={value || "none"}
                onValueChange={(val) => onChange(val === "none" ? null : val)}
                disabled={disabled || isLoading}
            >
                <SelectTrigger id="template-selector">
                    <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">None (General)</SelectItem>
                    {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                            {template.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
                Link this item to a specific meeting type (e.g., Ward Council) to have it automatically appear on agendas.
            </p>
        </div>
    );
}
