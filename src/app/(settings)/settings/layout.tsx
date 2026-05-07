import { SettingsShell } from "@/components/settings/settings-shell";

import { getSettingsRequestContext } from "../settings-data";

export default async function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { workspace } = await getSettingsRequestContext();

    return <SettingsShell workspaceName={workspace.name}>{children}</SettingsShell>;
}
