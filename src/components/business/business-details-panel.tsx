"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    DetailsPanel,
    DetailsPanelSection,
    DetailsPanelField,
} from "@/components/ui/details-panel";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PickerModal } from "@/components/ui/picker-modal";
import { Input } from "@/components/ui/input";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    CircleDashed,
    CircleCheck,
    UserCheck,
    UserMinus,
    Flame,
    Award,
    Check,
} from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import {
    getWorkspaceProfile,
    getDirectoryCache,
    setDirectoryCache,
    type DirectoryPersonCacheEntry,
} from "@/lib/cache/form-data-cache";
import callingsCatalog from "@/data/callings.json";
import { cn } from "@/lib/utils";
import {
    generateBusinessScript,
    getPriesthoodFromOffice,
    PRIESTHOOD_OFFICES,
    type Gender,
    type Language,
    type PriesthoodOffice,
} from "@/lib/business-script-generator";
import type { BusinessItem } from "./business-table";

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: "pending", label: "Pending", icon: CircleDashed },
    { value: "completed", label: "Completed", icon: CircleCheck },
];

const CATEGORY_OPTIONS = [
    { value: "sustaining", label: "Sustaining", icon: UserCheck },
    { value: "release", label: "Release", icon: UserMinus },
    { value: "ordination", label: "Ordination", icon: Award },
    { value: "confirmation_ordinance", label: "Confirmation", icon: Flame },
    { value: "new_member_welcome", label: "New Member Welcome", icon: UserCheck },
    { value: "child_blessing", label: "Child Blessing", icon: Award },
    { value: "records_received", label: "Records Received", icon: UserCheck },
    { value: "miscellaneous", label: "Miscellaneous", icon: Award },
];
// ── Callings catalog helpers ─────────────────────────────────────────────────

type CallingLevel = "ward" | "branch" | "stake" | "district";

interface CallingCatalogEntry {
    id: string;
    organization: string;
    level: CallingLevel;
    labels: { en: string; es: string };
    active: boolean;
}

