"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TemplateSelector } from "@/components/templates/template-selector";
import { Check, ChevronsUpDown, Languages, Link as LinkIcon, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getDirectoryCache,
  setDirectoryCache,
  clearDirectoryCache,
  getWorkspaceProfile,
} from "@/lib/cache/form-data-cache";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ModalForm,
  ModalFormBody,
  ModalFormFooter,
  ModalFormSection,
} from "@/components/ui/modal-form-layout";
import callingsCatalog from "@/data/callings.json";
import {
  generateBusinessScript,
  validateBusinessItemDetails,
  PRIESTHOOD_OFFICES,
  getPriesthoodFromOffice,
  type Language,
  type Gender,
  type PriesthoodOffice,
  type BusinessItemDetails,
  type BusinessItem,
} from "@/lib/business-script-generator";

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Props for the form
interface BusinessItemFormProps {
  // Initial values for edit mode
  initialData?: {
    personName: string;
    positionCalling: string;
    category: string;
    status: string;
    actionDate: string;
    notes: string;
    details: BusinessItemDetails | null;
    templateId: string | null;
  };
  // Submit handler
  onSubmit: (data: BusinessItemFormData) => Promise<void>;
  // Loading state
  isLoading?: boolean;
  // Mode
  mode?: "create" | "edit";
  onCancel?: () => void;
}

// Form data structure
export interface BusinessItemFormData {
  personName: string;
  positionCalling: string;
  category: string;
  status: string;
  actionDate: string;
  notes: string;
  details: BusinessItemDetails;
  templateIds: string[];
  templateId: string | null;
}

// Category options with descriptions
const CATEGORY_OPTIONS = [
  {
    value: "sustaining",
    label: "Sustaining",
    description: "Propose someone to be sustained in a calling",
    requiresCalling: true,
    requiresGender: true,
  },
  {
    value: "release",
    label: "Release",
    description: "Release someone from a calling with a vote of thanks",
    requiresCalling: true,
    requiresGender: true,
  },
  {
    value: "confirmation",
    label: "Confirmation",
    description: "Accept a newly baptized member into fellowship",
    requiresCalling: false,
    requiresGender: true,
  },
  {
    value: "ordination",
    label: "Ordination",
    description: "Ordain to a priesthood office",
    requiresCalling: false,
    requiresGender: false, // Always male for ordinations
    requiresOffice: true,
  },
  {
    value: "other",
    label: "Other",
    description: "Custom business item",
    requiresCalling: false,
    requiresGender: false,
  },
];

interface DirectoryPersonOption {
  id: string;
  name: string;
  gender: Gender | null;
}

type CallingLevel = "ward" | "branch" | "stake" | "district";

interface CallingCatalogEntry {
  id: string;
  organization: string;
  level: CallingLevel;
  labels: { en: string; es: string };
  active: boolean;
}

const mapWorkspaceTypeToCallingLevel = (workspaceType: string | null): CallingLevel | null => {
  if (workspaceType === "group") return "ward";
  if (
    workspaceType === "ward" ||
    workspaceType === "branch" ||
    workspaceType === "stake" ||
    workspaceType === "district"
  ) {
    return workspaceType;
  }
  return null;
};

