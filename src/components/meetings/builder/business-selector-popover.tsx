"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { Plus, X, Search, Check, FileText, Megaphone } from "lucide-react";
import {
    generateBusinessScript,
    PRIESTHOOD_OFFICES,
    getPriesthoodFromOffice,
    type Language,
    type Gender,
    type PriesthoodOffice,
    type BusinessItemDetails
} from "@/lib/business-script-generator";

interface BusinessItem {
    id: string;
    person_name: string;
    position_calling: string | null;
    category: string;
    notes: string | null;
    status: string;
    details: BusinessItemDetails | null;
}

export interface BusinessSelection {
    id: string;
    person_name: string;
    position_calling: string | null;
    category: string;
    notes: string | null;
    details: BusinessItemDetails | null;
    generated_script?: string;
}

interface BusinessSelectorPopoverProps {
    children: React.ReactNode;
    onSelect: (items: BusinessSelection[]) => void;
}

const CATEGORY_OPTIONS = [
    {
        value: "sustaining",
        label: "Sustaining",
        description: "Propose someone for a calling",
        requiresCalling: true,
        requiresGender: true,
    },
    {
        value: "release",
        label: "Release",
        description: "Release someone from a calling",
        requiresCalling: true,
        requiresGender: true,
    },
    {
        value: "confirmation",
        label: "Confirmation",
        description: "Accept a new member into fellowship",
        requiresCalling: false,
        requiresGender: true,
    },
    {
        value: "ordination",
        label: "Ordination",
        description: "Ordain to a priesthood office",
        requiresCalling: false,
        requiresGender: false, // Always male
        requiresOffice: true,
    },
    {
        value: "setting_apart",
        label: "Setting Apart",
        description: "Sustain and set apart for a calling",
        requiresCalling: true,
        requiresGender: true,
    },
    {
        value: "other",
        label: "Other",
        description: "Custom business item",
        requiresCalling: false,
        requiresGender: false,
    },
];

