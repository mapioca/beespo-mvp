"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { toggleFavorite } from "@/lib/actions/navigation-actions";
import { useNavigationStore } from "@/stores/navigation-store";
import type { NavigationItemInput } from "@/lib/navigation/types";

interface FavoriteButtonProps {
  item: NavigationItemInput;
  variant?: "ghost" | "outline";
  size?: "icon" | "sm";
  className?: string;
  iconClassName?: string;
  activeClassName?: string;
}

export function FavoriteButton({
  item,
  variant = "ghost",
  size = "icon",
  className,
  iconClassName,
  activeClassName,
}: FavoriteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticFavorite, setOptimisticFavorite] = useState<boolean | null>(null);
  const isFavorite = useNavigationStore((state) => state.isFavorite(item.entityType, item.id));
  const applyFavoriteToggle = useNavigationStore((state) => state.applyFavoriteToggle);

  const favorited = optimisticFavorite ?? isFavorite;

  const handleToggle = () => {
    const nextFavorited = !favorited;
    setOptimisticFavorite(nextFavorited);
    applyFavoriteToggle(
      {
        id: item.id,
        entityType: item.entityType,
        title: item.title || "Untitled",
        href: item.href || "#",
        icon: item.entityType,
        parentTitle: item.parentTitle || null,
      },
      nextFavorited
    );

    startTransition(async () => {
      const result = await toggleFavorite(item);

      if ("error" in result) {
        applyFavoriteToggle(
          {
            id: item.id,
            entityType: item.entityType,
            title: item.title || "Untitled",
            href: item.href || "#",
            icon: item.entityType,
            parentTitle: item.parentTitle || null,
          },
          favorited
        );
        setOptimisticFavorite(null);
        toast.error(result.error);
        return;
      }

      applyFavoriteToggle(result.item, result.favorited);
      setOptimisticFavorite(null);
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      type="button"
      title={favorited ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={favorited}
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        favorited && activeClassName,
        className
      )}
    >
      <Star
        className={cn(
          "transition-colors",
          favorited ? "fill-amber-400 text-amber-400" : "",
          iconClassName
        )}
      />
    </Button>
  );
}
