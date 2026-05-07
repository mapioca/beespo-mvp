import { LanguageSection } from "@/components/settings/language-section";

import { getSettingsRequestContext } from "../../settings-data";

export default async function LanguageSettingsPage() {
    const { profile } = await getSettingsRequestContext();

    return <LanguageSection languagePreference={profile.language_preference ?? "ENG"} />;
}
