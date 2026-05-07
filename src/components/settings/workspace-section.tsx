"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Save, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { canManage } from "@/lib/auth/role-permissions";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

type WorkspaceSectionProps = {
    workspace: {
        id: string;
        name: string;
        type: string;
        organization_type: string;
        mfa_required: boolean;
        slug: string | null;
    };
    currentUserRole: string;
};

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

export function WorkspaceSection({
    workspace,
    currentUserRole,
}: WorkspaceSectionProps) {
    const router = useRouter();
    const [workspaceName, setWorkspaceName] = useState(workspace.name);
    const [mfaRequired, setMfaRequired] = useState(workspace.mfa_required);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingMfa, setIsSavingMfa] = useState(false);
    const isAdmin = canManage(currentUserRole);

    const handleSaveWorkspace = async () => {
        if (!isAdmin || workspaceName === workspace.name) return;

        setIsSaving(true);
        const supabase = createClient();

        const { error } = await (supabase.from("workspaces") as ReturnType<typeof supabase.from>)
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

    const handleToggleMfaRequired = async (enabled: boolean) => {
        setIsSavingMfa(true);
        const supabase = createClient();

        const { error } = await (supabase.from("workspaces") as ReturnType<typeof supabase.from>)
            .update({ mfa_required: enabled })
            .eq("id", workspace.id);

        if (error) {
            toast.error("Failed to update MFA setting");
            setMfaRequired(!enabled);
        } else {
            setMfaRequired(enabled);
            toast.success(
                enabled
                    ? "MFA is now required for all members"
                    : "MFA requirement removed"
            );
            router.refresh();
        }
        setIsSavingMfa(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Workspace</h1>
                <p className="text-muted-foreground">
                    Update workspace details and security settings.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Workspace Details
                    </CardTitle>
                    <CardDescription>
                        {isAdmin
                            ? "Update your workspace information."
                            : "View your workspace information."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Workspace Name</Label>
                        <div className="flex gap-2">
                            <Input
                                id="name"
                                value={workspaceName}
                                onChange={(event) => setWorkspaceName(event.target.value)}
                                disabled={!isAdmin || isSaving}
                                className="max-w-md"
                            />
                            {isAdmin && workspaceName !== workspace.name ? (
                                <Button onClick={handleSaveWorkspace} disabled={isSaving}>
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    <span className="ml-2">Save</span>
                                </Button>
                            ) : null}
                        </div>
                    </div>

                    <div className="grid max-w-md grid-cols-2 gap-4">
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

                    {!isAdmin ? (
                        <p className="mt-4 text-sm text-muted-foreground">
                            Contact an admin to change workspace settings.
                        </p>
                    ) : null}
                </CardContent>
            </Card>

            {isAdmin ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Security
                        </CardTitle>
                        <CardDescription>
                            Manage security settings for your workspace.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                                <p className="font-medium">Require Two-Factor Authentication</p>
                                <p className="text-sm text-muted-foreground">
                                    All workspace members will be required to set up MFA before
                                    accessing the workspace.
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
            ) : null}
        </div>
    );
}
