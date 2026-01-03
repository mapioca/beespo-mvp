"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/lib/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

export default function SetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Create new organization
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState<"ward" | "stake">("ward");

  // Join existing organization (placeholder for now)
  const [joinCode, setJoinCode] = useState("");

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      toast({
        title: "Error",
        description: "Not authenticated. Please log in again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Create organization
    const { data: org, error: orgError } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("organizations") as any)
      .insert({
        name: organizationName,
        type: organizationType,
      })
      .select()
      .single();

    if (orgError) {
      toast({
        title: "Error",
        description: orgError.message || "Failed to create organization.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Create profile for user as leader
    const { error: profileError } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("profiles") as any)
      .insert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata.full_name || "",
        organization_id: org?.id,
        role: "leader",
      });

    if (profileError) {
      toast({
        title: "Error",
        description: profileError.message || "Failed to create profile.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: "Success",
      description: `${organizationName} has been created successfully!`,
    });

    setIsLoading(false);
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <Card className="border-border">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Set up your organization</CardTitle>
        <CardDescription>
          Create a new ward or stake, or join an existing one
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="join" disabled>
              Join Existing (Coming Soon)
            </TabsTrigger>
          </TabsList>
          <TabsContent value="create" className="space-y-4 pt-4">
            <form onSubmit={handleCreateOrganization} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  type="text"
                  placeholder="e.g., First Ward"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgType">Type</Label>
                <Select
                  value={organizationType}
                  onValueChange={(value: "ward" | "stake") =>
                    setOrganizationType(value)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger id="orgType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ward">Ward</SelectItem>
                    <SelectItem value="stake">Stake</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Organization"}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="join" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="joinCode">Invitation Code</Label>
              <Input
                id="joinCode"
                type="text"
                placeholder="Enter invitation code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                disabled
              />
            </div>
            <Button className="w-full" disabled>
              Join Organization
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
