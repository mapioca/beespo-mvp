import { getSettingsRequestContext } from "./settings-data";

export default async function SettingsGroupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await getSettingsRequestContext();

    return children;
}
