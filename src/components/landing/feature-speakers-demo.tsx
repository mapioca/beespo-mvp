"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Check, ChevronDown, Clock, Plus, Search } from "lucide-react";
import { ReplicaShowcase } from "./replica/replica-showcase";
import { ReplicaShell } from "./replica/replica-shell";
import { AnimatedCursor, type CursorKeyframe } from "./animated-cursor";
import { useSectionInView } from "./use-section-in-view";

type Speaker = {
  id: string;
  name: string;
  topic: string;
  date: string;
  confirmed: boolean;
};

const initial: Speaker[] = [
  { id: "1", name: "Brother David Holt", topic: "Hope in Christ", date: "May 4", confirmed: true },
  { id: "2", name: "Sister Mei Park", topic: "Following the Spirit", date: "May 4", confirmed: false },
  { id: "3", name: "Brother Caleb Reyes", topic: "The Gathering of Israel", date: "May 11", confirmed: false },
  { id: "4", name: "Sister Naomi Vega", topic: "Charity Never Faileth", date: "May 11", confirmed: true },
  { id: "5", name: "Brother Aaron Whitfield", topic: "Sabbath as a Delight", date: "May 18", confirmed: false },
];

const cursorFrames: CursorKeyframe[] = [
  { x: 320, y: 460, hold: 800 },
  { x: 920, y: 296, hold: 250 },
  { x: 920, y: 296, click: true, hold: 1300 },
  { x: 920, y: 392, hold: 250 },
  { x: 920, y: 392, click: true, hold: 1300 },
  { x: 920, y: 440, hold: 250 },
  { x: 920, y: 440, click: true, hold: 1700 },
];

