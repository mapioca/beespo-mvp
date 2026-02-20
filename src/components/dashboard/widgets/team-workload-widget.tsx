"use client";

import { Users, Plus, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TeamWorkloadData, DragHandleProps } from "@/types/dashboard";
import { WidgetCard } from "./widget-card";
import { useTranslations } from "next-intl";

interface Props {
  data: TeamWorkloadData;
  dragHandleProps?: DragHandleProps;
  isDragging?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

type LoadLevel = "good" | "busy" | "overburdened";

function getLoadLevel(tasks: number): LoadLevel {
  if (tasks >= 5) return "overburdened";
  if (tasks >= 3) return "busy";
  return "good";
}

export function TeamWorkloadWidget({
  data,
  dragHandleProps,
  isDragging,
}: Props) {
  const t = useTranslations("Dashboard.Widgets.teamWorkload");

  return (
    <WidgetCard
      title={t("title")}
      icon={<Users className="h-4 w-4 text-muted-foreground" />}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
      headerAction={
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      }
    >
      {data.members.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {t("empty")}
        </p>
      ) : (
        <div className="space-y-0.5">
          {data.members.map((member) => {
            const level = getLoadLevel(member.activeTasks);
            const filled = Math.min(member.activeTasks, 5);

            return (
              <div
                key={member.id}
                className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground truncate">
                      {member.name}
                    </p>
                    {level === "overburdened" && (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {formatRole(member.role)}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      level === "good" && "text-muted-foreground",
                      level === "busy" && "font-medium text-foreground",
                      level === "overburdened" && "font-medium text-amber-600"
                    )}
                  >
                    {t("activeCount", { count: member.activeTasks })}
                  </span>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-2 w-2 rounded-full",
                          i < filled
                            ? level === "good"
                              ? "bg-muted-foreground/30"
                              : level === "busy"
                                ? "bg-primary/60"
                                : "bg-amber-500"
                            : "bg-border"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetCard>
  );
}
