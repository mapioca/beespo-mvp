"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { ChevronRight, GripVertical, Plus } from "lucide-react";
import { ReplicaShowcase } from "./replica/replica-showcase";
import { ReplicaShell } from "./replica/replica-shell";
import { AnimatedCursor, type CursorKeyframe } from "./animated-cursor";
import { useSectionInView } from "./use-section-in-view";

type Speaker = {
  id: string;
  name: string;
  topic: string;
  duration: number;
};

const initialSpeakers: Speaker[] = [
  { id: "s1", name: "Brother David Holt", topic: "Hope in Christ", duration: 8 },
  { id: "s2", name: "Sister Mei Park", topic: "Following the Spirit", duration: 12 },
  { id: "s3", name: "Brother Caleb Reyes", topic: "The Gathering of Israel", duration: 10 },
];

const swappedSpeakers: Speaker[] = [
  initialSpeakers[1],
  initialSpeakers[0],
  initialSpeakers[2],
];

const cursorFrames: CursorKeyframe[] = [
  { x: 320, y: 460, hold: 800 },
  { x: 308, y: 412, hold: 250 },
  { x: 308, y: 412, click: true, hold: 400 },
  { x: 308, y: 472, hold: 1500 },
  { x: 360, y: 540, hold: 1200 },
];