export function BusinessItemForm({
  initialData,
  onSubmit,
  isLoading = false,
  mode = "create",
  onCancel,
}: BusinessItemFormProps) {
  type RequiredFieldKey =
    | "personName"
    | "category"
    | "positionCalling"
    | "office";

  // Form state
  const [personName, setPersonName] = useState(initialData?.personName || "");
  const [selectedDirectoryPersonId, setSelectedDirectoryPersonId] = useState<string>("");
  const [directoryPeople, setDirectoryPeople] = useState<DirectoryPersonOption[]>([]);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false);
  const [isUpdatingDirectoryGender, setIsUpdatingDirectoryGender] = useState(false);
  const [workspaceCallingLevel, setWorkspaceCallingLevel] = useState<CallingLevel | null>(null);
  const [positionCalling, setPositionCalling] = useState(
    initialData?.positionCalling || ""
  );
  const [category, setCategory] = useState(initialData?.category || "");
  const [notes] = useState(initialData?.notes || "");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(
    initialData?.templateId ? [initialData.templateId] : []
  );
  const [templateOptions, setTemplateOptions] = useState<{ id: string; name: string }[]>([]);
  const [callingOpen, setCallingOpen] = useState(false);
  const [callingSearch, setCallingSearch] = useState("");
  const [selectedCallingId, setSelectedCallingId] = useState<string>("");

  // Details state (structured metadata)
  const [language, setLanguage] = useState<Language>(
    initialData?.details?.language || "ENG"
  );
  const [office, setOffice] = useState<PriesthoodOffice | undefined>(
    initialData?.details?.office
  );
  const [customScript, setCustomScript] = useState(
    initialData?.details?.customScript || ""
  );
  const [touched, setTouched] = useState<Record<RequiredFieldKey, boolean>>({
    personName: false,
    category: false,
    positionCalling: false,
    office: false,
  });

  // Get current category config
  const categoryConfig = CATEGORY_OPTIONS.find((c) => c.value === category);
  const selectedDirectoryPerson = useMemo(
    () => directoryPeople.find((person) => person.id === selectedDirectoryPersonId) ?? null,
    [directoryPeople, selectedDirectoryPersonId]
  );
  const languageKey = language === "SPA" ? "es" : "en";
  const availableCallings = useMemo(() => {
    const callings = callingsCatalog as CallingCatalogEntry[];
    return callings.filter((calling) =>
      calling.active &&
      (workspaceCallingLevel ? calling.level === workspaceCallingLevel : false)
    );
  }, [workspaceCallingLevel]);
  const filteredCallings = useMemo(() => {
    if (!callingSearch.trim()) return availableCallings;
    const q = callingSearch.toLowerCase();
    return availableCallings.filter((calling) =>
      calling.labels.en.toLowerCase().includes(q) ||
      calling.labels.es.toLowerCase().includes(q) ||
      calling.organization.toLowerCase().includes(q)
    );
  }, [availableCallings, callingSearch]);
  const selectedCalling = useMemo(
    () => availableCallings.find((calling) => calling.id === selectedCallingId) ?? null,
    [availableCallings, selectedCallingId]
  );
  const effectiveGender: Gender | undefined =
    category === "ordination"
      ? "male"
      : selectedDirectoryPerson?.gender ?? undefined;

  // Auto-set priesthood type from office
  const priesthood = office ? getPriesthoodFromOffice(office) : undefined;

  // Build the business item for script generation
  const businessItem: BusinessItem = useMemo(
    () => ({
      person_name: personName || "[Name]",
      position_calling: positionCalling || null,
      category: category || "other",
      notes: notes || null,
      details: {
        language,
        gender: effectiveGender,
        office,
        priesthood,
        customScript: category === "other" ? customScript : undefined,
      },
    }),
    [personName, positionCalling, category, notes, language, effectiveGender, office, priesthood, customScript]
  );

  // Generate script preview
  const scriptPreview = useMemo(() => {
    if (!category) return "";
    return generateBusinessScript(businessItem);
  }, [businessItem, category]);

  const scriptVariableTokens = useMemo(() => {
    const tokens = new Set<string>();

    const trimmedName = personName.trim();
    const trimmedCalling = positionCalling.trim();
    if (trimmedName) tokens.add(trimmedName);
    if (trimmedCalling) tokens.add(trimmedCalling);

    return Array.from(tokens)
      .map((token) => token.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
  }, [personName, positionCalling]);

  const highlightedScriptPreview = useMemo(() => {
    if (!scriptPreview || scriptVariableTokens.length === 0) return scriptPreview;

    const regex = new RegExp(`(${scriptVariableTokens
      .map((token) => {
        const escapedToken = escapeRegExp(token);
        const shouldUseWordBoundaries = /^[\p{L}\p{N}_]+$/u.test(token);
        return shouldUseWordBoundaries ? `\\b${escapedToken}\\b` : escapedToken;
      })
      .join("|")})`, "g");
    const tokenSet = new Set(scriptVariableTokens);

    return scriptPreview.split(regex).map((part, index) => {
      if (!part) return null;
      if (tokenSet.has(part)) {
        return (
          <span key={`${part}-${index}`} className="font-semibold italic">
            {part}
          </span>
        );
      }

      return <span key={`text-${index}`}>{part}</span>;
    });
  }, [scriptPreview, scriptVariableTokens]);

  // Validation
  const validation = useMemo(() => {
    if (!category) return { valid: false, errors: ["Select a category"] };
    if (!selectedDirectoryPersonId) return { valid: false, errors: ["Person is required"] };

    return validateBusinessItemDetails(
      category,
      positionCalling,
      businessItem.details
    );
  }, [category, selectedDirectoryPersonId, positionCalling, businessItem.details]);

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<RequiredFieldKey, string>> = {};

    if (!selectedDirectoryPersonId) {
      errors.personName = "Person name is required.";
    }
    if (!category) {
      errors.category = "Category is required.";
    }
    if (categoryConfig?.requiresCalling && !positionCalling.trim()) {
      errors.positionCalling = "Calling is required.";
    }
    if (categoryConfig?.requiresOffice && !office) {
      errors.office = "Priesthood office is required.";
    }
    return errors;
  }, [selectedDirectoryPersonId, category, categoryConfig, positionCalling, office]);

  const markTouched = (field: RequiredFieldKey) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const touchAllRequiredFields = () => {
    setTouched({
      personName: true,
      category: true,
      positionCalling: Boolean(categoryConfig?.requiresCalling),
      office: Boolean(categoryConfig?.requiresOffice),
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validation.valid) {
      touchAllRequiredFields();
      return;
    }

    const formData: BusinessItemFormData = {
      personName,
      positionCalling,
      category,
      status: "pending",
      actionDate: "",
      notes,
      details: {
        language,
        gender: effectiveGender,
        office,
        priesthood,
        customScript: category === "other" ? customScript : undefined,
      },
      templateIds: selectedTemplateIds,
      templateId: selectedTemplateIds[0] ?? null,
    };

    await onSubmit(formData);
  };

  // Reset office when category changes away from ordination
  useEffect(() => {
    if (category !== "ordination") {
      setOffice(undefined);
    }
  }, [category]);

  // Eagerly hydrate from cache on mount — the prefetch from the parent page
  // will have already populated the module-level caches in most cases,
  // so this runs synchronously with zero flash.
  useEffect(() => {
    const wp = getWorkspaceProfile();
    if (wp) {
      setWorkspaceCallingLevel(mapWorkspaceTypeToCallingLevel(wp.workspaceType));
      const cached = getDirectoryCache(wp.workspaceId);
      if (cached) {
        setDirectoryPeople(cached);
        return; // fully resolved from cache — no loading state at all
      }
    }
    // Cache miss — fall back to async fetch
    loadDirectoryPeople();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDirectoryPeople = async () => {
    if (isDirectoryLoading) return;
    setIsDirectoryLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsDirectoryLoading(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from("profiles") as any)
      .select("workspace_id, workspaces(type)")
      .eq("id", user.id)
      .single();

    if (!profile?.workspace_id) {
      setIsDirectoryLoading(false);
      return;
    }

    setWorkspaceCallingLevel(
      mapWorkspaceTypeToCallingLevel(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((profile as any).workspaces?.type as string | null) ?? null
      )
    );

    // Return cached data if available
    const cached = getDirectoryCache(profile.workspace_id);
    if (cached) {
      setDirectoryPeople(cached);
      setIsDirectoryLoading(false);
      return;
    }

    // Try with gender column first; fallback for environments where migration isn't applied yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("directory") as any)
      .select("id, name, gender")
      .eq("workspace_id", profile.workspace_id)
      .order("name");

    if (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: fallbackData, error: fallbackError } = await (supabase.from("directory") as any)
        .select("id, name")
        .eq("workspace_id", profile.workspace_id)
        .order("name");

      if (fallbackError) {
        console.error("Failed to load members for business form:", fallbackError);
        setIsDirectoryLoading(false);
        return;
      }

      const normalized = ((fallbackData || []) as Array<{ id: string; name: string }>).map((person) => ({
        ...person,
        gender: null as null,
      }));
      setDirectoryCache(profile.workspace_id, normalized);
      setDirectoryPeople(normalized);
      setIsDirectoryLoading(false);
      return;
    }

    const people = (data || []) as DirectoryPersonOption[];
    setDirectoryCache(profile.workspace_id, people);
    setDirectoryPeople(people);
    setIsDirectoryLoading(false);
  };

  useEffect(() => {
    if (!selectedDirectoryPersonId || !selectedDirectoryPerson) return;
    setPersonName(selectedDirectoryPerson.name);
  }, [selectedDirectoryPersonId, selectedDirectoryPerson]);

  useEffect(() => {
    if (!selectedCalling) {
      if (categoryConfig?.requiresCalling) {
        setPositionCalling("");
      }
      return;
    }
    setPositionCalling(selectedCalling.labels[languageKey]);
  }, [selectedCalling, languageKey, categoryConfig?.requiresCalling]);

  useEffect(() => {
    if (!initialData?.positionCalling || selectedCallingId || availableCallings.length === 0) return;
    const match = availableCallings.find((calling) =>
      calling.labels.en === initialData.positionCalling ||
      calling.labels.es === initialData.positionCalling
    );
    if (match) {
      setSelectedCallingId(match.id);
      setPositionCalling(match.labels[languageKey]);
    }
  }, [initialData?.positionCalling, selectedCallingId, availableCallings, languageKey]);

  useEffect(() => {
    if (!initialData?.personName || directoryPeople.length === 0 || selectedDirectoryPersonId) return;
    const match = directoryPeople.find((person) => person.name === initialData.personName);
    if (match) {
      setSelectedDirectoryPersonId(match.id);
      setPersonName(match.name);
    }
  }, [initialData?.personName, directoryPeople, selectedDirectoryPersonId]);

  const handleSetDirectoryGender = async (value: Gender) => {
    if (!selectedDirectoryPersonId || !selectedDirectoryPerson) return;
    setIsUpdatingDirectoryGender(true);
    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("directory") as any)
      .update({ gender: value })
      .eq("id", selectedDirectoryPersonId);

    if (error) {
      console.error("Failed to update member gender:", error);
      setIsUpdatingDirectoryGender(false);
      return;
    }

    setDirectoryPeople((prev) => {
      const updated = prev.map((person) =>
        person.id === selectedDirectoryPersonId
          ? { ...person, gender: value }
          : person
      );
      // Keep cache in sync
      clearDirectoryCache();
      return updated;
    });
    setIsUpdatingDirectoryGender(false);
  };

  useEffect(() => {
    setTouched((prev) => ({
      ...prev,
      positionCalling: categoryConfig?.requiresCalling ? prev.positionCalling : false,
      office: categoryConfig?.requiresOffice ? prev.office : false,
      gender: categoryConfig?.requiresGender ? prev.gender : false,
    }));
  }, [categoryConfig]);

  return (
    <ModalForm onSubmit={handleSubmit}>
      <ModalFormBody className="w-full space-y-4 pt-2 pb-2">
        <ModalFormSection>
          <div className="max-w-[32rem] space-y-2">
            <Label htmlFor="personName">Person Name*</Label>
            <Select
              value={selectedDirectoryPersonId}
              onValueChange={(value) => {
                setSelectedDirectoryPersonId(value);
                const selected = directoryPeople.find((person) => person.id === value);
                if (selected) {
                  setPersonName(selected.name);
                }
                markTouched("personName");
              }}
              disabled={isLoading}
              required
            >
              <SelectTrigger
                id="personName"
                className={cn(
                  touched.personName && fieldErrors.personName && "border-destructive focus:ring-destructive/30"
                )}
              >
                <SelectValue
                  placeholder={isDirectoryLoading ? "Loading members..." : "Select a person"}
                />
              </SelectTrigger>
              <SelectContent>
                {directoryPeople.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {touched.personName && fieldErrors.personName && (
              <p className="text-xs text-destructive">{fieldErrors.personName}</p>
            )}
            {selectedDirectoryPerson &&
              categoryConfig?.requiresGender &&
              !selectedDirectoryPerson.gender && (
                <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-2.5">
                  <p className="text-xs text-muted-foreground">
                    This person is missing gender in Directory. Set it once to continue.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDirectoryGender("male")}
                      disabled={isUpdatingDirectoryGender || isLoading}
                      className="h-7 rounded-full px-2.5 text-[11px]"
                    >
                      Set as Male
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDirectoryGender("female")}
                      disabled={isUpdatingDirectoryGender || isLoading}
                      className="h-7 rounded-full px-2.5 text-[11px]"
                    >
                      Set as Female
                    </Button>
                  </div>
                </div>
              )}
          </div>

          <div className="grid max-w-[34rem] grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category*</Label>
              <Select
                value={category}
                onValueChange={(value) => {
                  setCategory(value);
                  markTouched("category");
                }}
                disabled={isLoading}
                required
              >
                <SelectTrigger
                  id="category"
                  className={cn(
                    touched.category && fieldErrors.category && "border-destructive focus:ring-destructive/30"
                  )}
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS
                    .filter((opt) => opt.value !== "other")
                    .map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched.category && fieldErrors.category && (
                <p className="text-xs text-destructive">{fieldErrors.category}</p>
              )}
            </div>

            {categoryConfig?.requiresOffice ? (
              <div className="space-y-2">
                <Label htmlFor="priesthoodOffice">Priesthood Office*</Label>
                <Select
                  value={office}
                  onValueChange={(value) => {
                    setOffice(value as PriesthoodOffice);
                    markTouched("office");
                  }}
                  disabled={isLoading}
                  required
                >
                  <SelectTrigger
                    id="priesthoodOffice"
                    className={cn(
                      touched.office && fieldErrors.office && "border-destructive focus:ring-destructive/30"
                    )}
                  >
                    <SelectValue placeholder="Select office" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIESTHOOD_OFFICES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {touched.office && fieldErrors.office && (
                  <p className="text-xs text-destructive">{fieldErrors.office}</p>
                )}
              </div>
            ) : categoryConfig?.requiresCalling ? (
              <div className="space-y-2">
                <Label htmlFor="positionCalling">Calling*</Label>
                <Popover open={callingOpen} onOpenChange={setCallingOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="positionCalling"
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={callingOpen}
                      disabled={isLoading}
                      className={cn(
                        "h-9 w-full justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm font-normal ring-offset-background",
                        !selectedCalling && "text-muted-foreground",
                        touched.positionCalling && fieldErrors.positionCalling && "border-destructive"
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate text-left">
                        {selectedCalling ? selectedCalling.labels[languageKey] : "Select calling"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search callings..."
                        value={callingSearch}
                        onValueChange={setCallingSearch}
                      />
                      <CommandList className="max-h-64 overflow-y-auto">
                        <CommandEmpty>
                          {workspaceCallingLevel
                            ? "No callings found."
                            : "Unsupported workspace type for callings."}
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredCallings.map((calling) => (
                            <CommandItem
                              key={calling.id}
                              value={calling.id}
                              onSelect={() => {
                                setSelectedCallingId(calling.id);
                                setPositionCalling(calling.labels[languageKey]);
                                markTouched("positionCalling");
                                setCallingOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCallingId === calling.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {calling.labels[languageKey]}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {touched.positionCalling && fieldErrors.positionCalling && (
                  <p className="text-xs text-destructive">{fieldErrors.positionCalling}</p>
                )}
              </div>
            ) : null}
          </div>
        </ModalFormSection>

        {category && (
          <ModalFormSection>
            {category === "other" && (
              <div className="max-w-[32rem] space-y-2">
                <Label htmlFor="customScript">
                  Custom Script (optional)
                </Label>
                <Textarea
                  id="customScript"
                  value={customScript}
                  onChange={(e) => setCustomScript(e.target.value)}
                  placeholder="Enter custom conducting script or leave blank to use notes"
                  rows={3}
                  disabled={isLoading}
                />
              </div>
            )}
          </ModalFormSection>
        )}

        <ModalFormSection>
          <p className="max-w-[34rem] text-sm font-semibold tracking-tight text-foreground">
            Script Preview
          </p>

          <div
            className={cn(
              "max-h-[180px] max-w-[34rem] overflow-y-auto rounded-md border border-muted bg-muted p-3 text-sm leading-relaxed whitespace-pre-wrap",
              "font-serif"
            )}
          >
            {validation.valid && highlightedScriptPreview ? (
              highlightedScriptPreview
            ) : (
              <span className="text-muted-foreground italic">
                Complete the form to see the script preview...
              </span>
            )}
          </div>
        </ModalFormSection>

        <ModalFormSection className="pt-3">
          <div className="max-w-[34rem] space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={language}
                onValueChange={(value) => setLanguage(value as Language)}
                disabled={isLoading}
              >
                <SelectTrigger
                  className={cn(
                    "h-7 w-auto rounded-full px-2.5 text-[11px] font-medium shadow-sm transition-colors [&>svg]:hidden",
                    language !== "ENG"
                      ? "border-transparent bg-[hsl(var(--chip-active-bg))] text-[hsl(var(--chip-active-text))]"
                      : "border-[hsl(var(--chip-border))] bg-background text-[hsl(var(--chip-text))] hover:bg-[hsl(var(--chip-hover-bg))]"
                  )}
                >
                  <div className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                    <Languages className="h-2.5 w-2.5 shrink-0" />
                    Overwrite language
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENG">English</SelectItem>
                  <SelectItem value="SPA">Español</SelectItem>
                </SelectContent>
              </Select>

              <TemplateSelector
                value={selectedTemplateIds}
                onChange={setSelectedTemplateIds}
                onTemplatesLoaded={setTemplateOptions}
                disabled={isLoading}
                mode="pill"
                pillLabel="Link to template"
                pillIcon={<LinkIcon className="h-2.5 w-2.5 shrink-0" />}
              />
            </div>

            {selectedTemplateIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTemplateIds.map((templateId) => {
                  const templateName =
                    templateOptions.find((template) => template.id === templateId)?.name ||
                    "Template";

                  return (
                    <span
                      key={templateId}
                      className="inline-flex items-center gap-1 rounded-full border border-muted bg-muted px-2.5 py-1 text-xs text-foreground"
                    >
                      {templateName}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedTemplateIds((prev) =>
                            prev.filter((id) => id !== templateId)
                          )
                        }
                        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${templateName}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </ModalFormSection>

      </ModalFormBody>

      <ModalFormFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
          className="h-8 rounded-full px-3 text-xs"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !validation.valid}
          className="h-8 rounded-full px-3 text-xs"
        >
          {isLoading
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
            ? "Create Business Item"
            : "Save Changes"}
        </Button>
      </ModalFormFooter>
    </ModalForm>
  );
}
