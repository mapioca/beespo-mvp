import { redirect } from "next/navigation";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const legacyTabRedirects: Record<string, string> = {
    account: "/settings/account",
    general: "/settings/workspace",
    workspace: "/settings/workspace",
    team: "/settings/team",
    "sharing-groups": "/settings/sharing-groups",
    audience: "/settings/audience",
    notifications: "/settings/notifications",
    language: "/settings/language",
};

export default async function SettingsLandingPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string | string[] }>;
}) {
    const params = await searchParams;
    const rawTab = params.tab;
    const tab = Array.isArray(rawTab) ? rawTab[0] : rawTab;

    if (tab) {
        const destination = legacyTabRedirects[tab];
        if (destination) {
            redirect(destination);
        }
    }

    return (
        <div className="hidden h-full lg:block">
            <div className="mx-auto flex h-full w-full max-w-3xl items-center px-6 py-8">
                <Card className="w-full border-dashed">
                    <CardHeader>
                        <CardTitle>Select a section</CardTitle>
                        <CardDescription>
                            Choose a settings section from the sidebar to view or edit it.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Settings pages now have dedicated URLs for easier linking and navigation.
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