export function FeaturePlannerDemo() {
  const { ref, inView } = useSectionInView<HTMLDivElement>(0.25);
  const [speakers, setSpeakers] = useState(initialSpeakers);

  useEffect(() => {
    if (!inView) {
      setSpeakers(initialSpeakers);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const tick = () => {
      timers.push(setTimeout(() => setSpeakers(swappedSpeakers), 2400));
      timers.push(setTimeout(() => setSpeakers(initialSpeakers), 5800));
    };
    tick();
    const loop = setInterval(tick, 7000);
    return () => {
      clearInterval(loop);
      timers.forEach(clearTimeout);
    };
  }, [inView]);

  return (
    <ReplicaShowcase
      id="feature-planner"
      eyebrow="Program Planner"
      title={<>Build the program. Drag where it needs to go.</>}
      description="A drag-and-drop agenda for sacrament meeting. Swap speakers, reorder hymns, change a prayer assignment — the printable program updates with you."
      bullets={[
        "Sortable agenda",
        "Auto-calculated runtime",
        "Print-ready in one click",
      ]}
    >
      <div ref={ref} className="relative">
        <ReplicaShell active="planner" breadcrumb="Sacrament · Planner">
          <div className="h-full overflow-hidden">
            <div className="mx-auto h-full max-w-3xl px-8 py-10">
              <div className="text-[10.5px] font-medium uppercase tracking-[0.05em]"
                style={{ color: "hsl(var(--landing-demo-subtle))" }}
              >
                Sunday, May 4 · 11:00 AM
              </div>
              <h1
                className="mt-2 font-serif text-4xl font-normal leading-[1.05] tracking-[-0.01em]"
                style={{ color: "hsl(var(--landing-demo-text))" }}
              >
                Sacrament <em className="italic">meeting</em>
              </h1>
              <div
                className="mt-1 font-serif text-[14px] italic"
                style={{ color: "hsl(var(--landing-demo-subtle))" }}
              >
                Conducting · Bishop Reeves
              </div>

              <div className="mt-7 space-y-2">
                <PlannerRow
                  type="Opening hymn"
                  primary={<><span className="mr-1.5 font-serif text-[13px] italic" style={{ color: "hsl(var(--landing-demo-accent))" }}>№ 85</span><span className="font-serif text-[15.5px]" style={{ color: "hsl(var(--landing-demo-text))" }}>How Firm a Foundation</span></>}
                />
                <PlannerRow
                  type="Invocation"
                  primary={<span className="font-serif text-[15.5px]" style={{ color: "hsl(var(--landing-demo-text))" }}>Sister Reyes</span>}
                />
                <PlannerRow
                  type="Business"
                  primary={<span className="font-serif text-[15.5px]" style={{ color: "hsl(var(--landing-demo-text))" }}>1 sustaining · 1 release</span>}
                />
                <PlannerRow
                  type="Sacrament hymn"
                  primary={<><span className="mr-1.5 font-serif text-[13px] italic" style={{ color: "hsl(var(--landing-demo-accent))" }}>№ 169</span><span className="font-serif text-[15.5px]" style={{ color: "hsl(var(--landing-demo-text))" }}>As Now We Take the Sacrament</span></>}
                />
              </div>

              <div className="mt-6">
                <div
                  className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.05em]"
                  style={{ color: "hsl(var(--landing-demo-subtle))" }}
                >
                  Speakers
                </div>
                <ul className="space-y-1.5">
                  <AnimatePresence initial={false}>
                    {speakers.map((s) => (
                      <motion.li
                        key={s.id}
                        layout
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        className="grid grid-cols-[24px_1fr_auto] items-center gap-3 rounded-xl border px-3 py-3"
                        style={{
                          borderColor: "hsl(var(--landing-demo-border))",
                          background: "hsl(var(--landing-demo-surface))",
                        }}
                      >
                        <GripVertical
                          className="h-4 w-4"
                          style={{ color: "hsl(var(--landing-demo-subtle))" }}
                        />
                        <div className="min-w-0">
                          <div
                            className="truncate font-serif text-[15.5px]"
                            style={{ color: "hsl(var(--landing-demo-text))" }}
                          >
                            {s.name}
                          </div>
                          <div
                            className="truncate font-serif text-[13px] italic"
                            style={{ color: "hsl(var(--landing-demo-subtle))" }}
                          >
                            {s.topic}
                          </div>
                        </div>
                        <div
                          className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums"
                          style={{
                            borderColor: "hsl(var(--landing-demo-border))",
                            color: "hsl(var(--landing-demo-muted))",
                          }}
                        >
                          {s.duration} min
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                  <button
                    type="button"
                    tabIndex={-1}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-[13px]"
                    style={{
                      borderColor: "hsl(var(--landing-demo-border))",
                      color: "hsl(var(--landing-demo-subtle))",
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add speaker
                  </button>
                </ul>
              </div>

              <div className="mt-6 space-y-2">
                <PlannerRow
                  type="Closing hymn"
                  primary={<><span className="mr-1.5 font-serif text-[13px] italic" style={{ color: "hsl(var(--landing-demo-accent))" }}>№ 152</span><span className="font-serif text-[15.5px]" style={{ color: "hsl(var(--landing-demo-text))" }}>God Be with You Till We Meet Again</span></>}
                />
                <PlannerRow
                  type="Benediction"
                  primary={<span className="font-serif text-[15.5px] italic" style={{ color: "hsl(var(--landing-demo-subtle))" }}>Assign someone</span>}
                />
              </div>
            </div>
          </div>
          <AnimatedCursor active={inView} keyframes={cursorFrames} label="drag" />
        </ReplicaShell>
      </div>
    </ReplicaShowcase>
  );
}

function PlannerRow({
  type,
  primary,
}: {
  type: string;
  primary: React.ReactNode;
}) {
  return (
    <div
      className="grid w-full grid-cols-[100px_1fr_auto] items-center gap-3.5 rounded-xl border px-3.5 py-3 text-left"
      style={{
        borderColor: "hsl(var(--landing-demo-border))",
        background: "hsl(var(--landing-demo-surface))",
      }}
    >
      <div
        className="text-[10.5px] font-medium uppercase tracking-[0.05em]"
        style={{ color: "hsl(var(--landing-demo-subtle))" }}
      >
        {type}
      </div>
      <div className="min-w-0">{primary}</div>
      <ChevronRight
        className="h-4 w-4"
        style={{ color: "hsl(var(--landing-demo-subtle))" }}
      />
    </div>
  );
}
