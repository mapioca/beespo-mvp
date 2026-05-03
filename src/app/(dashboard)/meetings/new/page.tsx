"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, LayoutList, Loader2, PanelsTopLeft } from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { MeetingBuilder } from "@/components/meetings/builder";

type EntryType = "agenda" | "program" | "meeting";

const entryConfig: Record<EntryType, { title: string; description: string; icon: typeof CalendarDays }> = {
    agenda: {
        title: "Create agenda",
        description: "Start a discussion-first plan. It can remain standalone until you need to link it to something else.",
        icon: LayoutList,
    },
    program: {
        title: "Create program",
        description: "Start an audience-facing plan first and connect it later when publishing or sharing requires it.",
        icon: PanelsTopLeft,
    },
    meeting: {
        title: "Create meeting",
        description: "Start a meeting workspace now and attach event or plan details later if needed.",
        icon: CalendarDays,
    },
};

function MeetingBuilderContent() {
    const searchParams = useSearchParams();
    const templateIdFromUrl = searchParams?.get("templateId");
    const rawEntry = searchParams?.get("entry");
    const entry: EntryType =
        rawEntry === "program" || rawEntry === "meeting" || rawEntry === "agenda"
            ? rawEntry
            : "agenda";
    const config = entryConfig[entry];
    const Icon = config.icon;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <Breadcrumbs
                items={[
                    { label: "Meetings", href: "/meetings/overview" },
                    { label: "Create", href: "/meetings/create" },
                    { label: config.title },
                ]}
            />
            <div className="border-b border-border/60 px-4 py-4 sm:px-6">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">{config.title}</h1>
                        <p className="max-w-2xl text-sm text-muted-foreground">
                            {config.description}
                        </p>
                    </div>
                </div>
            </div>
            <div className="min-h-0 flex-1">
                <MeetingBuilder initialTemplateId={templateIdFromUrl} initialEntryType={entry} />
            </div>
        </div>
    );
}

export default function CreateMeetingPage() {
    return (
        <Suspense
            fallback={
                <div className="h-screen flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            }
        >
            <MeetingBuilderContent />
        </Suspense>
    );
}
