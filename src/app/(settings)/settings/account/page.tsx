import { AccountSection } from "@/components/settings/account-section";

import { getSettingsRequestContext } from "../../settings-data";

export default async function AccountSettingsPage() {
    const { user, profile, workspace } = await getSettingsRequestContext();

    return (
        <AccountSection
            currentUserId={user.id}
            currentUserDetails={{
                fullName: profile.full_name,
                email: user.email || "",
                roleTitle: profile.role_title || "",
            }}
            workspaceMfaRequired={workspace.mfa_required}
        />
    );
}
