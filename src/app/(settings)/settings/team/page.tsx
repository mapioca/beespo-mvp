import { TeamSection } from "@/components/settings/team-section";

import { getSettingsRequestContext, getTeamSectionData } from "../../settings-data";

export default async function TeamSettingsPage() {
    const { user, profile } = await getSettingsRequestContext();
    const { members, invitations } = await getTeamSectionData(profile.workspace_id);

    return (
        <TeamSection
            members={members}
            invitations={invitations}
            currentUserId={user.id}
            currentUserRole={profile.role}
        />
    );
}
