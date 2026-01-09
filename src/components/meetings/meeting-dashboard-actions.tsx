"use client";

import { Button } from "@/components/ui/button";
import { Play, Edit, StopCircle, Printer } from "lucide-react";
import Link from "next/link";
import { Database } from "@/types/database";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks/use-toast";

type Meeting = Database['public']['Tables']['meetings']['Row'];

interface MeetingDashboardActionsProps {
    meeting: Meeting;
    isLeader: boolean;
}

export function MeetingDashboardActions({ meeting, isLeader }: MeetingDashboardActionsProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    if (!isLeader) return null;

    const handleStatusChange = async (newStatus: Meeting['status']) => {
        setIsLoading(true);
        const supabase = createClient();
        const { error } = await supabase
            .from('meetings')
            .update({ status: newStatus })
            .eq('id', meeting.id);

        if (error) {
            toast({
                title: "Error",
                description: "Failed to update meeting status",
                variant: "destructive"
            });
        } else {
            router.refresh();
            toast({
                title: "Status updated",
                description: `Meeting marked as ${newStatus}`
            });
        }
        setIsLoading(false);
    };

    return (
        <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Print
            </Button>

            {meeting.status === 'scheduled' && (
                <>
                    <Button asChild variant="outline" size="sm">
                        <Link href={`/meetings/${meeting.id}/edit`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Agenda
                        </Link>
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusChange('in_progress')} disabled={isLoading}>
                        <Play className="w-4 h-4 mr-2" />
                        Start Meeting
                    </Button>
                </>
            )}

            {meeting.status === 'in_progress' && (
                <>
                    <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Link href={`/meetings/${meeting.id}/conduct`}>
                            <Play className="w-4 h-4 mr-2" />
                            Conduct
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange('completed')} disabled={isLoading}>
                        <StopCircle className="w-4 h-4 mr-2" />
                        End Meeting
                    </Button>
                </>
            )}

            {meeting.status === 'completed' && (
                <Button variant="outline" size="sm" onClick={() => handleStatusChange('scheduled')} disabled={isLoading}>
                    Reopen
                </Button>
            )}
        </div>
    );
}
