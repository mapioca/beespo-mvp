"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/lib/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewSpeakerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);

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

    if (!profile || profile.role !== "leader") {
      toast({
        title: "Error",
        description: "Only leaders can create speakers.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Create speaker
    const { data: speaker, error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("speakers") as any)
      .insert({
        name,
        topic,
        is_confirmed: isConfirmed,
        workspace_id: profile.workspace_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create speaker.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: "Success",
      description: "Speaker created successfully!",
    });

    setIsLoading(false);
    router.push(`/speakers/${speaker.id}`);
    router.refresh();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/speakers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Speakers
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Speaker</CardTitle>
            <CardDescription>
              Add a speaker to track who spoke and their topic
            </CardDescription>
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
            onClick={() => router.push("/speakers")}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !name || !topic}>
            {isLoading ? "Creating..." : "Create Speaker"}
          </Button>
        </div>
      </form>
    </div>
  );
}
