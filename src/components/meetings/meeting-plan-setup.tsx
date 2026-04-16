"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LayoutList, Loader2, PanelsTopLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";

type PlanType = "agenda" | "program";

interface MeetingPlanSetupProps {
  meetingId: string;
  meetingTitle: string;
  currentPlanType?: PlanType | null;
  setupFeedback?: {
    created?: string;
    announcement?: boolean;
    templates?: number;
  };
}

const PLAN_CHOICES: Array<{
  type: PlanType;
  title: string;
  description: string;
  supportText: string;
  icon: typeof LayoutList;
}> = [
  {
    type: "agenda",
    title: "Agenda",
    description: "Best for collaborative planning, assignments, and discussion-first preparation.",
    supportText: "Choose Agenda when your team needs to co-plan the flow before publish day.",
    icon: LayoutList,
  },
  {
    type: "program",
    title: "Program",
    description: "Best for a polished, audience-facing order of service with display-ready formatting.",
    supportText: "Choose Program when presentation and distribution are the primary goals.",
    icon: PanelsTopLeft,
  },
];

export function MeetingPlanSetup({
  meetingId,
  meetingTitle,
  currentPlanType = null,
  setupFeedback,
}: MeetingPlanSetupProps) {
  const router = useRouter();
  const [expandedType, setExpandedType] = useState<PlanType | null>(null);
  const [planName, setPlanName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const didShowFeedbackToast = useRef(false);

  useEffect(() => {
    if (didShowFeedbackToast.current) return;
    if (!setupFeedback?.created) return;

    const summary =
      setupFeedback.created === "event"
        ? "Event and meeting workspace created."
        : "Meeting workspace ready.";

    const details: string[] = ["Choose Agenda or Program to continue."];
    if (setupFeedback.announcement) {
      details.unshift("Announcement enabled for this event.");
    }
    if ((setupFeedback.templates ?? 0) > 0) {
      const count = setupFeedback.templates ?? 0;
      details.push(`Template linkage selected: ${count}.`);
    }

    toast.success(summary, {
      id: `meeting-setup-${meetingId}`,
      description: details.join(" "),
    });
    didShowFeedbackToast.current = true;
  }, [meetingId, setupFeedback]);

  const handleExpand = (type: PlanType) => {
    setExpandedType(type);
    setPlanName(`${meetingTitle} ${type === "agenda" ? "Agenda" : "Program"}`);
  };

  const handleCollapse = () => {
    setExpandedType(null);
    setPlanName("");
  };

  const handleCreate = async () => {
    if (!expandedType || !planName.trim()) return;

    setIsCreating(true);
    try {
      if (currentPlanType === expandedType) {
        const mode = expandedType === "program" ? "program" : "planning";
        router.replace(`/meetings/${meetingId}?mode=${mode}`);
        return;
      }

      const payload = {
        type: expandedType,
        title: planName.trim(),
      };

      const response = await fetch(`/api/meetings/${meetingId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create plan");
      }

      const mode = expandedType === "program" ? "program" : "planning";
      router.replace(`/meetings/${meetingId}?mode=${mode}`);
    } catch (error) {
      setIsCreating(false);
      toast.error(error instanceof Error ? error.message : "Failed to create plan.");
    }
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a plan for this meeting</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {meetingTitle} is ready. Pick the plan type that matches how your team will run this meeting.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {PLAN_CHOICES.map((option) => {
          const Icon = option.icon;
          const isExpanded = expandedType === option.type;
          const isOtherExpanded = expandedType !== null && !isExpanded;

          return (
            <Card
              key={option.type}
              className="border-border/70 transition-colors hover:border-primary/40 hover:bg-accent/30"
            >
              <CardHeader className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-lg">{option.title}</CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{option.supportText}</p>
                
                {isExpanded ? (
                  <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <label htmlFor={`name-${option.type}`} className="text-sm font-medium">
                        Name
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCollapse}
                        disabled={isCreating}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      id={`name-${option.type}`}
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      disabled={isCreating}
                      placeholder={`${meetingTitle} ${option.title}`}
                      className="bg-background"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && planName.trim()) {
                          void handleCreate();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => void handleCreate()}
                      disabled={isCreating || !planName.trim()}
                      className="w-full"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating
                        </>
                      ) : (
                        "Create"
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => handleExpand(option.type)}
                    disabled={isOtherExpanded}
                    className="w-full justify-center gap-2"
                  >
                    New {option.title}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>

    </div>
  );
}