export function BusinessSelectorPopover({
    children,
    onSelect,
}: BusinessSelectorPopoverProps) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<BusinessItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");

    // Creation state
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newName, setNewName] = useState("");
    const [newCategory, setNewCategory] = useState("sustaining");
    const [newCalling, setNewCalling] = useState("");
    const [newNotes, setNewNotes] = useState("");

    // Details state
    const [newLanguage, setNewLanguage] = useState<Language>("ENG");
    const [newGender, setNewGender] = useState<Gender | undefined>("male");
    const [newOffice, setNewOffice] = useState<PriesthoodOffice | undefined>();
    const [newCustomScript, setNewCustomScript] = useState("");

    // Template linking state
    const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    const categoryConfig = useMemo(() =>
        CATEGORY_OPTIONS.find((c) => c.value === newCategory),
        [newCategory]
    );

    const scriptPreview = useMemo(() => {
        if (!newCategory) return "";
        return generateBusinessScript({
            person_name: newName || "[Name]",
            position_calling: newCalling || null,
            category: newCategory,
            notes: newNotes || null,
            details: {
                language: newLanguage,
                gender: newCategory === "ordination" ? "male" : newGender,
                office: newOffice,
                priesthood: newOffice ? getPriesthoodFromOffice(newOffice) : undefined,
                customScript: newCategory === "other" ? newCustomScript : undefined,
            },
        });
    }, [newName, newCalling, newCategory, newNotes, newGender, newOffice, newCustomScript, newLanguage]);

    useEffect(() => {
        if (open && items.length === 0) {
            loadItems();
        }
        if (open && templates.length === 0) {
            loadTemplates();
        }
    }, [open, items.length, templates.length]);

    // Reset state every time popover opens
    useEffect(() => {
        if (open) {
            setSearch("");
            setSelectedCategory("all");
            setSelectedIds(new Set());
            // Reset creation state
            setNewName("");
            setNewCategory("sustaining");
            setNewLanguage("ENG");
            setNewCalling("");
            setNewNotes("");
            setNewGender("male");
            setNewOffice(undefined);
            setNewCustomScript("");
            setSelectedTemplateIds([]);
        }
    }, [open]);

    const loadItems = async () => {
        setIsLoading(true);
        const supabase = createClient();

        try {
            const { data: { user } } = await supabase.auth.getUser();
            let workspaceId: string | null = null;

            if (user) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: profile } = await (supabase.from("profiles") as any)
                    .select("workspace_id")
                    .eq("id", user.id)
                    .single();
                workspaceId = profile?.workspace_id ?? null;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let query = (supabase.from("business_items") as any)
                .select("id, person_name, position_calling, category, notes, status, details")
                .eq("status", "pending")
                .order("created_at", { ascending: false });

            if (workspaceId) {
                query = query.eq("workspace_id", workspaceId);
            }

            const { data, error } = await query;
            if (error) console.error("Error loading business items:", error);
            if (data) setItems(data);
        } catch (err) {
            console.error("Error loading business items:", err);
        }

        setIsLoading(false);
    };

    const loadTemplates = async () => {
        setLoadingTemplates(true);
        const supabase = createClient();
        try {
            const { data, error } = await supabase
                .from("templates")
                .select("id, name")
                .order("name");
            if (error) {
                console.error("Error loading templates:", error);
            } else {
                setTemplates(data || []);
            }
        } catch (err) {
            console.error("Error loading templates:", err);
        }
        setLoadingTemplates(false);
    };

    const toggleTemplate = (templateId: string) => {
        setSelectedTemplateIds((prev) =>
            prev.includes(templateId)
                ? prev.filter((id) => id !== templateId)
                : [...prev, templateId]
        );
    };

    const filtered = useMemo(() => {
        const searchLower = search.toLowerCase().trim();
        return items.filter((item) => {
            if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
            if (!searchLower) return true;
            return (
                item.person_name.toLowerCase().includes(searchLower) ||
                (item.position_calling?.toLowerCase().includes(searchLower) ?? false) ||
                (item.notes?.toLowerCase().includes(searchLower) ?? false)
            );
        });
    }, [items, search, selectedCategory]);

    const toggleItem = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleConfirm = () => {
        const selected = items.filter((item) => selectedIds.has(item.id));
        onSelect(selected.map((item) => ({
            id: item.id,
            person_name: item.person_name,
            position_calling: item.position_calling,
            category: item.category,
            notes: item.notes,
            details: item.details,
            generated_script: generateBusinessScript(item)
        })));
        setOpen(false);
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setIsSubmitting(true);

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error("Not authenticated.");
            setIsSubmitting(false);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase.from("profiles") as any)
            .select("workspace_id")
            .eq("id", user.id)
            .single();

        if (!profile?.workspace_id) {
            toast.error("Could not determine workspace.");
            setIsSubmitting(false);
            return;
        }

        const details = {
            language: newLanguage,
            gender: newCategory === "ordination" ? "male" : newGender,
            office: newOffice,
            priesthood: newOffice ? getPriesthoodFromOffice(newOffice) : undefined,
            customScript: newCategory === "other" ? newCustomScript : undefined,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from("business_items") as any)
            .insert({
                person_name: newName.trim(),
                position_calling: newCalling.trim() || null,
                category: newCategory,
                notes: newNotes.trim() || null,
                details: details,
                status: "pending",
                workspace_id: profile.workspace_id,
                created_by: user.id,
            })
            .select()
            .single();

        if (!error && data) {
            // Link to templates
            if (selectedTemplateIds.length > 0) {
                for (const templateId of selectedTemplateIds) {
                    await (supabase
                        .from("business_templates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                        .insert({
                            business_item_id: data.id,
                            template_id: templateId,
                        });
                }
            }

            setItems((prev) => [data, ...prev]);
            setSelectedIds((prev) => new Set(prev).add(data.id));
            setIsCreating(false);
            setNewName("");
            setNewCalling("");
            setNewNotes("");
            setNewCategory("sustaining");
            setNewLanguage("ENG");
            setNewGender("male");
            setNewOffice(undefined);
            setNewCustomScript("");
            setSelectedTemplateIds([]);
            toast.success("Business item created.");
        } else if (error) {
            toast.error("Failed to create business item.", { description: error.message });
        }

        setIsSubmitting(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent
                side="left"
                align="start"
                className="w-[340px] p-4 flex flex-col gap-3 shadow-xl"
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {isCreating ? "New Business Item" : "Select Business Items"}
                    </h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setIsCreating(!isCreating)}
                    >
                        {isCreating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </Button>
                </div>

                {isCreating ? (
                    <ScrollArea className="h-[400px] w-full pr-3">
                        <div className="space-y-3 pb-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Person Name
                                </Label>
                                <Input
                                    placeholder="e.g. John Doe"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="h-8 text-xs"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Category
                                </Label>
                                <Select value={newCategory} onValueChange={setNewCategory}>
                                    <SelectTrigger className="h-8 w-full text-xs">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORY_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Script Language
                                </Label>
                                <Select value={newLanguage} onValueChange={(v) => setNewLanguage(v as Language)}>
                                    <SelectTrigger className="h-8 w-full text-xs">
                                        <SelectValue placeholder="Select language" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ENG" className="text-xs">English</SelectItem>
                                        <SelectItem value="SPA" className="text-xs">Español</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Conditional Fields */}
                            {categoryConfig?.requiresCalling && (
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Position/Calling
                                    </Label>
                                    <Input
                                        placeholder="e.g. Elders Quorum President"
                                        value={newCalling}
                                        onChange={(e) => setNewCalling(e.target.value)}
                                        className="h-8 text-xs"
                                    />
                                </div>
                            )}

                            {categoryConfig?.requiresOffice && (
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Priesthood Office
                                    </Label>
                                    <Select value={newOffice} onValueChange={(v) => setNewOffice(v as PriesthoodOffice)}>
                                        <SelectTrigger className="h-8 w-full text-xs">
                                            <SelectValue placeholder="Select office" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <div className="p-1 text-[10px] font-bold text-muted-foreground uppercase bg-muted/50 rounded-t-sm">Aaronic</div>
                                            {PRIESTHOOD_OFFICES.filter(o => o.priesthood === "aaronic").map((o) => (
                                                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                                            ))}
                                            <div className="p-1 text-[10px] font-bold text-muted-foreground uppercase bg-muted/50">Melchizedek</div>
                                            {PRIESTHOOD_OFFICES.filter(o => o.priesthood === "melchizedek").map((o) => (
                                                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {categoryConfig?.requiresGender && (
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Gender (for pronouns)
                                    </Label>
                                    <RadioGroup
                                        value={newGender}
                                        onValueChange={(v) => setNewGender(v as Gender)}
                                        className="flex gap-4 pt-1"
                                    >
                                        <div className="flex items-center space-x-1.5">
                                            <RadioGroupItem value="male" id="m" className="h-3.5 w-3.5" />
                                            <Label htmlFor="m" className="text-[11px] font-normal cursor-pointer">Male</Label>
                                        </div>
                                        <div className="flex items-center space-x-1.5">
                                            <RadioGroupItem value="female" id="f" className="h-3.5 w-3.5" />
                                            <Label htmlFor="f" className="text-[11px] font-normal cursor-pointer">Female</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            )}

                            {newCategory === "other" && (
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Custom Script (Optional)
                                    </Label>
                                    <textarea
                                        placeholder="Enter custom script..."
                                        value={newCustomScript}
                                        onChange={(e) => setNewCustomScript(e.target.value)}
                                        className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Notes (Internal)
                                </Label>
                                <Input
                                    placeholder="Any additional details..."
                                    value={newNotes}
                                    onChange={(e) => setNewNotes(e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>

                            {/* Script Preview */}
                            <div className="mt-2 p-2.5 rounded-md bg-blue-50 border border-blue-100 space-y-1">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                                    <FileText className="h-3 w-3" />
                                    Conducting Script
                                </div>
                                <p className="text-[11px] text-blue-900 leading-relaxed font-serif italic">
                                    {scriptPreview || "Complete the form to see the script..."}
                                </p>
                            </div>

                            {/* Template Association */}
                            <div className="space-y-2 pt-2 border-t mt-2">
                                <div className="flex items-center gap-2">
                                    <Megaphone className="h-3 w-3 text-amber-500" />
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Applies to Templates
                                    </Label>
                                </div>

                                {loadingTemplates ? (
                                    <p className="text-[10px] text-muted-foreground">Loading templates...</p>
                                ) : templates.length === 0 ? (
                                    <p className="text-[10px] text-muted-foreground">No templates available.</p>
                                ) : (
                                    <div className="grid grid-cols-1 gap-1.5 max-h-32 overflow-y-auto p-2 border rounded-md">
                                        {templates.map((template) => (
                                            <div key={template.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`biz-template-${template.id}`}
                                                    checked={selectedTemplateIds.includes(template.id)}
                                                    onCheckedChange={() => toggleTemplate(template.id)}
                                                    className="h-3.5 w-3.5"
                                                />
                                                <Label
                                                    htmlFor={`biz-template-${template.id}`}
                                                    className="text-[11px] cursor-pointer truncate"
                                                >
                                                    {template.name}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2 sticky bottom-0 bg-background pb-1">
                                <Button
                                    size="sm"
                                    className="flex-1 h-8 text-xs"
                                    onClick={handleCreate}
                                    disabled={!newName.trim() || isSubmitting}
                                >
                                    {isSubmitting ? "Creating..." : "Create & Select"}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    onClick={() => setIsCreating(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </ScrollArea>
                ) : (
                    <>
                        {/* Filters */}
                        <div className="space-y-2">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Category
                                </label>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="h-8 w-full text-xs">
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORY_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Search
                                </label>
                                <div className="relative">
                                    <Search
                                        className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
                                    />
                                    <Input
                                        placeholder="Search by name or calling..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-8 h-8 text-xs"
                                        autoFocus={open}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Results */}
                        <ScrollArea className="h-[240px] border-t pt-2 w-full">
                            {isLoading ? (
                                <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center h-full">
                                    Loading business items...
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center h-full">
                                    No business items found
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1 pr-3">
                                    {filtered.map((item) => {
                                        const isSelected = selectedIds.has(item.id);
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => toggleItem(item.id)}
                                                className={cn(
                                                    "w-full text-left p-2.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-2.5 group",
                                                    isSelected && "bg-accent/60 border border-border"
                                                )}
                                            >
                                                <div className={cn(
                                                    "h-4 w-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                                                    isSelected
                                                        ? "bg-primary border-primary text-primary-foreground"
                                                        : "border-border bg-background"
                                                )}>
                                                    {isSelected && <Check className="h-2.5 w-2.5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-medium truncate">
                                                            {item.person_name}
                                                            {item.position_calling ? ` — ${item.position_calling}` : ""}
                                                        </span>
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-[10px] px-1.5 py-0 shrink-0 capitalize"
                                                        >
                                                            {item.category.replace(/_/g, " ")}
                                                        </Badge>
                                                    </div>
                                                    {item.notes && (
                                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                            {item.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>

                        {/* Confirm */}
                        <div className="border-t pt-3">
                            <Button
                                type="button"
                                size="sm"
                                className="w-full h-8 text-xs"
                                disabled={selectedIds.size === 0}
                                onClick={handleConfirm}
                            >
                                Add {selectedIds.size > 0 ? `${selectedIds.size} ` : ""}
                                {selectedIds.size === 1 ? "business item" : "business items"}
                            </Button>
                        </div>
                    </>
                )}
            </PopoverContent>
        </Popover>
    );
}
