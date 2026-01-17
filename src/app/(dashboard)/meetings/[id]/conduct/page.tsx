"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database";
import { ArrowLeft, StopCircle, Printer } from "lucide-react";
import { ViewToggle } from "@/components/conduct/view-toggle";
import { ConductorView } from "@/components/conduct/conductor-view";
import { ScribeView } from "@/components/conduct/scribe-view";
import { CompactGlobalTimer } from "@/components/conduct/global-timer";
import { ShareDialog } from "@/components/conduct/share-dialog";
import { PrintView } from "@/components/conduct/print-view";
import { useConductMeetingStore } from "@/stores/conduct-meeting-store";
import { useGlobalTimer } from "@/hooks/use-timer";
import { notesService } from "@/lib/conduct/notes-service";
import "./print.css";

type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"];
type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface ConductMeetingProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ConductMeetingPage({ params }: ConductMeetingProps) {
  const { id } = use(params);
  const router = useRouter();

  const [items, setItems] = useState<AgendaItem[]>([]);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const {
    viewMode,
    setMeetingId,
    setActiveItem,
    startGlobalTimer,
  } = useConductMeetingStore();

  // Initialize global timer hook
  useGlobalTimer();

  // Load initial data
  useEffect(() => {
    const fetchMeeting = async () => {
      setIsLoading(true);
      const supabase = createClient();

      // Fetch meeting with workspace
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: m } = await (supabase.from("meetings") as any)
        .select(`
          *,
          workspaces!inner(slug)
        `)
        .eq("id", id)
        .single();

      // Fetch agenda items
      const { data: i } = await supabase
        .from("agenda_items")
        .select("*")
        .eq("meeting_id", id)
        .order("order_index");

      if (m && i) {
        setMeeting(m as Meeting);
        setItems(i as AgendaItem[]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setWorkspaceSlug((m.workspaces as any)?.slug || null);

        // Initialize store
        setMeetingId(id);

        // Find first incomplete item
        const agendaItems = i as AgendaItem[];
        const firstIncomplete = agendaItems.findIndex(
          (item) => !item.is_completed
        );
        if (firstIncomplete !== -1) {
          setActiveItem(agendaItems[firstIncomplete].id, firstIncomplete);
        } else if (agendaItems.length > 0) {
          setActiveItem(agendaItems[0].id, 0);
        }

        // Auto-start global timer
        startGlobalTimer();
      }

      setIsLoading(false);
    };

    fetchMeeting();
  }, [id, setMeetingId, setActiveItem, startGlobalTimer]);

  // Real-time subscription for remote updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`meeting-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agenda_items",
          filter: `meeting_id=eq.${id}`,
        },
        (payload) => {
          setItems((prev) =>
            prev.map((item) =>
              item.id === payload.new.id ? (payload.new as AgendaItem) : item
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Handle item completion
  const handleItemComplete = useCallback(
    async (item: AgendaItem, newStatus: boolean) => {
      // Optimistic update
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_completed: newStatus } : i
        )
      );

      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("agenda_items") as any)
        .update({ is_completed: newStatus })
        .eq("id", item.id);
    },
    []
  );

  // Handle meeting update (from share dialog)
  const handleMeetingUpdate = useCallback((updatedMeeting: Meeting) => {
    setMeeting(updatedMeeting);
  }, []);

  // Handle end meeting
  const handleEndMeeting = async () => {
    // Flush any pending notes
    await notesService.flushAll();

    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("meetings") as any)
      .update({ status: "completed" })
      .eq("id", id);

    router.push(`/meetings/${id}`);
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle exit
  const handleExit = async () => {
    // Flush any pending notes before exiting
    await notesService.flushAll();
    router.push(`/meetings/${id}`);
  };

  if (isLoading || !meeting) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-muted-foreground">Loading conductor...</div>
      </div>
    );
  }

  return (
    <div className="conduct-page h-[calc(100vh-4rem)] flex flex-col bg-background">
      {/* Top Bar */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-card no-print">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleExit}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Exit
          </Button>
          <div>
            <h1 className="font-semibold">{meeting.title}</h1>
            <CompactGlobalTimer meetingId={id} />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ViewToggle />

          <div className="flex items-center gap-2">
            <ShareDialog
              meeting={meeting}
              workspaceSlug={workspaceSlug}
              onUpdate={handleMeetingUpdate}
            />

            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive hover:bg-destructive/10"
              onClick={handleEndMeeting}
            >
              <StopCircle className="mr-2 h-4 w-4" />
              End Meeting
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - switches between Conductor and Scribe views */}
      {viewMode === "conductor" ? (
        <ConductorView
          meeting={meeting}
          items={items}
          onItemComplete={handleItemComplete}
        />
      ) : (
        <ScribeView
          meeting={meeting}
          items={items}
          onItemComplete={handleItemComplete}
        />
      )}

      {/* Print View - hidden on screen, visible when printing */}
      <PrintView meeting={meeting} items={items} />
    </div>
  );
}
