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
import type { WorkspaceType, OrganizationType } from "@/types/database";

const workspaceTypes: { value: WorkspaceType; label: string }[] = [
  { value: "ward", label: "Ward" },
  { value: "branch", label: "Branch" },
  { value: "stake", label: "Stake" },
  { value: "district", label: "District" },
];

const organizationTypes: { value: OrganizationType; label: string }[] = [
  { value: "bishopric", label: "Bishopric" },
  { value: "elders_quorum", label: "Elders Quorum" },
  { value: "relief_society", label: "Relief Society" },
  { value: "young_men", label: "Young Men" },
  { value: "young_women", label: "Young Women" },
  { value: "primary", label: "Primary" },
  { value: "missionary_work", label: "Missionary Work" },
  { value: "temple_family_history", label: "Temple & Family History" },
  { value: "sunday_school", label: "Sunday School" },
];

export default function SetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Create new workspace
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("ward");
  const [organizationType, setOrganizationType] = useState<OrganizationType>("bishopric");

  // Join existing workspace
  const [inviteToken, setInviteToken] = useState("");

  const handleCreateWorkspace = async (e: React.FormEvent) => {
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

    // Create workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: workspace, error: workspaceError } = await (supabase as any)
      .from("workspaces")
      .insert({
        name: workspaceName,
        type: workspaceType,
        organization_type: organizationType,
      })
      .select()
      .single();

    if (workspaceError || !workspace) {
      toast({
        title: "Error",
        description: workspaceError?.message || "Failed to create workspace.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Create profile for user as admin (owner)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profileError } = await (supabase as any)
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata.full_name || user.email?.split("@")[0] || "User",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        workspace_id: (workspace as any).id,
        role: "admin",
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
      description: `${workspaceName} has been created successfully!`,
    });

    setIsLoading(false);
    router.push("/dashboard");
    router.refresh();
  };

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: inviteToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = typeof data.error === "string" ? data.error : "Failed to accept invitation";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      if (data.needsAuth) {
        toast({
          title: "Error",
          description: "Please sign up or log in first.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Success",
        description: `You've joined ${data.workspaceName}!`,
      });

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join workspace",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Set up your workspace</CardTitle>
        <CardDescription>
          Create a new workspace for your organization, or join an existing one
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="join">Join Existing</TabsTrigger>
          </TabsList>
          <TabsContent value="create" className="space-y-4 pt-4">
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspaceName">Workspace Name</Label>
                <Input
                  id="workspaceName"
                  type="text"
                  placeholder="e.g., Riverside Ward"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workspaceType">Unit Type</Label>
                  <Select
                    value={workspaceType}
                    onValueChange={(value: WorkspaceType) => setWorkspaceType(value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="workspaceType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaceTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizationType">Organization</Label>
                  <Select
                    value={organizationType}
                    onValueChange={(value: OrganizationType) => setOrganizationType(value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="organizationType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {organizationTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Workspace"}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="join" className="space-y-4 pt-4">
            <form onSubmit={handleJoinWorkspace} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteToken">Invitation Token</Label>
                <Input
                  id="inviteToken"
                  type="text"
                  placeholder="Paste your invitation token here"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  You can find this in the invitation email, or ask your workspace admin for the token.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Joining..." : "Join Workspace"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
