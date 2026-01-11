"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { TeamMembersList } from "@/components/team/team-members-list";
import { PendingInvitations } from "@/components/team/pending-invitations";
import { Building2, Users, Save, Loader2 } from "lucide-react";

interface Workspace {
    id: string;
    name: string;
    type: string;
    organization_type: string;
}

interface TeamMember {
    id: string;
    email: string;
    full_name: string;
    role: "admin" | "leader" | "guest";
    created_at: string;
}

interface Invitation {
    id: string;
    email: string;
    role: string;
    expires_at: string;
    created_at: string;
    invited_by: {
        full_name: string;
    } | null;
}

interface SettingsClientProps {
    workspace: Workspace;
    members: TeamMember[];
    invitations: Invitation[];
    currentUserId: string;
    currentUserRole: string;
}

const workspaceTypeLabels: Record<string, string> = {
    ward: "Ward",
    branch: "Branch",
    stake: "Stake",
    district: "District",
};

const organizationTypeLabels: Record<string, string> = {
    bishopric: "Bishopric",
    elders_quorum: "Elders Quorum",
    relief_society: "Relief Society",
    young_men: "Young Men",
    young_women: "Young Women",
    primary: "Primary",
    missionary_work: "Missionary Work",
    temple_family_history: "Temple & Family History",
    sunday_school: "Sunday School",
};

export function SettingsClient({
    workspace,
    members,
    invitations,
    currentUserId,
    currentUserRole,
}: SettingsClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [workspaceName, setWorkspaceName] = useState(workspace.name);
    const [isSaving, setIsSaving] = useState(false);
    const isAdmin = currentUserRole === "admin";

    const handleSaveWorkspace = async () => {
        if (!isAdmin || workspaceName === workspace.name) return;

        setIsSaving(true);
        const supabase = createClient();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
            .from("workspaces")
            .update({ name: workspaceName })
            .eq("id", workspace.id);

        if (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to update workspace name",
                variant: "destructive",
            });
        } else {
            toast({
                title: "Saved",
                description: "Workspace name has been updated.",
            });
            router.refresh();
        }

        setIsSaving(false);
    };

    const handleRefresh = () => {
        router.refresh();
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your workspace settings and team members
                </p>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="general" className="gap-2">
                        <Building2 className="h-4 w-4" />
                        General
                    </TabsTrigger>
                    <TabsTrigger value="team" className="gap-2">
                        <Users className="h-4 w-4" />
                        Team
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Workspace Details</CardTitle>
                            <CardDescription>
                                {isAdmin
                                    ? "Update your workspace information"
                                    : "View your workspace information"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Workspace Name</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="name"
                                        value={workspaceName}
                                        onChange={(e) => setWorkspaceName(e.target.value)}
                                        disabled={!isAdmin || isSaving}
                                        className="max-w-md"
                                    />
                                    {isAdmin && workspaceName !== workspace.name && (
                                        <Button onClick={handleSaveWorkspace} disabled={isSaving}>
                                            {isSaving ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Save className="h-4 w-4" />
                                            )}
                                            <span className="ml-2">Save</span>
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 max-w-md">
                                <div className="space-y-2">
                                    <Label>Workspace Type</Label>
                                    <Badge variant="secondary" className="text-sm">
                                        {workspaceTypeLabels[workspace.type] || workspace.type}
                                    </Badge>
                                </div>
                                <div className="space-y-2">
                                    <Label>Organization</Label>
                                    <Badge variant="outline" className="text-sm">
                                        {organizationTypeLabels[workspace.organization_type] || workspace.organization_type}
                                    </Badge>
                                </div>
                            </div>

                            {!isAdmin && (
                                <p className="text-sm text-muted-foreground mt-4">
                                    Contact an admin to change workspace settings.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="team" className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Team Members</CardTitle>
                                <CardDescription>
                                    {members.length} member{members.length !== 1 ? "s" : ""} in this workspace
                                </CardDescription>
                            </div>
                            {isAdmin && <InviteMemberDialog onInviteSent={handleRefresh} />}
                        </CardHeader>
                        <CardContent>
                            <TeamMembersList
                                members={members}
                                currentUserId={currentUserId}
                                currentUserRole={currentUserRole}
                                onMemberUpdated={handleRefresh}
                            />
                        </CardContent>
                    </Card>

                    {(isAdmin || invitations.length > 0) && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Pending Invitations</CardTitle>
                                <CardDescription>
                                    Invitations that haven&apos;t been accepted yet
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <PendingInvitations
                                    invitations={invitations}
                                    isAdmin={isAdmin}
                                    onInvitationUpdated={handleRefresh}
                                />
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
