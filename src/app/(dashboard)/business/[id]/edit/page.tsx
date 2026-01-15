"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { useToast } from "@/lib/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TemplateSelector } from "@/components/templates/template-selector";

export default function EditBusinessPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form fields
  const [personName, setPersonName] = useState("");
  const [positionCalling, setPositionCalling] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("pending");
  const [actionDate, setActionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    loadBusinessData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBusinessData = async () => {
    const supabase = createClient();
    const businessItemId = params.id as string;

    // Get business item
    const { data: businessItem, error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("business_items") as any)
      .select("*")
      .eq("id", businessItemId)
      .single();

    if (error || !businessItem) {
      toast({
        title: "Error",
        description: "Failed to load business item.",
        variant: "destructive",
      });
      router.push("/business");
      return;
    }

    // Check if user can edit (leader check)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("profiles") as any)
      .select("role")
      .eq("id", user?.id)
      .single();

    if (!["leader", "admin"].includes(profile?.role || "")) {
      toast({
        title: "Error",
        description: "You don't have permission to edit this business item.",
        variant: "destructive",
      });
      router.push("/business");
      return;
    }

    // Load business item data
    setPersonName(businessItem.person_name);
    setPositionCalling(businessItem.position_calling || "");
    setCategory(businessItem.category);
    setStatus(businessItem.status);
    setActionDate(businessItem.action_date || "");
    setNotes(businessItem.notes || "");

    // Fetch existing template link
    const { data: templateLink } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("business_templates") as any)
      .select("template_id")
      .eq("business_item_id", businessItemId)
      .maybeSingle();

    if (templateLink) {
      setSelectedTemplateId(templateLink.template_id);
    }

    setIsLoadingData(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();
    const businessItemId = params.id as string;

    // Update business item
    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("business_items") as any)
      .update({
        person_name: personName,
        position_calling: positionCalling || null,
        category,
        status,
        action_date: actionDate || null,
        notes: notes || null,
      })
      .eq("id", businessItemId);

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update business item.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Update template link
    // First, delete any existing link
    await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("business_templates") as any)
      .delete()
      .eq("business_item_id", businessItemId);

    // Then insert new link if a template is selected
    if (selectedTemplateId) {
      const { error: templateError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("business_templates") as any)
        .insert({
          business_item_id: businessItemId,
          template_id: selectedTemplateId,
        });

      if (templateError) {
        console.error("Error updating template link:", templateError);
      }
    }

    toast({
      title: "Success",
      description: "Business item updated successfully!",
    });

    setIsLoading(false);
    router.push(`/business/${businessItemId}`);
    router.refresh();
  };

  if (isLoadingData) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <p className="text-center text-muted-foreground">
          Loading business item...
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href={`/business/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Business Item
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit Business Item</CardTitle>
            <CardDescription>Update business item details and status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="personName">Person Name *</Label>
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
              <Label htmlFor="positionCalling">Position/Calling</Label>
              <Input
                id="positionCalling"
                value={positionCalling}
                onChange={(e) => setPositionCalling(e.target.value)}
                placeholder="e.g., Sunday School President (leave blank if not applicable)"
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
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
                    <SelectItem value="sustaining">Sustaining</SelectItem>
                    <SelectItem value="release">Release</SelectItem>
                    <SelectItem value="confirmation">Confirmation</SelectItem>
                    <SelectItem value="ordination">Ordination</SelectItem>
                    <SelectItem value="setting_apart">Setting Apart</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional context or details"
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="pt-4 border-t">
              <TemplateSelector
                value={selectedTemplateId}
                onChange={setSelectedTemplateId}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/business/${params.id}`)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !category}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
