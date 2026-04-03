"use client";

import { FavoriteButton } from "@/components/navigation/favorite-button";

interface MeetingFavoriteButtonProps {
  meetingId: string;
  meetingTitle: string;
}

export function MeetingFavoriteButton({
  meetingId,
  meetingTitle,
}: MeetingFavoriteButtonProps) {
  return (
    <FavoriteButton
      item={{
        id: meetingId,
        entityType: "meeting",
        title: meetingTitle,
        href: `/meetings/${meetingId}`,
      }}
      variant="outline"
      size="icon"
      className="border-border/60"
      iconClassName="h-4 w-4"
      activeClassName="border-amber-300"
    />
  );
}