export function FeatureSpeakersDemo() {
  const { ref, inView } = useSectionInView<HTMLDivElement>(0.25);
  const [speakers, setSpeakers] = useState(initial);

  useEffect(() => {
    if (!inView) {
      setSpeakers(initial);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const flips = ["2", "3", "5"];
    const tick = () => {
      flips.forEach((id, idx) => {
        timers.push(
          setTimeout(() => {
            setSpeakers((prev) =>
              prev.map((s) => (s.id === id ? { ...s, confirmed: true } : s))
            );
          }, 2200 + idx * 1700)
        );
      });
      timers.push(setTimeout(() => setSpeakers(initial), 9500));
    };
    tick();
    const loop = setInterval(tick, 11000);
    return () => {
      clearInterval(loop);
      timers.forEach(clearTimeout);
    };
  }, [inView]);

  return (
    <ReplicaShowcase
      eyebrow="Speakers"
      title={<>Track every assignment, from invite to confirmed.</>}
      description="See who's speaking, what they're speaking on, and whether they've confirmed — without three text threads and a spreadsheet."
      bullets={[
        "Status at a glance",
        "Topics and durations roll into the program",
        "Reminders so nobody falls through",
      ]}
    >
      <div ref={ref} className="relative">
        <ReplicaShell active="speakers" breadcrumb="Sacrament · Speakers">
          <div className="h-full overflow-hidden">
            <div className="px-8 py-10">
              <header className="flex items-end justify-between gap-6">
                <div className="min-w-0">
                  <div
                    className="text-[10.5px] font-medium uppercase tracking-[0.18em]"
                    style={{ color: "hsl(var(--landing-demo-subtle))" }}
                  >
                    Speakers
                  </div>
                  <h1
                    className="mt-2 font-serif text-[34px] font-normal leading-none tracking-normal"
                    style={{ color: "hsl(var(--landing-demo-text))" }}
                  >
                    Voices for <em className="italic">Sunday</em>
                  </h1>
                  <p
                    className="mt-3 max-w-xl text-[14px] leading-6"
                    style={{ color: "hsl(var(--landing-demo-muted))" }}
                  >
                    Manage and track speakers across all sacrament meetings.
                  </p>
                </div>
                <button
                  tabIndex={-1}
                  className="grid h-8 w-8 place-items-center rounded-full"
                  style={{ color: "hsl(var(--landing-demo-subtle))" }}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </header>

              <div
                className="mt-8 flex items-center gap-2 border-b pb-3"
                style={{ borderColor: "hsl(var(--landing-demo-divider))" }}
              >
                <FilterPill label="Status" value="All" />
                <FilterPill label="Date" value="Next 30 days" />
                <div className="relative ml-auto">
                  <Search
                    className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                    style={{ color: "hsl(var(--landing-demo-subtle))" }}
                  />
                  <div
                    className="h-8 w-[220px] rounded-[8px] border pl-8 pr-3 pt-[7px] text-[12.5px]"
                    style={{
                      borderColor: "hsl(var(--landing-demo-border))",
                      background: "hsl(var(--landing-demo-surface-2))",
                      color: "hsl(var(--landing-demo-subtle))",
                    }}
                  >
                    Search speakers…
                  </div>
                </div>
              </div>

              <div
                className="mt-2 text-[11.5px] tabular-nums"
                style={{ color: "hsl(var(--landing-demo-subtle))" }}
              >
                {speakers.length} speakers · {speakers.filter((s) => s.confirmed).length} confirmed
              </div>

              <div
                className="mt-4 overflow-hidden rounded-xl border"
                style={{ borderColor: "hsl(var(--landing-demo-border))" }}
              >
                <div
                  className="grid grid-cols-[2.4fr_2fr_1fr_1fr] gap-4 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider"
                  style={{
                    background: "hsl(var(--landing-demo-surface-2))",
                    color: "hsl(var(--landing-demo-subtle))",
                  }}
                >
                  <div>Speaker</div>
                  <div>Topic</div>
                  <div>Date</div>
                  <div className="text-right">Status</div>
                </div>
                <ul>
                  {speakers.map((s, idx) => (
                    <li
                      key={s.id}
                      className="grid grid-cols-[2.4fr_2fr_1fr_1fr] items-center gap-4 px-4 py-3.5"
                      style={{
                        background: "hsl(var(--landing-demo-surface))",
                        borderTop:
                          idx === 0
                            ? "none"
                            : "1px solid hsl(var(--landing-demo-divider))",
                      }}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
                          style={{
                            background: "hsl(var(--landing-demo-surface-2))",
                            color: "hsl(var(--landing-demo-muted))",
                          }}
                        >
                          {s.name.split(" ").slice(-1)[0][0]}
                        </div>
                        <div
                          className="truncate text-[13.5px] font-medium"
                          style={{ color: "hsl(var(--landing-demo-text))" }}
                        >
                          {s.name}
                        </div>
                      </div>
                      <div
                        className="truncate text-[13px]"
                        style={{ color: "hsl(var(--landing-demo-muted))" }}
                      >
                        {s.topic}
                      </div>
                      <div
                        className="text-[13px] tabular-nums"
                        style={{ color: "hsl(var(--landing-demo-muted))" }}
                      >
                        {s.date}
                      </div>
                      <div className="flex justify-end">
                        <StatusPill confirmed={s.confirmed} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <AnimatedCursor active={inView} keyframes={cursorFrames} label="confirm" />
        </ReplicaShell>
      </div>
    </ReplicaShowcase>
  );
}

function FilterPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px]"
      style={{
        borderColor: "hsl(var(--landing-demo-border))",
        background: "hsl(var(--landing-demo-surface))",
        color: "hsl(var(--landing-demo-text))",
      }}
    >
      <span style={{ color: "hsl(var(--landing-demo-subtle))" }}>{label}:</span>
      <span>{value}</span>
      <ChevronDown
        className="h-3 w-3"
        style={{ color: "hsl(var(--landing-demo-subtle))" }}
      />
    </div>
  );
}

function StatusPill({ confirmed }: { confirmed: boolean }) {
  return (
    <motion.div
      key={confirmed ? "yes" : "no"}
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={
        confirmed
          ? {
              background: "hsl(var(--landing-demo-success-soft))",
              color: "hsl(var(--landing-demo-success))",
            }
          : {
              background: "hsl(var(--landing-demo-warning-soft))",
              color: "hsl(var(--landing-demo-warning))",
            }
      }
    >
      {confirmed ? (
        <>
          <Check className="h-3 w-3" />
          Confirmed
        </>
      ) : (
        <>
          <Clock className="h-3 w-3" />
          Pending
        </>
      )}
    </motion.div>
  );
}