function mapWorkspaceTypeToCallingLevel(type: string | null): CallingLevel | null {
    if (type === "group") return "ward";
    if (type === "ward" || type === "branch" || type === "stake" || type === "district") {
        return type;
    }
    return null;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface BusinessDetailsPanelProps {
    item: BusinessItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDelete: (id: string) => Promise<void>;
}

// ── Shared control styles ────────────────────────────────────────────────────

const inlineSelectTrigger =
    "h-7 border-0 bg-transparent shadow-none px-1.5 hover:bg-muted/50 rounded-md focus:ring-0 text-drawer-value font-medium";
const selectContentClass =
    "rounded-xl border border-border/60 bg-[hsl(var(--menu))] p-1 text-[hsl(var(--menu-text))] shadow-lg";
const selectItemClass =
    "rounded-md px-2.5 py-1.5 text-drawer-menu-item font-medium leading-none tracking-normal focus:bg-[hsl(var(--menu-hover))] focus:text-[hsl(var(--menu-text))]";

// ── Component ────────────────────────────────────────────────────────────────

export function BusinessDetailsPanel({
    item,
    open,
    onOpenChange,
    onDelete,
}: BusinessDetailsPanelProps) {
    const router = useRouter();

    // Form state
    const [personName, setPersonName] = useState("");
    const [positionCalling, setPositionCalling] = useState("");
    const [category, setCategory] = useState("");
    const [status, setStatus] = useState("pending");
    const [language, setLanguage] = useState<Language>("ENG");
    const [gender, setGender] = useState<Gender | undefined>();
    const [office, setOffice] = useState<PriesthoodOffice | undefined>();
    const [notes, setNotes] = useState("");

    // Person combobox state
    const [selectedPersonId, setSelectedPersonId] = useState("");
    const [personOpen, setPersonOpen] = useState(false);
    const [personSearch, setPersonSearch] = useState("");
    const [directoryPeople, setDirectoryPeople] = useState<DirectoryPersonCacheEntry[]>([]);
    const [isDirectoryLoading, setIsDirectoryLoading] = useState(false);

    // Calling combobox state
    const [selectedCallingId, setSelectedCallingId] = useState("");
    const [callingOpen, setCallingOpen] = useState(false);
    const [callingSearch, setCallingSearch] = useState("");
    const [workspaceCallingLevel, setWorkspaceCallingLevel] = useState<CallingLevel | null>(null);

    // UI state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Calling catalog computed values
    const availableCallings = useMemo(() => {
        const callings = callingsCatalog as CallingCatalogEntry[];
        return callings.filter(
            (c) => c.active && (workspaceCallingLevel ? c.level === workspaceCallingLevel : false)
        );
    }, [workspaceCallingLevel]);

    const filteredCallings = useMemo(() => {
        if (!callingSearch.trim()) return availableCallings;
        const q = callingSearch.toLowerCase();
        return availableCallings.filter(
            (c) =>
                c.labels.en.toLowerCase().includes(q) ||
                c.labels.es.toLowerCase().includes(q) ||
                c.organization.toLowerCase().includes(q)
        );
    }, [availableCallings, callingSearch]);
    useMemo(
        () => availableCallings.find((c) => c.id === selectedCallingId) ?? null,
        [availableCallings, selectedCallingId]
    );
    const languageKey = language === "SPA" ? "es" : "en";

    const filteredPeople = useMemo(() => {
        if (!personSearch.trim()) return directoryPeople;
        const q = personSearch.toLowerCase();
        return directoryPeople.filter((p) => p.name.toLowerCase().includes(q));
    }, [directoryPeople, personSearch]);

    const selectedPerson = useMemo(
        () => directoryPeople.find((p) => p.id === selectedPersonId) ?? null,
        [directoryPeople, selectedPersonId]
    );

    // Load workspace calling level + directory from cache or Supabase on mount
    useEffect(() => {
        const wp = getWorkspaceProfile();
        if (wp) {
            setWorkspaceCallingLevel(mapWorkspaceTypeToCallingLevel(wp.workspaceType));
            const cached = getDirectoryCache(wp.workspaceId);
            if (cached) {
                setDirectoryPeople(cached);
                return;
            }
        }
        // Fallback: fetch from Supabase
        (async () => {
            setIsDirectoryLoading(true);
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setIsDirectoryLoading(false); return; }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: profile } = await (supabase.from("profiles") as any)
                .select("workspace_id, workspaces(type)")
                .eq("id", user.id)
                .single();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const workspaceId: string | null = (profile as any)?.workspace_id ?? null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const type = ((profile as any)?.workspaces?.type as string | null) ?? null;
            setWorkspaceCallingLevel(mapWorkspaceTypeToCallingLevel(type));
            if (!workspaceId) { setIsDirectoryLoading(false); return; }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase.from("directory") as any)
                .select("id, name, gender")
                .eq("workspace_id", workspaceId)
                .order("name");
            if (data) {
                setDirectoryCache(workspaceId, data as DirectoryPersonCacheEntry[]);
                setDirectoryPeople(data as DirectoryPersonCacheEntry[]);
            }
            setIsDirectoryLoading(false);
        })();
    }, []);

    // Sync state when the selected item changes
    useEffect(() => {
        if (item) {
            setPersonName(item.person_name);
            setPositionCalling(item.position_calling ?? "");
            setCategory(item.category);
            setStatus(item.status);
            setLanguage(item.details?.language ?? "ENG");
            setGender(item.details?.gender);
            setOffice(item.details?.office);
            setNotes(item.notes ?? "");
            setSelectedPersonId(""); // resolved by directory-match effect below
            setSelectedCallingId(""); // resolved by catalog-match effect below
        }
    }, [item]);

    // Once directory is available, try to match person_name against it
    useEffect(() => {
        if (!item?.person_name || !directoryPeople.length) return;
        const match = directoryPeople.find((p) => p.name === item.person_name);
        setSelectedPersonId(match?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item?.id, item?.person_name, directoryPeople]);

    // Once callings catalog is available, try to match position_calling against it
    useEffect(() => {
        if (!item?.position_calling || !availableCallings.length) return;
        const match = availableCallings.find(
            (c) =>
                c.labels.en === item.position_calling ||
                c.labels.es === item.position_calling
        );
        setSelectedCallingId(match?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item?.id, item?.position_calling, availableCallings]);

    // ── Conducting script (live preview) ───────────────────────────────────
    useMemo(() => {
        if (!personName || !category) return "";
        const priesthood = office ? getPriesthoodFromOffice(office) : item?.details?.priesthood;
        return generateBusinessScript({
            person_name: personName,
            position_calling: positionCalling || null,
            category,
            notes: notes || null,
            details: {
                ...(item?.details ?? {}),
                language,
                gender: gender ?? selectedPerson?.gender ?? undefined,
                office,
                priesthood,
            },
        });
    }, [personName, positionCalling, category, notes, item?.details, language, gender, selectedPerson?.gender, office]);
// ── Auto-save ───────────────────────────────────────────────────────────

    const saveFields = useCallback(
        async (fields: Record<string, unknown>) => {
            if (!item) return;
            const supabase = createClient();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from("business_items") as any)
                .update(fields)
                .eq("id", item.id);
            if (error) {
                toast.error("Failed to save", { description: error.message });
            } else {
                router.refresh();
            }
        },
        [item, router]
    );

    const handleCategoryChange = (val: string) => {
        setCategory(val);
        saveFields({ category: val });
    };

    const handleStatusChange = (val: string) => {
        setStatus(val);
        saveFields({
            status: val,
            action_date:
                val === "completed"
                    ? new Date().toISOString().split("T")[0]
                    : null,
        });
    };

    const handleLanguageChange = (val: string) => {
        setLanguage(val as Language);
        saveFields({
            details: {
                ...(item?.details ?? {}),
                language: val,
                gender: gender ?? selectedPerson?.gender ?? undefined,
                office,
                priesthood: office ? getPriesthoodFromOffice(office) : item?.details?.priesthood,
            },
        });
    };

    const handleOfficeChange = (val: string) => {
        const nextOffice = val as PriesthoodOffice;
        setOffice(nextOffice);
        saveFields({
            details: {
                ...(item?.details ?? {}),
                language,
                gender: gender ?? selectedPerson?.gender ?? undefined,
                office: nextOffice,
                priesthood: getPriesthoodFromOffice(nextOffice),
            },
        });
    };
    const handlePersonSelect = (personId: string) => {
        const person = directoryPeople.find((p) => p.id === personId);
        if (!person) return;
        setSelectedPersonId(personId);
        setPersonName(person.name);
        setGender(person.gender ?? undefined);
        setPersonOpen(false);
        saveFields({
            person_name: person.name,
            details: {
                ...(item?.details ?? {}),
                language,
                gender: person.gender ?? undefined,
                office,
                priesthood: office ? getPriesthoodFromOffice(office) : item?.details?.priesthood,
            },
        });
    };

    const handleCallingSelect = (callingId: string, labelOverride?: string) => {
        const calling = availableCallings.find((c) => c.id === callingId);
        if (!calling) return;
        const label = labelOverride ?? calling.labels[languageKey];
        setSelectedCallingId(callingId);
        setPositionCalling(label);
        setCallingOpen(false);
        saveFields({ position_calling: label });
    };

    const handleCallingClear = () => {
        setSelectedCallingId("");
        setPositionCalling("");
        saveFields({ position_calling: null });
    };

    const handleNotesBlur = () => {
        if (!item || notes.trim() === (item.notes ?? "")) return;
        saveFields({ notes: notes.trim() || null });
    };

    // ── Delete ──────────────────────────────────────────────────────────────

    const handleDelete = async () => {
        if (!item) return;
        setIsDeleting(true);
        await onDelete(item.id);
        setIsDeleting(false);
        setShowDeleteDialog(false);
        onOpenChange(false);
    };

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <>
            <DetailsPanel
                open={open}
                onOpenChange={onOpenChange}
                onDelete={() => setShowDeleteDialog(true)}
            >
                {/* Person Name + Calling */}
                <DetailsPanelSection>
                    <Input
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        onClick={() => setPersonOpen(true)}
                        placeholder="Select person..."
                        readOnly
                        className="border-0 bg-transparent shadow-none px-0 h-auto text-[15px] font-semibold placeholder:text-muted-foreground/50 focus-visible:ring-0 cursor-pointer hover:text-foreground/80 transition-colors"
                    />
                    <PickerModal
                        open={personOpen}
                        onOpenChange={setPersonOpen}
                        title="Assign person"
                        searchSlot={
                            <input
                                className="w-full bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                                placeholder={isDirectoryLoading ? "Loading..." : "Search members..."}
                                value={personSearch}
                                onChange={(e) => setPersonSearch(e.target.value)}
                                autoFocus
                            />
                        }
                    >
                        {isDirectoryLoading ? (
                            <div className="flex items-center justify-center py-10">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                            </div>
                        ) : filteredPeople.length === 0 ? (
                            <div className="px-5 py-8 text-center text-[13px] text-muted-foreground">
                                No members match.
                            </div>
                        ) : (
                            filteredPeople.map((person) => (
                                <button
                                    key={person.id}
                                    type="button"
                                    onClick={() => handlePersonSelect(person.id)}
                                    className="flex w-full items-center gap-3 px-[18px] py-2 text-left transition-colors hover:bg-surface-hover"
                                >
                                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-sunken text-[11px] font-semibold text-muted-foreground">
                                        {person.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-serif text-[14.5px] text-foreground">
                                            {person.name}
                                        </div>
                                        <div className="truncate text-[11.5px] text-muted-foreground">
                                            Directory member
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </PickerModal>
                    {category === "ordination" ? (
                        <Select value={office} onValueChange={handleOfficeChange}>
                            <SelectTrigger className="h-auto w-full justify-start gap-1 border-0 bg-transparent px-0 py-0 text-drawer-meta font-normal text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground focus:ring-0 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-40">
                                <SelectValue placeholder="Select priesthood office..." />
                            </SelectTrigger>
                            <SelectContent className={selectContentClass}>
                                {PRIESTHOOD_OFFICES.map((option) => (
                                    <SelectItem key={option.value} value={option.value} className={selectItemClass}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <>
                            <Input
                                value={positionCalling}
                                onClick={() => setCallingOpen(true)}
                                placeholder="Select calling..."
                                readOnly
                                className="border-0 bg-transparent shadow-none px-0 h-auto text-drawer-meta font-normal text-muted-foreground placeholder:text-muted-foreground/40 focus-visible:ring-0 cursor-pointer hover:text-foreground transition-colors"
                            />
                            <PickerModal
                                open={callingOpen}
                                onOpenChange={setCallingOpen}
                                title="Select Calling"
                                searchSlot={
                                    <Input
                                        placeholder="Search callings..."
                                        value={callingSearch}
                                        onChange={(e) => setCallingSearch(e.target.value)}
                                        className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
                                    />
                                }
                            >
                                <div className="px-1">
                                    <button
                                        type="button"
                                        onClick={handleCallingClear}
                                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-muted-foreground hover:bg-surface-hover"
                                    >
                                        <Check
                                            className={cn(
                                                "h-4 w-4 shrink-0",
                                                !selectedCallingId ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        No calling
                                    </button>
                                    {filteredCallings.length === 0 && callingSearch && (
                                        <div className="px-2.5 py-6 text-center text-[13px] text-muted-foreground">
                                            {workspaceCallingLevel
                                                ? "No callings found."
                                                : "Workspace type not supported for callings."}
                                        </div>
                                    )}
                                    {filteredCallings.map((calling) => (
                                        <button
                                            key={calling.id}
                                            type="button"
                                            onClick={() => handleCallingSelect(calling.id)}
                                            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-muted/50"
                                        >
                                            <Check
                                                className={cn(
                                                    "h-4 w-4 shrink-0",
                                                    selectedCallingId === calling.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <span className="flex-1 truncate">{calling.labels[languageKey]}</span>
                                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{calling.organization}</span>
                                        </button>
                                    ))}
                                </div>
                            </PickerModal>
                        </>
                    )}
                </DetailsPanelSection>

                <Separator />

                {/* Attributes */}
                <DetailsPanelSection title="Attributes">
                    <DetailsPanelField label="Category">
                        <Select value={category} onValueChange={handleCategoryChange}>
                            <SelectTrigger className={inlineSelectTrigger}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={selectContentClass}>
                                {CATEGORY_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value} className={selectItemClass}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </DetailsPanelField>

                    <DetailsPanelField label="Status">
                        <Select value={status} onValueChange={handleStatusChange}>
                            <SelectTrigger className={inlineSelectTrigger}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={selectContentClass}>
                                {STATUS_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value} className={selectItemClass}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </DetailsPanelField>

                    <DetailsPanelField label="Script language">
                        <div className="flex items-center gap-1.5">
                            {(["ENG", "SPA"] as const).map((value) => {
                                const selected = language === value;
                                const label = value === "ENG" ? "English" : "Español";
                                return (
                                    <Button
                                        key={value}
                                        type="button"
                                        variant={selected ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleLanguageChange(value)}
                                        className={cn(
                                            "h-7 rounded-full px-2.5 text-[11px]",
                                            selected && "bg-foreground text-background hover:bg-foreground/90"
                                        )}
                                    >
                                        {label}
                                    </Button>
                                );
                            })}
                        </div>
                    </DetailsPanelField>

                    {category === "ordination" && (
                        <DetailsPanelField label="Priesthood office">
                            <Select value={office} onValueChange={handleOfficeChange}>
                                <SelectTrigger className={inlineSelectTrigger}>
                                    <SelectValue placeholder="Select office" />
                                </SelectTrigger>
                                <SelectContent className={selectContentClass}>
                                    {PRIESTHOOD_OFFICES.map((option) => (
                                        <SelectItem key={option.value} value={option.value} className={selectItemClass}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </DetailsPanelField>
                    )}

                    {item?.action_date && (
                        <DetailsPanelField label="Action date">
                            <span className="text-drawer-meta text-muted-foreground">
                                {format(new Date(item.action_date), "MMM d, yyyy")}
                            </span>
                        </DetailsPanelField>
                    )}

                    {item && (
                        <DetailsPanelField label="Created">
                            <span className="text-drawer-meta text-muted-foreground">
                                {format(new Date(item.created_at), "MMM d, yyyy")}
                            </span>
                        </DetailsPanelField>
                    )}

                    {item?.creator?.full_name && (
                        <DetailsPanelField label="Created by">
                            <span className="text-drawer-meta text-muted-foreground">
                                {item.creator.full_name}
                            </span>
                        </DetailsPanelField>
                    )}
                </DetailsPanelSection>

                <Separator />

                {/* Notes */}
                <DetailsPanelSection title="Notes">
                    <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        onBlur={handleNotesBlur}
                        placeholder="Add a note..."
                        rows={3}
                        className="border-0 bg-muted/30 shadow-none resize-none text-[13px] placeholder:text-muted-foreground/40 focus-visible:ring-0 rounded-lg px-2.5 py-2"
                    />
                </DetailsPanelSection>
            </DetailsPanel>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Business Item</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{item?.person_name}&quot;? This
                            action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
