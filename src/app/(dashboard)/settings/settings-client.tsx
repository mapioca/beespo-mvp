"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { TeamMembersList } from "@/components/team/team-members-list";
import { PendingInvitations } from "@/components/team/pending-invitations";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { DeleteAccountDialog } from "@/components/auth/delete-account-dialog";
import { Building2, Users, Users2, Save, Loader2, User, AlertTriangle, Plug, Bell, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ZoomFullLogo } from "@/components/ui/zoom-icon";
import { SharingGroupsTab } from "@/components/settings/sharing-groups-tab";
import { NotificationPreferencesTab } from "@/components/settings/notification-preferences-tab";
import { MfaSettings } from "@/components/settings/mfa-settings";
import type { SharingGroupWithMembers } from "@/types/share";

interface Workspace {
    id: string;
    name: string;
    type: string;
    organization_type: string;
    mfa_required: boolean;
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

interface WorkspaceMember {
    email: string;
    full_name: string | null;
}

interface SettingsClientProps {
    workspace: Workspace;
    members: TeamMember[];
    invitations: Invitation[];
    currentUserId: string;
    currentUserRole: string;
    currentUserDetails: {
        fullName: string;
        email: string;
        roleTitle: string;
    };
    isZoomConnected: boolean;
    sharingGroups: SharingGroupWithMembers[];
    workspaceMembers: WorkspaceMember[];
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
    currentUserDetails,
    isZoomConnected,
    sharingGroups,
    workspaceMembers,
}: SettingsClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get("tab") || "account";
    const [workspaceName, setWorkspaceName] = useState(workspace.name);
    const [userFullName, setUserFullName] = useState(currentUserDetails.fullName);
    const [userRoleTitle, setUserRoleTitle] = useState(currentUserDetails.roleTitle);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isDisconnectingZoom, setIsDisconnectingZoom] = useState(false);
    const [mfaRequired, setMfaRequired] = useState(workspace.mfa_required);
    const [isSavingMfa, setIsSavingMfa] = useState(false);
    const isAdmin = currentUserRole === "admin";

    const handleDisconnectZoom = async () => {
        setIsDisconnectingZoom(true);
        try {
            const res = await fetch("/api/auth/zoom/disconnect", { method: "POST" });
            if (!res.ok) throw new Error("Failed to disconnect");
            toast.success("Zoom disconnected");
            router.refresh();
        } catch {
            toast.error("Failed to disconnect Zoom. Please try again.");
        } finally {
            setIsDisconnectingZoom(false);
        }
    };

    const hasProfileChanges = userFullName !== currentUserDetails.fullName || userRoleTitle !== currentUserDetails.roleTitle;

    const handleSaveWorkspace = async () => {
        if (!isAdmin || workspaceName === workspace.name) return;

        setIsSaving(true);
        const supabase = createClient();


        const { error } = await (supabase
            .from("workspaces") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .update({ name: workspaceName })
            .eq("id", workspace.id);

        if (error) {
            toast.error(error.message || "Failed to update workspace name");
        } else {
            toast.success("Saved", { description: "Workspace name has been updated." });
            router.refresh();
        }

        setIsSaving(false);
    };

    const handleSaveProfile = async () => {
        if (!hasProfileChanges) return;

        setIsSavingProfile(true);
        const supabase = createClient();

        const { error } = await (supabase
            .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .update({
                full_name: userFullName,
                role_title: userRoleTitle || null,
            })
            .eq("id", currentUserId);

        if (error) {
            toast.error(error.message || "Failed to update profile");
        } else {
            toast.success("Saved", { description: "Your profile has been updated." });
            router.refresh();
        }

        setIsSavingProfile(false);
    };

    const handleToggleMfaRequired = async (enabled: boolean) => {
        setIsSavingMfa(true);
        const supabase = createClient();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("workspaces") as any)
            .update({ mfa_required: enabled })
            .eq("id", workspace.id);

        if (error) {
            toast.error("Failed to update MFA setting");
            setMfaRequired(!enabled);
        } else {
            setMfaRequired(enabled);
            toast.success(enabled ? "MFA is now required for all members" : "MFA requirement removed");
            router.refresh();
        }
        setIsSavingMfa(false);
    };

    const handleRefresh = () => {
        router.refresh();
    };

    return (
        <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your workspace settings and team members
                </p>
            </div>

            <Tabs defaultValue={defaultTab} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="account" className="gap-2">
                        <User className="h-4 w-4" />
                        Account
                    </TabsTrigger>
                    <TabsTrigger value="general" className="gap-2">
                        <Building2 className="h-4 w-4" />
                        Workspace
                    </TabsTrigger>
                    <TabsTrigger value="team" className="gap-2">
                        <Users className="h-4 w-4" />
                        Team
                    </TabsTrigger>
                    <TabsTrigger value="sharing-groups" className="gap-2">
                        <Users2 className="h-4 w-4" />
                        Sharing Groups
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="gap-2">
                        <Bell className="h-4 w-4" />
                        Notifications
                    </TabsTrigger>
                    <TabsTrigger value="integrations" className="gap-2">
                        <Plug className="h-4 w-4" />
                        Integrations
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="account" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Settings</CardTitle>
                            <CardDescription>
                                Manage your personal account information
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input
                                    id="fullName"
                                    value={userFullName}
                                    onChange={(e) => setUserFullName(e.target.value)}
                                    disabled={isSavingProfile}
                                    className="max-w-md"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="roleTitle">Role / Calling</Label>
                                <Input
                                    id="roleTitle"
                                    value={userRoleTitle}
                                    onChange={(e) => setUserRoleTitle(e.target.value)}
                                    disabled={isSavingProfile}
                                    placeholder="e.g., Relief Society President"
                                    className="max-w-md"
                                />
                                <p className="text-xs text-muted-foreground">Your calling or role in the organization.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    value={currentUserDetails.email}
                                    disabled
                                    className="max-w-md bg-muted"
                                />
                                <p className="text-xs text-muted-foreground">Email address cannot be changed currently.</p>
                            </div>
                            {hasProfileChanges && (
                                <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                                    {isSavingProfile ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    <span className="ml-2">Save Changes</span>
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                    <ChangePasswordForm email={currentUserDetails.email} />

                    <MfaSettings workspaceMfaRequired={workspace.mfa_required} />

                    {/* Danger Zone */}
                    <Card className="border-destructive/50">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                            </div>
                            <CardDescription>
                                Irreversible and destructive actions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                                <div>
                                    <p className="font-medium">Delete Account</p>
                                    <p className="text-sm text-muted-foreground">
                                        Permanently delete your account and remove your personal data.
                                        Your workspace content will remain visible as &quot;Former Member&quot;.
                                    </p>
                                </div>
                                <DeleteAccountDialog userEmail={currentUserDetails.email} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

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

                    {isAdmin && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5" />
                                    Security
                                </CardTitle>
                                <CardDescription>
                                    Manage security settings for your workspace
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between p-4 rounded-lg border">
                                    <div>
                                        <p className="font-medium">Require Two-Factor Authentication</p>
                                        <p className="text-sm text-muted-foreground">
                                            All workspace members will be required to set up MFA before accessing the workspace.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={mfaRequired}
                                        onCheckedChange={handleToggleMfaRequired}
                                        disabled={isSavingMfa}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}
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

                <TabsContent value="sharing-groups" className="space-y-6">
                    <SharingGroupsTab
                        sharingGroups={sharingGroups}
                        workspaceMembers={workspaceMembers}
                        canManage={isAdmin || currentUserRole === "leader"}
                    />
                </TabsContent>

                <TabsContent value="notifications" className="space-y-6">
                    <NotificationPreferencesTab />
                </TabsContent>

                <TabsContent value="integrations" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Integrations</CardTitle>
                            <CardDescription>
                                Connect third-party services to enhance your meeting workflow
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 rounded-lg border">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 overflow-hidden rounded-lg">
                                        <ZoomFullLogo className="h-full w-full" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Zoom</p>
                                        <p className="text-sm text-muted-foreground">
                                            Connect your personal Zoom account to create meetings from agendas
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-4">
                                    {isZoomConnected ? (
                                        <>
                                            <Badge variant="secondary" className="text-green-600 bg-green-500/10">
                                                Connected
                                            </Badge>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleDisconnectZoom}
                                                disabled={isDisconnectingZoom}
                                            >
                                                {isDisconnectingZoom ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    "Disconnect"
                                                )}
                                            </Button>
                                        </>
                                    ) : (
                                        <Button asChild size="sm">
                                            <Link href="/api/auth/zoom/authorize">Connect Zoom</Link>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
        </div>
    );
}
