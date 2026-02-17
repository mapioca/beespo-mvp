"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EditSpeakerPage() {
  const router = useRouter();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form fields
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    loadSpeakerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSpeakerData = async () => {
    const supabase = createClient();
    const speakerId = params.id as string;

    // Get speaker
    const { data: speaker, error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("speakers") as any)
      .select("*")
      .eq("id", speakerId)
      .single();

    if (error || !speaker) {
      toast.error("Failed to load speaker.");
      router.push("/speakers");
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
      toast.error("You don't have permission to edit this speaker.");
      router.push("/speakers");
      return;
    }

    // Load speaker data
    setName(speaker.name);
    setTopic(speaker.topic);
    setIsConfirmed(speaker.is_confirmed);

    setIsLoadingData(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();
    const speakerId = params.id as string;

    // Update speaker
    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("speakers") as any)
      .update({
        name,
        topic,
        is_confirmed: isConfirmed,
      })
      .eq("id", speakerId);

    if (error) {
      toast.error(error.message || "Failed to update speaker.");
      setIsLoading(false);
      return;
    }

    toast.success("Speaker updated successfully!");

    setIsLoading(false);
    router.push(`/speakers/${speakerId}`);
    router.refresh();
  };

  if (isLoadingData) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <p className="text-center text-muted-foreground">Loading speaker...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href={`/speakers/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Speaker
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit Speaker</CardTitle>
            <CardDescription>Update speaker details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Speaker Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Brother John Smith"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic *</Label>
              <Textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What will they speak about?"
                rows={4}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Describe the topic or subject of the talk
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirmed"
                checked={isConfirmed}
                onCheckedChange={(checked) => setIsConfirmed(checked === true)}
                disabled={isLoading}
              />
              <Label
                htmlFor="confirmed"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Speaker is confirmed
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Check this box if the speaker has confirmed they will speak
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/speakers/${params.id}`)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !name || !topic}>
            {isLoading ? "Updating..." : "Update Speaker"}
          </Button>
        </div>
      </form>
    </div>
  );
}
