"use client";

import { useTranslations } from "next-intl";
import { LinkedNotesList } from "@/components/notes/linked-notes-list";
import { MeetingActions } from "./meeting-actions";
import { CollapsibleDetails } from "./collapsible-details";
import { Database } from "@/types/database";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
  templates?: { name: string } | null;
  profiles?: { full_name: string } | null;
};
type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"] & {
  hymn?: { title: string; hymn_number: number } | null;
};

interface MeetingSidebarProps {
  meeting: Meeting;
  agendaItems: AgendaItem[];
  workspaceSlug: string | null;
  isLeader: boolean;
  totalDuration: number;
}

export function MeetingSidebar({
  meeting,
  agendaItems,
  workspaceSlug,
  isLeader,
  totalDuration,
}: MeetingSidebarProps) {
  const t = useTranslations("Dashboard.Meetings.sidebar");

  return (
    <div className="space-y-6">
      {/* Action Buttons - Top of sidebar, most prominent */}
      <div className="bg-card border rounded-lg p-4">
        <MeetingActions
          meeting={meeting}
          agendaItems={agendaItems}
          workspaceSlug={workspaceSlug}
          isLeader={isLeader}
        />
      </div>

      {/* Description Section */}
      {meeting.description && (
        <div className="bg-card border rounded-lg p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t("description")}
          </h3>
          <p className="text-sm text-foreground leading-relaxed">
            {meeting.description}
          </p>
        </div>
      )}

      {/* Collapsible Details */}
      <div className="bg-card border rounded-lg p-4">
        <CollapsibleDetails
          templateName={meeting.templates?.name}
          createdByName={meeting.profiles?.full_name}
          meetingId={meeting.id}
          scheduledDate={meeting.scheduled_date}
          totalDuration={totalDuration}
          defaultOpen={true}
        />
      </div>

      {/* Linked Notes */}
      <LinkedNotesList entityId={meeting.id} entityType="meeting" />
    </div>
  );
}
