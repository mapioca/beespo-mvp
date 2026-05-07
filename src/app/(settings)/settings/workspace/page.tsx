import { WorkspaceSection } from "@/components/settings/workspace-section";

import { getSettingsRequestContext } from "../../settings-data";

export default async function WorkspaceSettingsPage() {
    const { profile, workspace } = await getSettingsRequestContext();

    return <WorkspaceSection workspace={workspace} currentUserRole={profile.role} />;
}
