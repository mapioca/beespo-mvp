"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Save } from "lucide-react";

import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { DeleteAccountDialog } from "@/components/auth/delete-account-dialog";
import { MfaSettings } from "@/components/settings/mfa-settings";
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
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

type AccountSectionProps = {
    currentUserId: string;
    currentUserDetails: {
        fullName: string;
        email: string;
        roleTitle: string;
    };
    workspaceMfaRequired: boolean;
};

export function AccountSection({
    currentUserId,
    currentUserDetails,
    workspaceMfaRequired,
}: AccountSectionProps) {
    const router = useRouter();
    const [userFullName, setUserFullName] = useState(currentUserDetails.fullName);
    const [userRoleTitle, setUserRoleTitle] = useState(currentUserDetails.roleTitle);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    const hasProfileChanges =
        userFullName !== currentUserDetails.fullName ||
        userRoleTitle !== currentUserDetails.roleTitle;

    const handleSaveProfile = async () => {
        if (!hasProfileChanges) return;

        setIsSavingProfile(true);
        const supabase = createClient();

        const { error } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Account</h1>
                <p className="text-muted-foreground">
                    Manage your personal account information and security settings.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Profile Settings</CardTitle>
                    <CardDescription>
                        Manage your personal account information.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                            id="fullName"
                            value={userFullName}
                            onChange={(event) => setUserFullName(event.target.value)}
                            disabled={isSavingProfile}
                            className="max-w-md"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="roleTitle">Role / Calling</Label>
                        <Input
                            id="roleTitle"
                            value={userRoleTitle}
                            onChange={(event) => setUserRoleTitle(event.target.value)}
                            disabled={isSavingProfile}
                            placeholder="e.g., Relief Society President"
                            className="max-w-md"
                        />
                        <p className="text-xs text-muted-foreground">
                            Your calling or role in the organization.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            value={currentUserDetails.email}
                            disabled
                            className="max-w-md bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                            Email address cannot be changed currently.
                        </p>
                    </div>
                    {hasProfileChanges ? (
                        <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                            {isSavingProfile ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            <span className="ml-2">Save Changes</span>
                        </Button>
                    ) : null}
                </CardContent>
            </Card>

            <ChangePasswordForm email={currentUserDetails.email} />

            <MfaSettings workspaceMfaRequired={workspaceMfaRequired} />

            <Card className="border-destructive/50">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    </div>
                    <CardDescription>
                        Irreversible and destructive actions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                        <div>
                            <p className="font-medium">Delete Account</p>
                            <p className="text-sm text-muted-foreground">
                                Permanently delete your account and remove your personal data.
                                Your workspace content will remain visible as &quot;Former User&quot;.
                            </p>
                        </div>
                        <DeleteAccountDialog userEmail={currentUserDetails.email} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
