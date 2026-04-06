"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { TemplateSelector } from "@/components/templates/template-selector";
import { X } from "lucide-react";
import {
  ModalForm,
  ModalFormBody,
  ModalFormFooter,
  ModalFormSection,
} from "@/components/ui/modal-form-layout";
import {
  generateBusinessScript,
  validateBusinessItemDetails,
  PRIESTHOOD_OFFICES,
  getPriesthoodFromOffice,
  formatOffice,
  formatPriesthood,
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
    | "office"
    | "gender";

  // Form state
  const [personName, setPersonName] = useState(initialData?.personName || "");
  const [positionCalling, setPositionCalling] = useState(
    initialData?.positionCalling || ""
  );
  const [category, setCategory] = useState(initialData?.category || "");
  const [notes] = useState(initialData?.notes || "");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(
    initialData?.templateId ? [initialData.templateId] : []
  );
  const [templateOptions, setTemplateOptions] = useState<{ id: string; name: string }[]>([]);

  // Details state (structured metadata)
  const [language, setLanguage] = useState<Language>(
    initialData?.details?.language || "ENG"
  );
  const [gender, setGender] = useState<Gender | undefined>(
    initialData?.details?.gender
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
    gender: false,
  });

  // Get current category config
  const categoryConfig = CATEGORY_OPTIONS.find((c) => c.value === category);

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
        gender: category === "ordination" ? "male" : gender,
        office,
        priesthood,
        customScript: category === "other" ? customScript : undefined,
      },
    }),
    [personName, positionCalling, category, notes, language, gender, office, priesthood, customScript]
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
    if (office) tokens.add(formatOffice(office, language));
    if (priesthood) tokens.add(formatPriesthood(priesthood, language));

    if (language === "ENG") {
      if (gender === "female") {
        tokens.add("she");
        tokens.add("her");
      }
      if (gender === "male") {
        tokens.add("he");
        tokens.add("his");
      }
    }

    return Array.from(tokens)
      .map((token) => token.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
  }, [gender, language, office, personName, positionCalling, priesthood]);

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
    if (!personName.trim()) return { valid: false, errors: ["Name is required"] };

    return validateBusinessItemDetails(
      category,
      positionCalling,
      businessItem.details
    );
  }, [category, personName, positionCalling, businessItem.details]);

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<RequiredFieldKey, string>> = {};

    if (!personName.trim()) {
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
    if (categoryConfig?.requiresGender && !gender) {
      errors.gender = "Gender is required.";
    }

    return errors;
  }, [personName, category, categoryConfig, positionCalling, office, gender]);

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
      personName,
      positionCalling,
      category,
      status: "pending",
      actionDate: "",
      notes,
      details: {
        language,
        gender: category === "ordination" ? "male" : gender,
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
      <ModalFormBody className="mx-auto w-full max-w-[560px] space-y-4 pt-2 pb-2">
        <ModalFormSection>
          <div className="max-w-[32rem] space-y-2">
            <Label htmlFor="personName">Person Name*</Label>
            <Input
              id="personName"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              onBlur={() => markTouched("personName")}
              placeholder="e.g., John Smith"
              required
              disabled={isLoading}
              className={cn(
                touched.personName && fieldErrors.personName && "border-destructive focus-visible:ring-destructive/30"
              )}
            />
            {touched.personName && fieldErrors.personName && (
              <p className="text-xs text-destructive">{fieldErrors.personName}</p>
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
                  onBlur={() => markTouched("category")}
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

            {categoryConfig?.requiresCalling && (
              <div className="space-y-2">
                <Label htmlFor="positionCalling">Calling*</Label>
                <Input
                  id="positionCalling"
                  value={positionCalling}
                  onChange={(e) => setPositionCalling(e.target.value)}
                  onBlur={() => markTouched("positionCalling")}
                  placeholder="e.g., Sunday School President"
                  required
                  disabled={isLoading}
                  className={cn(
                    touched.positionCalling && fieldErrors.positionCalling && "border-destructive focus-visible:ring-destructive/30"
                  )}
                />
                {touched.positionCalling && fieldErrors.positionCalling && (
                  <p className="text-xs text-destructive">{fieldErrors.positionCalling}</p>
                )}
              </div>
            )}
          </div>
        </ModalFormSection>

        {category && (
          <ModalFormSection>
            {categoryConfig?.requiresOffice && (
              <div className="max-w-[34rem] space-y-3">
                <Label>Priesthood Office*</Label>
                <div
                  className={cn(
                    "grid grid-cols-1 gap-3 sm:grid-cols-2",
                    touched.office && fieldErrors.office && "rounded-md border border-destructive/50 p-2"
                  )}
                  onBlurCapture={() => markTouched("office")}
                >
                  <div className="space-y-2 rounded-md border border-border/50 p-2.5">
                    <p className="text-xs font-medium text-muted-foreground">Aaronic Priesthood</p>
                    <RadioGroup
                      value={office}
                      onValueChange={(v) => setOffice(v as PriesthoodOffice)}
                      className="space-y-2"
                    >
                      {PRIESTHOOD_OFFICES.filter(
                        (o) => o.priesthood === "aaronic"
                      ).map((o) => (
                        <div
                          key={o.value}
                          className="flex items-center space-x-2"
                        >
                          <RadioGroupItem
                            value={o.value}
                            id={o.value}
                            disabled={isLoading}
                          />
                          <Label
                            htmlFor={o.value}
                            className="cursor-pointer text-sm font-normal"
                          >
                            {o.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  <div className="space-y-2 rounded-md border border-border/50 p-2.5">
                    <p className="text-xs font-medium text-muted-foreground">Melchizedek Priesthood</p>
                    <RadioGroup
                      value={office}
                      onValueChange={(v) => setOffice(v as PriesthoodOffice)}
                      className="space-y-2"
                    >
                      {PRIESTHOOD_OFFICES.filter(
                        (o) => o.priesthood === "melchizedek"
                      ).map((o) => (
                        <div
                          key={o.value}
                          className="flex items-center space-x-2"
                        >
                          <RadioGroupItem
                            value={o.value}
                            id={o.value}
                            disabled={isLoading}
                          />
                          <Label
                            htmlFor={o.value}
                            className="cursor-pointer text-sm font-normal"
                          >
                            {o.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
                {touched.office && fieldErrors.office && (
                  <p className="text-xs text-destructive">{fieldErrors.office}</p>
                )}
                {office && (
                  <p className="text-sm text-muted-foreground">
                    Selected: <strong>{formatOffice(office)}</strong> in the{" "}
                    <strong>{formatPriesthood(priesthood)}</strong> Priesthood
                  </p>
                )}
              </div>
            )}

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
          <div className="max-w-[34rem] space-y-3">
            <p className="text-sm font-semibold tracking-tight text-foreground">Script</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:max-w-[16rem]">
                <Label>Gender pronouns*</Label>
                <Select
                  value={gender}
                  onValueChange={(v) => {
                    setGender(v as Gender);
                    markTouched("gender");
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger
                    id="genderPronouns"
                    onBlur={() => markTouched("gender")}
                    className={cn(
                      touched.gender && fieldErrors.gender && "border-destructive focus:ring-destructive/30"
                    )}
                  >
                    <SelectValue placeholder="Select pronoun..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Brother (he/him)</SelectItem>
                    <SelectItem value="female">Sister (she/her)</SelectItem>
                  </SelectContent>
                </Select>
                {touched.gender && fieldErrors.gender && (
                  <p className="text-xs text-destructive">{fieldErrors.gender}</p>
                )}
              </div>
            </div>
          </div>
        </ModalFormSection>

        {category && validation.valid && (
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
              {highlightedScriptPreview || (
                <span className="text-muted-foreground italic">
                  Complete the form to see the script preview...
                </span>
              )}
            </div>
          </ModalFormSection>
        )}

        <ModalFormSection>
          <div className="max-w-[34rem] space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={language}
                onValueChange={(value) => setLanguage(value as Language)}
                disabled={isLoading}
              >
                <SelectTrigger
                  className={cn(
                    "h-8 w-auto rounded-full px-3 text-xs font-medium shadow-sm transition-colors [&>svg]:hidden",
                    language !== "ENG"
                      ? "border-transparent bg-[hsl(var(--chip-active-bg))] text-[hsl(var(--chip-active-text))]"
                      : "border-[hsl(var(--chip-border))] bg-[hsl(var(--chip-bg))] text-[hsl(var(--chip-text))] hover:bg-[hsl(var(--chip-hover-bg))]"
                  )}
                >
                  <span>Overwrite language</span>
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
