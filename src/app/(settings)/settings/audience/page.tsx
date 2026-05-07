import { AudienceLinkTab } from "@/components/settings/audience-link-tab";
import { canEdit } from "@/lib/auth/role-permissions";

import {
    getAudienceLinkToken,
    getSettingsRequestContext,
} from "../../settings-data";

export default async function AudienceSettingsPage() {
    const { profile, workspace } = await getSettingsRequestContext();
    const audienceLinkToken = await getAudienceLinkToken(profile.workspace_id);

    return (
        <AudienceLinkTab
            workspaceSlug={workspace.slug}
            workspaceName={workspace.name}
            initialToken={audienceLinkToken}
            canManage={canEdit(profile.role)}
        />
    );
}
