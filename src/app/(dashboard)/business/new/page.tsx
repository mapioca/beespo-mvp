"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function NewBusinessPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Form fields
  const [personName, setPersonName] = useState("");
  const [positionCalling, setPositionCalling] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("pending");
  const [actionDate, setActionDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Error",
        description: "Not authenticated. Please log in again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Get user profile
    const { data: profile } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("profiles") as any)
      .select("workspace_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || !["leader", "admin"].includes(profile.role)) {
      toast({
        title: "Error",
        description: "Only leaders and admins can create business items.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Create business item
    const { data: businessItem, error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("business_items") as any)
      .insert({
        person_name: personName,
        position_calling: positionCalling || null,
        category,
        status,
        action_date: actionDate || null,
        notes: notes || null,
        workspace_id: profile.workspace_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create business item.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: "Success",
      description: "Business item created successfully!",
    });

    setIsLoading(false);
    router.push(`/business/${businessItem.id}`);
    router.refresh();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/business">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Business
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Business Item</CardTitle>
            <CardDescription>
              Add a formal church procedure to track
            </CardDescription>
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
              <p className="text-xs text-muted-foreground">
                Not required for confirmations, ordinations, or other actions
              </p>
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
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/business")}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !category}>
            {isLoading ? "Creating..." : "Create Business Item"}
          </Button>
        </div>
      </form>
    </div>
  );
}
