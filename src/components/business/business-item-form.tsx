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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ModalForm,
  ModalFormBody,
  ModalFormFooter,
  ModalFormSection,
  ModalFormSectionDescription,
  ModalFormSectionHeader,
  ModalFormSectionTitle,
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
import {
  FileText,
  User,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";

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
  // Form state
  const [personName, setPersonName] = useState(initialData?.personName || "");
  const [positionCalling, setPositionCalling] = useState(
    initialData?.positionCalling || ""
  );
  const [category, setCategory] = useState(initialData?.category || "");
  const [status, setStatus] = useState(initialData?.status || "pending");
  const [actionDate, setActionDate] = useState(initialData?.actionDate || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    initialData?.templateId || null
  );

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
  const [optionalOpen, setOptionalOpen] = useState(false);

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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validation.valid) return;

    const formData: BusinessItemFormData = {
      personName,
      positionCalling,
      category,
      status,
      actionDate,
      notes,
      details: {
        language,
        gender: category === "ordination" ? "male" : gender,
        office,
        priesthood,
        customScript: category === "other" ? customScript : undefined,
      },
      templateId: selectedTemplateId,
    };

    await onSubmit(formData);
  };

  // Reset office when category changes away from ordination
  useEffect(() => {
    if (category !== "ordination") {
      setOffice(undefined);
    }
  }, [category]);

  return (
    <ModalForm onSubmit={handleSubmit}>
      <ModalFormBody className="space-y-5">
        <ModalFormSection className="rounded-xl border border-border/60 p-4">
          <ModalFormSectionHeader>
            <ModalFormSectionTitle>Required</ModalFormSectionTitle>
            <ModalFormSectionDescription>
              Core fields needed to create this item.
            </ModalFormSectionDescription>
          </ModalFormSectionHeader>

          <div className="space-y-2">
            <Label htmlFor="personName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Person Name *
            </Label>
            <Input
              id="personName"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="e.g., John Smith"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Category *
            </Label>
            <Select
              value={category}
              onValueChange={setCategory}
              disabled={isLoading}
              required
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex flex-col">
                      <span>{opt.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {opt.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scriptLanguage" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Script Language *
            </Label>
            <Select
              value={language}
              onValueChange={(v) => setLanguage(v as Language)}
              disabled={isLoading}
              required
            >
              <SelectTrigger id="scriptLanguage">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENG">English</SelectItem>
                <SelectItem value="SPA">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </ModalFormSection>

        {category && (
          <ModalFormSection className="rounded-xl border border-border/60 p-4">
            <ModalFormSectionHeader>
              <ModalFormSectionTitle>Category Details</ModalFormSectionTitle>
              <ModalFormSectionDescription>
                Fields required by the selected category.
              </ModalFormSectionDescription>
            </ModalFormSectionHeader>

            {categoryConfig?.requiresCalling && (
              <div className="space-y-2">
                <Label htmlFor="positionCalling">
                  Position/Calling *
                </Label>
                <Input
                  id="positionCalling"
                  value={positionCalling}
                  onChange={(e) => setPositionCalling(e.target.value)}
                  placeholder="e.g., Sunday School President"
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            {categoryConfig?.requiresOffice && (
              <div className="space-y-3">
                <Label>Priesthood Office *</Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2 rounded-md border border-border/50 p-3">
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
                  <div className="space-y-2 rounded-md border border-border/50 p-3">
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
                {office && (
                  <p className="text-sm text-muted-foreground">
                    Selected: <strong>{formatOffice(office)}</strong> in the{" "}
                    <strong>{formatPriesthood(priesthood)}</strong> Priesthood
                  </p>
                )}
              </div>
            )}

            {categoryConfig?.requiresGender && (
              <div className="space-y-2">
                <Label>Gender (for correct pronouns) *</Label>
                <RadioGroup
                  value={gender}
                  onValueChange={(v) => setGender(v as Gender)}
                  className="flex flex-col gap-2 sm:flex-row sm:gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="male"
                      id="male"
                      disabled={isLoading}
                    />
                    <Label htmlFor="male" className="font-normal cursor-pointer">
                      Brother (he/him)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="female"
                      id="female"
                      disabled={isLoading}
                    />
                    <Label htmlFor="female" className="font-normal cursor-pointer">
                      Sister (she/her)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {category === "other" && (
              <div className="space-y-2">
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

        <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
          <ModalFormSection className="rounded-xl border border-border/60 p-4">
            <CollapsibleTrigger className="group flex w-full items-center justify-between text-left">
              <div className="space-y-1">
                <ModalFormSectionTitle>Optional Metadata</ModalFormSectionTitle>
                <ModalFormSectionDescription>
                  Additional context and defaults.
                </ModalFormSectionDescription>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  optionalOpen && "rotate-180"
                )}
              />
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={status}
                    onValueChange={setStatus}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {status === "completed" && (
                  <div className="space-y-2">
                    <Label htmlFor="actionDate">Action Date</Label>
                    <Input
                      id="actionDate"
                      type="date"
                      value={actionDate}
                      onChange={(e) => setActionDate(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional context or details (not shown in script)"
                  rows={2}
                  disabled={isLoading}
                />
              </div>

              <div className="pt-1">
                <TemplateSelector
                  value={selectedTemplateId}
                  onChange={setSelectedTemplateId}
                  disabled={isLoading}
                />
              </div>
            </CollapsibleContent>
          </ModalFormSection>
        </Collapsible>

        {category && (
          <ModalFormSection className="rounded-xl border border-border/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <ModalFormSectionTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Script Preview
              </ModalFormSectionTitle>
              {validation.valid ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Ready
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                  <AlertCircle className="h-3 w-3" />
                  Incomplete
                </span>
              )}
            </div>

            {!validation.valid && validation.errors.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5">
                <ul className="list-disc list-inside text-xs text-amber-700 space-y-0.5">
                  {validation.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div
              className={cn(
                "max-h-[180px] overflow-y-auto rounded-md border bg-background p-3 text-sm leading-relaxed whitespace-pre-wrap",
                "font-serif"
              )}
            >
              {scriptPreview || (
                <span className="text-muted-foreground italic">
                  Complete the form to see the script preview...
                </span>
              )}
            </div>
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
