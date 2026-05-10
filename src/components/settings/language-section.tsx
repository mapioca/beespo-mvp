"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { updateLanguagePreference } from "@/lib/actions/profile-actions";
import { toast } from "@/lib/toast";

type LanguageSectionProps = {
    languagePreference: "ENG" | "SPA";
};

export function LanguageSection({ languagePreference }: LanguageSectionProps) {
    const router = useRouter();
    const [sacramentLanguage, setSacramentLanguage] = useState<"ENG" | "SPA">(languagePreference);
    const [isSavingLanguage, setIsSavingLanguage] = useState(false);

    const handleSacramentLanguageChange = async (value: "ENG" | "SPA") => {
        const previousValue = sacramentLanguage;
        setSacramentLanguage(value);
        setIsSavingLanguage(true);
        const result = await updateLanguagePreference(value);
        if (result.error) {
            toast.error("Failed to save language preference");
            setSacramentLanguage(previousValue);
        } else {
            router.refresh();
            toast.success("Saved", {
                description: "Meeting content language updated. Beespo interface text stays in English.",
            });
        }
        setIsSavingLanguage(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Language</h1>
                <p className="text-muted-foreground">
                    Set the language for meeting content shared with the congregation.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Language Preferences</CardTitle>
                    <CardDescription>
                        Beespo stays in English. Meeting content can use the ward language.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Meetings
                        </h3>
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <Label>Sacrament Meeting</Label>
                                <p className="text-sm text-muted-foreground">
                                    Sets the default language for hymns, generated agenda labels,
                                    public audience programs, and conducting scripts.
                                </p>
                            </div>
                            <Select
                                value={sacramentLanguage}
                                onValueChange={(value) =>
                                    handleSacramentLanguageChange(value as "ENG" | "SPA")
                                }
                                disabled={isSavingLanguage}
                            >
                                <SelectTrigger className="w-36 shrink-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ENG">English</SelectItem>
                                    <SelectItem value="SPA">Spanish</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
