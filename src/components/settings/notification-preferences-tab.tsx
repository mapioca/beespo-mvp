"use client"

import { useState, useEffect } from "react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from "@/lib/toast"
import {
    getNotificationPreferences,
    upsertNotificationPreference,
} from "@/lib/actions/notification-actions"
import { NOTIFICATION_TYPES } from "@/lib/notifications/constants"
import type { NotificationPreference } from "@/lib/notifications/types"
import type { NotificationType, NotificationEmailFrequency } from "@/types/database"

export function NotificationPreferencesTab() {
    const [preferences, setPreferences] = useState<NotificationPreference[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)

    useEffect(() => {
        getNotificationPreferences().then((prefs) => {
            setPreferences(prefs)
            setLoading(false)
        })
    }, [])

    const getPref = (type: string): {
        inAppEnabled: boolean
        emailEnabled: boolean
        emailFrequency: NotificationEmailFrequency
    } => {
        const pref = preferences.find((p) => p.notification_type === type)
        return {
            inAppEnabled: pref?.in_app_enabled ?? true,
            emailEnabled: pref?.email_enabled ?? true,
            emailFrequency: pref?.email_frequency ?? "immediate",
        }
    }

    const handleUpdate = async (
        type: NotificationType,
        field: "inAppEnabled" | "emailEnabled" | "emailFrequency",
        value: boolean | string
    ) => {
        const current = getPref(type)
        const updated = { ...current, [field]: value }

        // Optimistic update
        setPreferences((prev) => {
            const idx = prev.findIndex((p) => p.notification_type === type)
            const newPref: NotificationPreference = {
                id: prev[idx]?.id ?? "",
                user_id: prev[idx]?.user_id ?? "",
                notification_type: type,
                in_app_enabled: updated.inAppEnabled,
                email_enabled: updated.emailEnabled,
                email_frequency: updated.emailFrequency,
            }
            if (idx >= 0) {
                const next = [...prev]
                next[idx] = newPref
                return next
            }
            return [...prev, newPref]
        })

        setSaving(type)
        const result = await upsertNotificationPreference({
            notificationType: type,
            inAppEnabled: updated.inAppEnabled,
            emailEnabled: updated.emailEnabled,
            emailFrequency: updated.emailFrequency,
        })

        if (result.error) {
            toast.error("Failed to save preference")
            // Revert
            const prefs = await getNotificationPreferences()
            setPreferences(prefs)
        }
        setSaving(null)
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                    Choose what notifications you receive and how you receive them
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {NOTIFICATION_TYPES.map(({ type, label, description, supportsDigest }) => {
                        const pref = getPref(type)
                        const isSaving = saving === type

                        return (
                            <div
                                key={type}
                                className="flex flex-col gap-3 rounded-lg border p-4"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium">{label}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {description}
                                        </p>
                                    </div>
                                    {isSaving && (
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {/* In-app toggle */}
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            id={`${type}-in-app`}
                                            checked={pref.inAppEnabled}
                                            onCheckedChange={(checked) =>
                                                handleUpdate(type, "inAppEnabled", checked)
                                            }
                                        />
                                        <Label
                                            htmlFor={`${type}-in-app`}
                                            className="text-sm font-normal cursor-pointer"
                                        >
                                            In-app
                                        </Label>
                                    </div>

                                    {/* Email toggle */}
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            id={`${type}-email`}
                                            checked={pref.emailEnabled}
                                            onCheckedChange={(checked) =>
                                                handleUpdate(type, "emailEnabled", checked)
                                            }
                                        />
                                        <Label
                                            htmlFor={`${type}-email`}
                                            className="text-sm font-normal cursor-pointer"
                                        >
                                            Email
                                        </Label>
                                    </div>

                                    {/* Frequency selector (only for types that support digest, and when email is enabled) */}
                                    {pref.emailEnabled && supportsDigest && (
                                        <div className="flex items-center gap-2">
                                            <Select
                                                value={pref.emailFrequency}
                                                onValueChange={(value) =>
                                                    handleUpdate(
                                                        type,
                                                        "emailFrequency",
                                                        value
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="h-8 text-xs w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="immediate">
                                                        Immediate
                                                    </SelectItem>
                                                    <SelectItem value="daily_digest">
                                                        Daily digest
                                                    </SelectItem>
                                                    <SelectItem value="weekly_digest">
                                                        Weekly digest
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
