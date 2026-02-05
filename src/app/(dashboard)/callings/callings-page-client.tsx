"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CallingsPipeline } from "@/components/callings/callings-pipeline";
import { getActiveProcesses } from "@/lib/actions/calling-actions";
import type { CallingProcessStage } from "@/types/database";

interface Process {
    id: string;
    current_stage: CallingProcessStage;
    status: "active" | "completed" | "dropped";
    created_at: string;
    updated_at: string;
    candidate: { id: string; name: string } | null;
    calling: {
        id: string;
        title: string;
        organization: string | null;
    } | null;
}

interface CallingsPageClientProps {
    initialProcesses: Process[];
    teamMembers: { id: string; full_name: string }[];
}

export function CallingsPageClient({
    initialProcesses,
    teamMembers,
}: CallingsPageClientProps) {
    const [processes, setProcesses] = useState<Process[]>(initialProcesses);
    const router = useRouter();

    const handleRefresh = useCallback(async () => {
        // Refresh the data
        const result = await getActiveProcesses();
        if (result.success && result.processes) {
            setProcesses(result.processes as Process[]);
        }
        // Also trigger server revalidation
        router.refresh();
    }, [router]);

    return (
        <CallingsPipeline
            processes={processes}
            onRefresh={handleRefresh}
            teamMembers={teamMembers}
        />
    );
}
