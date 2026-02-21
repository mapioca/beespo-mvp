"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "@/routing";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { TeamMembersList } from "@/components/team/team-members-list";
import { PendingInvitations } from "@/components/team/pending-invitations";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { DeleteAccountDialog } from "@/components/auth/delete-account-dialog";
import { Building2, Users, Save, Loader2, User, AlertTriangle } from "lucide-react";

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
    currentUserDetails: {
        fullName: string;
        email: string;
        roleTitle: string;
    };
}

export function SettingsClient({
    workspace,
    members,
    invitations,
    currentUserId,
    currentUserRole,
    currentUserDetails,
}: SettingsClientProps) {
    const t = useTranslations("Dashboard.Settings");
    const dictionary = useTranslations("Dictionary");

    const workspaceTypeLabels: Record<string, string> = {
        ward: dictionary("unitTypes.ward"),
        branch: dictionary("unitTypes.branch"),
        stake: dictionary("unitTypes.stake"),
        district: dictionary("unitTypes.district"),
    };

    const organizationTypeLabels: Record<string, string> = {
        bishopric: dictionary("organizationTypes.bishopric"),
        elders_quorum: dictionary("organizationTypes.elders_quorum"),
        relief_society: dictionary("organizationTypes.relief_society"),
        young_men: dictionary("organizationTypes.young_men"),
        young_women: dictionary("organizationTypes.young_women"),
        primary: dictionary("organizationTypes.primary"),
        missionary_work: dictionary("organizationTypes.missionary_work"),
        temple_family_history: dictionary("organizationTypes.temple_family_history"),
        sunday_school: dictionary("organizationTypes.sunday_school"),
    };
    const router = useRouter();
    const pathname = usePathname();
    const currentLocale = useLocale();
    const [workspaceName, setWorkspaceName] = useState(workspace.name);
    const [userFullName, setUserFullName] = useState(currentUserDetails.fullName);
    const [userRoleTitle, setUserRoleTitle] = useState(currentUserDetails.roleTitle);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const isAdmin = currentUserRole === "admin";

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
            toast.error(error.message || t("errorUpdateWorkspace"));
        } else {
            toast.success(t("toastSaved"), { description: t("toastWorkspaceUpdated") });
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
            toast.error(error.message || t("errorUpdateProfile"));
        } else {
            toast.success(t("toastSaved"), { description: t("toastProfileUpdated") });
            router.refresh();
        }

        setIsSavingProfile(false);
    };

    const handleRefresh = () => {
        router.refresh();
    };

    const handleLanguageChange = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
    };

    return (
        <div className="h-full overflow-y-auto">
            <div className="p-6 max-w-5xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">{t("title")}</h1>
                    <p className="text-muted-foreground">
                        {t("subtitle")}
                    </p>
                </div>

                <Tabs defaultValue="account" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="account" className="gap-2">
                            <User className="h-4 w-4" />
                            {t("tabAccount")}
                        </TabsTrigger>
                        <TabsTrigger value="general" className="gap-2">
                            <Building2 className="h-4 w-4" />
                            {t("tabWorkspace")}
                        </TabsTrigger>
                        <TabsTrigger value="team" className="gap-2">
                            <Users className="h-4 w-4" />
                            {t("tabTeam")}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="account" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("profileSettingsTitle")}</CardTitle>
                                <CardDescription>
                                    {t("profileSettingsDescription")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">{t("labelFullName")}</Label>
                                    <Input
                                        id="fullName"
                                        value={userFullName}
                                        onChange={(e) => setUserFullName(e.target.value)}
                                        disabled={isSavingProfile}
                                        className="max-w-md"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="roleTitle">{t("labelRoleCalling")}</Label>
                                    <Input
                                        id="roleTitle"
                                        value={userRoleTitle}
                                        onChange={(e) => setUserRoleTitle(e.target.value)}
                                        disabled={isSavingProfile}
                                        placeholder={t("placeholderRoleTitle")}
                                        className="max-w-md"
                                    />
                                    <p className="text-xs text-muted-foreground">{t("hintRoleTitle")}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">{t("labelEmailAddress")}</Label>
                                    <Input
                                        id="email"
                                        value={currentUserDetails.email}
                                        disabled
                                        className="max-w-md bg-muted"
                                    />
                                    <p className="text-xs text-muted-foreground">{t("hintEmailCannotChange")}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="language">{t("labelLanguage")}</Label>
                                    <Select
                                        value={currentLocale}
                                        onValueChange={handleLanguageChange}
                                    >
                                        <SelectTrigger id="language" className="max-w-md">
                                            <SelectValue placeholder={t("labelLanguage")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">{t("languageEnglish")}</SelectItem>
                                            <SelectItem value="es">{t("languageSpanish")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {hasProfileChanges && (
                                    <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                                        {isSavingProfile ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4" />
                                        )}
                                        <span className="ml-2">{t("buttonSaveChanges")}</span>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                        <ChangePasswordForm email={currentUserDetails.email} />

                        {/* Danger Zone */}
                        <Card className="border-destructive/50">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    <CardTitle className="text-destructive">{t("dangerZoneTitle")}</CardTitle>
                                </div>
                                <CardDescription>
                                    {t("dangerZoneDescription")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                                    <div>
                                        <p className="font-medium">{t("deleteAccountTitle")}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {t("deleteAccountDescription")}
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
                                <CardTitle>{t("workspaceDetailsTitle")}</CardTitle>
                                <CardDescription>
                                    {isAdmin
                                        ? t("workspaceDetailsDescriptionAdmin")
                                        : t("workspaceDetailsDescriptionMember")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">{t("labelWorkspaceName")}</Label>
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
                                                <span className="ml-2">{t("buttonSave")}</span>
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 max-w-md">
                                    <div className="space-y-2">
                                        <Label>{t("labelWorkspaceType")}</Label>
                                        <Badge variant="secondary" className="text-sm">
                                            {workspaceTypeLabels[workspace.type] || workspace.type}
                                        </Badge>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("labelOrganization")}</Label>
                                        <Badge variant="outline" className="text-sm">
                                            {organizationTypeLabels[workspace.organization_type] || workspace.organization_type}
                                        </Badge>
                                    </div>
                                </div>

                                {!isAdmin && (
                                    <p className="text-sm text-muted-foreground mt-4">
                                        {t("contactAdminHint")}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="team" className="space-y-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>{t("teamMembersTitle")}</CardTitle>
                                    <CardDescription>
                                        {t("teamMembersCount", { count: members.length })}
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
                                    <CardTitle>{t("pendingInvitationsTitle")}</CardTitle>
                                    <CardDescription>
                                        {t("pendingInvitationsDescription")}
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
        </div>
    );
}
