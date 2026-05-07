"use client";

import { useRouter } from "next/navigation";

import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { PendingInvitations } from "@/components/team/pending-invitations";
import { TeamMembersList } from "@/components/team/team-members-list";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { canManage } from "@/lib/auth/role-permissions";
import type { UserRole } from "@/types/database";

type TeamMember = {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    created_at: string;
};

type Invitation = {
    id: string;
    email: string;
    role: string;
    expires_at: string;
    created_at: string;
    invited_by: {
        full_name: string;
    } | null;
};

type TeamSectionProps = {
    members: TeamMember[];
    invitations: Invitation[];
    currentUserId: string;
    currentUserRole: string;
};

export function TeamSection({
    members,
    invitations,
    currentUserId,
    currentUserRole,
}: TeamSectionProps) {
    const router = useRouter();
    const isAdmin = canManage(currentUserRole);

    const handleRefresh = () => {
        router.refresh();
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Team</h1>
                <p className="text-muted-foreground">
                    Manage workspace members, roles, and invitations.
                </p>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Team Members</CardTitle>
                        <CardDescription>
                            {members.length} member{members.length !== 1 ? "s" : ""} in this workspace
                        </CardDescription>
                    </div>
                    {isAdmin ? <InviteMemberDialog onInviteSent={handleRefresh} /> : null}
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

            {isAdmin || invitations.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Invitations</CardTitle>
                        <CardDescription>
                            Invitations that haven&apos;t been accepted yet.
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
            ) : null}
        </div>
    );
}
