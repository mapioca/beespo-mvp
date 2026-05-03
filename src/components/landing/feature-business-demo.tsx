"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ChevronDown, CircleCheck, CircleDashed, Plus, Search } from "lucide-react";
import { ReplicaShowcase } from "./replica/replica-showcase";
import { ReplicaShell } from "./replica/replica-shell";
import { AnimatedCursor, type CursorKeyframe } from "./animated-cursor";
import { useSectionInView } from "./use-section-in-view";

type Item = {
  id: string;
  name: string;
  calling: string;
  category: "Sustaining" | "Release" | "Confirmation" | "Ordination";
  status: "pending" | "completed";
  date: string;
};

const initial: Item[] = [
  { id: "b1", name: "Brother Eli Marsh", calling: "Elders Quorum 2nd Counselor", category: "Sustaining", status: "pending", date: "May 4" },
  { id: "b2", name: "Sister Rosa Quintero", calling: "Primary Teacher (CTR 7)", category: "Release", status: "pending", date: "May 4" },
  { id: "b3", name: "Brother Henry Park", calling: "Sunday School Teacher", category: "Sustaining", status: "completed", date: "Apr 27" },
  { id: "b4", name: "Anya Washington", calling: "Confirmation", category: "Confirmation", status: "pending", date: "May 4" },
  { id: "b5", name: "Brother Marcus Tate", calling: "Aaronic Priesthood — Priest", category: "Ordination", status: "pending", date: "May 11" },
];

const cursorFrames: CursorKeyframe[] = [
  { x: 320, y: 460, hold: 800 },
  { x: 1080, y: 296, hold: 250 },
  { x: 1080, y: 296, click: true, hold: 1300 },
  { x: 1080, y: 348, hold: 250 },
  { x: 1080, y: 348, click: true, hold: 1300 },
  { x: 1080, y: 444, hold: 250 },
  { x: 1080, y: 444, click: true, hold: 1300 },
  { x: 1080, y: 496, hold: 250 },
  { x: 1080, y: 496, click: true, hold: 1700 },
];

export function FeatureBusinessDemo() {
  const { ref, inView } = useSectionInView<HTMLDivElement>(0.25);
  const [items, setItems] = useState(initial);

  useEffect(() => {
    if (!inView) {
      setItems(initial);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const flips = ["b1", "b2", "b4", "b5"];
    const tick = () => {
      flips.forEach((id, idx) => {
        timers.push(
          setTimeout(() => {
            setItems((prev) =>
              prev.map((it) => (it.id === id ? { ...it, status: "completed" } : it))
            );
          }, 1900 + idx * 1600)
        );
      });
      timers.push(setTimeout(() => setItems(initial), 10800));
    };
    tick();
    const loop = setInterval(tick, 12200);
    return () => {
      clearInterval(loop);
      timers.forEach(clearTimeout);
    };
  }, [inView]);

  return (
    <ReplicaShowcase
      eyebrow="Ward Business"
      title={<>Sustainings, releases, and ordinations — handled.</>}
      description="Track every action item for ward business with the conducting script generated automatically. Nothing forgotten, nothing improvised at the pulpit."
      bullets={[
        "Auto-generated conducting scripts",
        "Mark complete as items are acted on",
        "Rolls into the program with one click",
      ]}
    >
      <div ref={ref} className="relative">
        <ReplicaShell active="business" breadcrumb="Sacrament · Business">
          <div className="h-full overflow-hidden">
            <div className="px-8 py-10">
              <header className="flex items-end justify-between gap-6">
                <div className="min-w-0">
                  <div
                    className="text-[10.5px] font-medium uppercase tracking-[0.18em]"
                    style={{ color: "hsl(var(--landing-demo-subtle))" }}
                  >
                    Business
                  </div>
                  <h1
                    className="mt-2 font-serif text-[34px] font-normal leading-[1.05] tracking-tight"
                    style={{ color: "hsl(var(--landing-demo-text))" }}
                  >
                    Sacrament meeting <em className="font-serif italic">business</em>
                  </h1>
                  <p
                    className="mt-3 max-w-xl text-[14px] leading-6"
                    style={{ color: "hsl(var(--landing-demo-muted))" }}
                  >
                    Track formal church procedures. The conducting script is
                    generated automatically.
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
                <FilterPill label="Category" value="All" />
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
                    Search business…
                  </div>
                </div>
              </div>

              <div
                className="mt-2 text-[11.5px] tabular-nums"
                style={{ color: "hsl(var(--landing-demo-subtle))" }}
              >
                {items.filter((i) => i.status === "completed").length} of {items.length} completed
              </div>

              <div
                className="mt-4 overflow-hidden rounded-xl border"
                style={{ borderColor: "hsl(var(--landing-demo-border))" }}
              >
                <div
                  className="grid grid-cols-[2fr_2.4fr_1fr_1fr_1fr] gap-4 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider"
                  style={{
                    background: "hsl(var(--landing-demo-surface-2))",
                    color: "hsl(var(--landing-demo-subtle))",
                  }}
                >
                  <div>Person</div>
                  <div>Calling</div>
                  <div>Category</div>
                  <div>Date</div>
                  <div className="text-right">Status</div>
                </div>
                <ul>
                  {items.map((item, idx) => (
                    <li
                      key={item.id}
                      className="grid grid-cols-[2fr_2.4fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3.5"
                      style={{
                        background: "hsl(var(--landing-demo-surface))",
                        borderTop:
                          idx === 0
                            ? "none"
                            : "1px solid hsl(var(--landing-demo-divider))",
                      }}
                    >
                      <div
                        className="truncate font-serif text-[15px]"
                        style={{ color: "hsl(var(--landing-demo-text))" }}
                      >
                        {item.name}
                      </div>
                      <div
                        className="truncate text-[13px]"
                        style={{ color: "hsl(var(--landing-demo-muted))" }}
                      >
                        {item.calling}
                      </div>
                      <div>
                        <CategoryBadge category={item.category} />
                      </div>
                      <div
                        className="text-[13px] tabular-nums"
                        style={{ color: "hsl(var(--landing-demo-muted))" }}
                      >
                        {item.date}
                      </div>
                      <div className="flex justify-end">
                        <StatusBadge status={item.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <AnimatedCursor active={inView} keyframes={cursorFrames} label="mark done" />
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

function CategoryBadge({ category }: { category: Item["category"] }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{
        borderColor: "hsl(var(--landing-demo-border))",
        background: "hsl(var(--landing-demo-surface-2))",
        color: "hsl(var(--landing-demo-muted))",
      }}
    >
      {category}
    </span>
  );
}

function StatusBadge({ status }: { status: "pending" | "completed" }) {
  const completed = status === "completed";
  return (
    <motion.span
      key={status}
      initial={{ scale: 0.85 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 24 }}
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={
        completed
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
      {completed ? (
        <>
          <CircleCheck className="h-3 w-3" />
          Done
        </>
      ) : (
        <>
          <CircleDashed className="h-3 w-3" />
          Pending
        </>
      )}
    </motion.span>
  );
}
