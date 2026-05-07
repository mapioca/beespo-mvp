import { SharingGroupsTab } from "@/components/settings/sharing-groups-tab";
import { canEdit } from "@/lib/auth/role-permissions";

import {
    getSettingsRequestContext,
    getSharingGroupsSectionData,
} from "../../settings-data";

export default async function SharingGroupsSettingsPage() {
    const { profile } = await getSettingsRequestContext();
    const { sharingGroups, workspaceMembers } = await getSharingGroupsSectionData(profile.workspace_id);

    return (
        <SharingGroupsTab
            sharingGroups={sharingGroups}
            workspaceMembers={workspaceMembers}
            canManage={canEdit(profile.role)}
        />
    );
}
