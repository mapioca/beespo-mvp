"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { PickerModal } from "@/components/ui/picker-modal";
import { createClient } from "@/lib/supabase/client";
import {
  getDirectoryCache,
  setDirectoryCache,
  clearDirectoryCache,
  getWorkspaceProfile,
} from "@/lib/cache/form-data-cache";
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
    value: "confirmation_ordinance",
    label: "Confirmation",
    description: "Transition into a confirmation during sacrament meeting",
    requiresCalling: false,
    requiresGender: true,
  },
  {
    value: "new_member_welcome",
    label: "New Member Welcome",
    description: "Welcome a member who has already been baptized and confirmed",
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
    value: "child_blessing",
    label: "Child Blessing",
    description: "Transition into naming and blessing a child",
    requiresCalling: false,
    requiresGender: false,
    requiresPerson: false,
  },
  {
    value: "records_received",
    label: "Records Received",
    description: "Welcome members whose records were received",
    requiresCalling: false,
    requiresGender: false,
  },
  {
    value: "miscellaneous",
    label: "Miscellaneous",
    description: "Open text for other recognized business",
    requiresCalling: false,
    requiresGender: false,
    requiresPerson: false,
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
    | "gender"
    | "office";

  // Form state
  const [personName, setPersonName] = useState(initialData?.personName || "");
  const [selectedDirectoryPersonId, setSelectedDirectoryPersonId] = useState<string>("");
  const [personOpen, setPersonOpen] = useState(false);
  const [personSearch, setPersonSearch] = useState("");
  const [directoryPeople, setDirectoryPeople] = useState<DirectoryPersonOption[]>([]);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false);
  const [isUpdatingDirectoryGender, setIsUpdatingDirectoryGender] = useState(false);
  const [workspaceCallingLevel, setWorkspaceCallingLevel] = useState<CallingLevel | null>(null);
  const [positionCalling, setPositionCalling] = useState(
    initialData?.positionCalling || ""
  );
  const [category, setCategory] = useState(initialData?.category || "");
  const [notes] = useState(initialData?.notes || "");
  const [selectedTemplateIds] = useState<string[]>(
    initialData?.templateId ? [initialData.templateId] : []
  );
  const [callingOpen, setCallingOpen] = useState(false);
  const [callingSearch, setCallingSearch] = useState("");
  const [selectedCallingId, setSelectedCallingId] = useState<string>("");

  // Details state (structured metadata)
  const [language] = useState<Language>(
    initialData?.details?.language || "ENG"
  );
  const [office, setOffice] = useState<PriesthoodOffice | undefined>(
    initialData?.details?.office
  );
  const [baptismDate, setBaptismDate] = useState(initialData?.details?.baptismDate || "");
  const [confirmationDate, setConfirmationDate] = useState(initialData?.details?.confirmationDate || "");
  const [childName, setChildName] = useState(initialData?.details?.childName || "");
  const [voiceName, setVoiceName] = useState(initialData?.details?.voiceName || "");
  const [customText, setCustomText] = useState(
    initialData?.details?.customText || initialData?.details?.customScript || ""
  );
  const [touched, setTouched] = useState<Record<RequiredFieldKey, boolean>>({
    personName: false,
    category: false,
    positionCalling: false,
    gender: false,
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
  const filteredPeople = useMemo(() => {
    const q = personSearch.trim().toLowerCase();
    if (!q) return directoryPeople;
    return directoryPeople.filter((p) => p.name.toLowerCase().includes(q));
  }, [directoryPeople, personSearch]);
  const effectiveGender: Gender | undefined =
    category === "ordination"
      ? "male"
      : selectedDirectoryPerson?.gender ?? undefined;

  // Auto-set priesthood type from office
  const priesthood = office ? getPriesthoodFromOffice(office) : undefined;

  // Build the business item for script generation
  const businessItem: BusinessItem = useMemo(
    () => ({
      person_name:
        category === "child_blessing"
          ? childName || personName || "{{childName}}"
          : category === "miscellaneous"
            ? "Miscellaneous"
            : personName || "{{personName}}",
      position_calling: positionCalling || null,
      category: category || "miscellaneous",
      notes: notes || null,
      details: {
        language,
        gender: effectiveGender,
        office,
        priesthood,
        baptismDate,
        confirmationDate,
        childName,
        voiceName,
        customText: category === "miscellaneous" ? customText : undefined,
        customScript: category === "miscellaneous" ? customText : undefined,
      },
    }),
    [
      personName,
      positionCalling,
      category,
      notes,
      language,
      effectiveGender,
      office,
      priesthood,
      baptismDate,
      confirmationDate,
      childName,
      voiceName,
      customText,
    ]
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
    const trimmedChildName = childName.trim();
    const trimmedVoiceName = voiceName.trim();
    if (trimmedName) tokens.add(trimmedName);
    if (trimmedCalling) tokens.add(trimmedCalling);
    if (trimmedChildName) tokens.add(trimmedChildName);
    if (trimmedVoiceName) tokens.add(trimmedVoiceName);

    return Array.from(tokens)
      .map((token) => token.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
  }, [personName, positionCalling, childName, voiceName]);
  useMemo(() => {
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
            <span key={`${part}-${index}`} className="font-medium text-[hsl(var(--brand))]">
            {part}
          </span>
        );
      }

      return <span key={`text-${index}`}>{part}</span>;
    });
  }, [scriptPreview, scriptVariableTokens]);

  /** Validation **/
  const validation = useMemo(() => {
    if (!category) return { valid: false, errors: ["Select a category"] };
    if (categoryConfig?.requiresPerson !== false && !selectedDirectoryPersonId) {
      return { valid: false, errors: ["Person is required"] };
    }
    if (category === "child_blessing" && !childName.trim()) {
      return { valid: false, errors: ["Child name is required"] };
    }
    if (category === "miscellaneous" && !customText.trim()) {
      return { valid: false, errors: ["Custom text is required"] };
    }

    return validateBusinessItemDetails(
      category,
      positionCalling,
      businessItem.details
    );
  }, [category, categoryConfig?.requiresPerson, selectedDirectoryPersonId, childName, customText, positionCalling, businessItem.details]);

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<RequiredFieldKey, string>> = {};

    if (categoryConfig?.requiresPerson !== false && !selectedDirectoryPersonId) {
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
      gender: Boolean(categoryConfig?.requiresGender),
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
      personName:
        category === "child_blessing"
          ? childName.trim()
          : category === "miscellaneous"
            ? "Miscellaneous"
            : personName,
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
        baptismDate,
        confirmationDate,
        childName,
        voiceName,
        customText: category === "miscellaneous" ? customText : undefined,
        customScript: category === "miscellaneous" ? customText : undefined,
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
                {CATEGORY_OPTIONS.map((opt) => (
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

          {(categoryConfig?.requiresPerson !== false ||
            categoryConfig?.requiresOffice ||
            categoryConfig?.requiresCalling) && (
          <div className="grid max-w-[34rem] grid-cols-1 gap-3 sm:grid-cols-2">
            {categoryConfig?.requiresPerson !== false && (
            <div className="space-y-2">
              <Label htmlFor="personName">Person Name*</Label>
              <Input
                id="personName"
                value={personName}
                onClick={() => setPersonOpen(true)}
                placeholder={isDirectoryLoading ? "Loading members..." : "Select a person"}
                readOnly
                disabled={isLoading}
                className={cn(
                  "cursor-pointer",
                  touched.personName && fieldErrors.personName && "border-destructive focus:ring-destructive/30"
                )}
              />
              <PickerModal
                open={personOpen}
                onOpenChange={(open) => { setPersonOpen(open); if (!open) setPersonSearch(""); }}
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
                  <div className="px-5 py-8 text-center text-[13px] text-muted-foreground">No members match.</div>
                ) : (
                  filteredPeople.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => {
                        setSelectedDirectoryPersonId(person.id);
                        setPersonName(person.name);
                        markTouched("personName");
                        setPersonOpen(false);
                        setPersonSearch("");
                      }}
                      className="flex w-full items-center gap-3 px-[18px] py-2 text-left transition-colors hover:bg-surface-hover"
                    >
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-sunken text-[11px] font-semibold text-muted-foreground">
                        {person.name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")}
                      </div>
                      <span className="truncate text-[14px] text-foreground">{person.name}</span>
                    </button>
                  ))
                )}
              </PickerModal>
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
            )}

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
                <Input
                  id="positionCalling"
                  value={selectedCalling ? selectedCalling.labels[languageKey] : ""}
                  onClick={() => setCallingOpen(true)}
                  placeholder="Select calling..."
                  readOnly
                  disabled={isLoading}
                  className={cn(
                    "cursor-pointer",
                    touched.positionCalling && fieldErrors.positionCalling && "border-destructive"
                  )}
                />
                <PickerModal
                  open={callingOpen}
                  onOpenChange={setCallingOpen}
                  title="Select Calling"
                  searchSlot={
                    <input
                      className="w-full bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                      placeholder="Search callings..."
                      value={callingSearch}
                      onChange={(e) => setCallingSearch(e.target.value)}
                      autoFocus
                    />
                  }
                >
                  <div className="px-1">
                    {filteredCallings.length === 0 && (
                      <div className="px-2.5 py-6 text-center text-[13px] text-muted-foreground">
                        {workspaceCallingLevel ? "No callings found." : "Unsupported workspace type for callings."}
                      </div>
                    )}
                    {filteredCallings.map((calling) => (
                      <button
                        key={calling.id}
                        type="button"
                        onClick={() => {
                          setSelectedCallingId(calling.id);
                          setPositionCalling(calling.labels[languageKey]);
                          markTouched("positionCalling");
                          setCallingOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-surface-hover"
                      >
                        <Check className={cn("h-4 w-4 shrink-0", selectedCallingId === calling.id ? "opacity-100" : "opacity-0")} />
                        <span className="flex-1 truncate">{calling.labels[languageKey]}</span>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{calling.organization}</span>
                      </button>
                    ))}
                  </div>
                </PickerModal>
                {touched.positionCalling && fieldErrors.positionCalling && (
                  <p className="text-xs text-destructive">{fieldErrors.positionCalling}</p>
                )}
              </div>
            ) : null}
          </div>
          )}
        </ModalFormSection>

        {category && (
          <ModalFormSection>
            {category === "confirmation_ordinance" && (
              <div className="max-w-[32rem] space-y-2">
                <Label htmlFor="baptismDate">Baptism date</Label>
                <Input
                  id="baptismDate"
                  type="date"
                  value={baptismDate}
                  onChange={(e) => setBaptismDate(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}
            {category === "new_member_welcome" && (
              <div className="max-w-[32rem] space-y-2">
                <Label htmlFor="confirmationDate">Baptism and confirmation date</Label>
                <Input
                  id="confirmationDate"
                  type="date"
                  value={confirmationDate}
                  onChange={(e) => setConfirmationDate(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}
            {category === "child_blessing" && (
              <div className="grid max-w-[34rem] grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="childName">Child name*</Label>
                  <Input
                    id="childName"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    placeholder="Child name"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voiceName">Voice</Label>
                  <Input
                    id="voiceName"
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    placeholder="Brother or father acting as voice"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}
            {category === "miscellaneous" && (
              <div className="max-w-[32rem] space-y-2">
                <Label htmlFor="customText">
                  Script text*
                </Label>
                <Textarea
                  id="customText"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Enter the transition language for this item"
                  rows={4}
                  disabled={isLoading}
                />
              </div>
            )}
          </ModalFormSection>
        )}

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
