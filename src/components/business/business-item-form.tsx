"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TemplateSelector } from "@/components/templates/template-selector";
import {
  generateBusinessScript,
  validateBusinessItemDetails,
  PRIESTHOOD_OFFICES,
  getPriesthoodFromOffice,
  formatOffice,
  formatPriesthood,
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
  const [gender, setGender] = useState<Gender | undefined>(
    initialData?.details?.gender
  );
  const [office, setOffice] = useState<PriesthoodOffice | undefined>(
    initialData?.details?.office
  );
  const [customScript, setCustomScript] = useState(
    initialData?.details?.customScript || ""
  );

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
        gender: category === "ordination" ? "male" : gender,
        office,
        priesthood,
        customScript: category === "other" ? customScript : undefined,
      },
    }),
    [personName, positionCalling, category, notes, gender, office, priesthood, customScript]
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Main Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Create New" : "Edit"} Business Item
          </CardTitle>
          <CardDescription>
            Add a formal church procedure to track. The conducting script will
            be generated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Person Name - Always visible */}
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

          {/* Category Selection */}
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

          {/* Conditional Fields Based on Category */}
          {category && (
            <div className="space-y-4 pt-4 border-t">
              {/* Position/Calling - for sustaining, release, setting_apart */}
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

              {/* Priesthood Office - for ordination */}
              {categoryConfig?.requiresOffice && (
                <div className="space-y-3">
                  <Label>Priesthood Office *</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Aaronic Priesthood */}
                    <div className="space-y-2">
                      <Badge variant="outline" className="mb-2">
                        Aaronic Priesthood
                      </Badge>
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
                              className="font-normal cursor-pointer"
                            >
                              {o.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                    {/* Melchizedek Priesthood */}
                    <div className="space-y-2">
                      <Badge variant="outline" className="mb-2">
                        Melchizedek Priesthood
                      </Badge>
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
                              className="font-normal cursor-pointer"
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

              {/* Gender Selection - for categories that need pronouns */}
              {categoryConfig?.requiresGender && (
                <div className="space-y-2">
                  <Label>Gender (for correct pronouns) *</Label>
                  <RadioGroup
                    value={gender}
                    onValueChange={(v) => setGender(v as Gender)}
                    className="flex gap-4"
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

              {/* Custom Script - for "other" category */}
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
                    rows={4}
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Status and Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <p className="text-xs text-muted-foreground">
                  Leave blank to use today&apos;s date
                </p>
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

          {/* Template Selector */}
          <div className="pt-4 border-t">
            <TemplateSelector
              value={selectedTemplateId}
              onChange={setSelectedTemplateId}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Script Preview Card */}
      {category && (
        <Card
          className={cn(
            "border-2",
            validation.valid ? "border-blue-200 bg-blue-50/50" : "border-amber-200 bg-amber-50/50"
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Conducting Script Preview
              </CardTitle>
              {validation.valid ? (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Ready
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-700 border-amber-200"
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Incomplete
                </Badge>
              )}
            </div>
            <CardDescription>
              This is the official wording that will be displayed to the
              conducting leader
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Validation Errors */}
            {!validation.valid && validation.errors.length > 0 && (
              <div className="mb-4 p-3 bg-amber-100 rounded-md border border-amber-200">
                <p className="text-sm font-medium text-amber-800 mb-1">
                  Please complete the following:
                </p>
                <ul className="text-sm text-amber-700 list-disc list-inside">
                  {validation.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Script Preview */}
            <ScrollArea className="h-[180px]">
              <div
                className={cn(
                  "p-4 rounded-md font-serif text-base leading-relaxed whitespace-pre-wrap",
                  "bg-white border shadow-inner"
                )}
              >
                {scriptPreview || (
                  <span className="text-muted-foreground italic">
                    Complete the form to see the script preview...
                  </span>
                )}
              </div>
            </ScrollArea>

            <p className="text-xs text-muted-foreground mt-3 italic">
              Note: This script follows General Handbook standards. The text in
              [brackets] indicates where you need to pause or take action.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Submit Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          disabled={isLoading || !validation.valid}
          size="lg"
        >
          {isLoading
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
            ? "Create Business Item"
            : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
