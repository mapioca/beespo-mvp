"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useFavoritesStore } from "@/stores/favorites-store";

interface MeetingFavoriteButtonProps {
  meetingId: string;
  meetingTitle: string;
}

export function MeetingFavoriteButton({
  meetingId,
  meetingTitle,
}: MeetingFavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const favorited = isFavorite(meetingId, "meeting");

  return (
    <Button
      variant="outline"
      size="icon"
      title={favorited ? "Remove from favorites" : "Add to favorites"}
      onClick={() =>
        toggleFavorite({
          id: meetingId,
          type: "meeting",
          title: meetingTitle,
          href: `/meetings/${meetingId}`,
        })
      }
      className={cn(favorited && "border-amber-300")}
    >
      <Star
        className={cn(
          "h-4 w-4 transition-colors",
          favorited ? "fill-amber-400 text-amber-400" : ""
        )}
      />
    </Button>
  );
}
