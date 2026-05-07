"use client";

import { useState } from "react";

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
            toast.success("Saved", { description: "Language preference updated." });
        }
        setIsSavingLanguage(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Language</h1>
                <p className="text-muted-foreground">
                    Set the preferred language for parts of the app.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Language Preferences</CardTitle>
                    <CardDescription>
                        Set the preferred language for different parts of the app.
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
                                    Sets the default language for hymns and agenda items in the
                                    sacrament meeting planner.
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
