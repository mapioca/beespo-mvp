"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";
import { ReplicaShowcase } from "./replica/replica-showcase";
import { ReplicaShell } from "./replica/replica-shell";
import { AnimatedCursor, type CursorKeyframe } from "./animated-cursor";
import { useSectionInView } from "./use-section-in-view";

type Item = {
  id: string;
  title: string;
  audience: string;
  status: "Active" | "Draft";
  deadline: string;
  priority: 1 | 2 | 3;
};

const SCOPES = ["All", "Active", "Draft", "Stopped"] as const;

const baseItems: Item[] = [
  {
    id: "a1",
    title: "Stake Conference — May 18-19",
    audience: "All ward members",
    status: "Active",
    deadline: "2 weeks",
    priority: 3,
  },
  {
    id: "a2",
    title: "Youth temple trip sign-up",
    audience: "Youth + parents",
    status: "Active",
    deadline: "1 week",
    priority: 2,
  },
  {
    id: "a3",
    title: "Relief Society service project",
    audience: "Relief Society",
    status: "Draft",
    deadline: "3 weeks",
    priority: 1,
  },
  {
    id: "a4",
    title: "Bishop's interviews — Sunday",
    audience: "Elders Quorum",
    status: "Active",
    deadline: "4 days",
    priority: 2,
  },
];

const newItem: Item = {
  id: "new",
  title: "Linger Longer this Sunday",
  audience: "All ward members",
  status: "Active",
  deadline: "5 days",
  priority: 1,
};

const titleText = "Linger Longer this Sunday";

const cursorFrames: CursorKeyframe[] = [
  { x: 320, y: 460, hold: 700 },
  { x: 1080, y: 196, hold: 250 },
  { x: 1080, y: 196, click: true, hold: 1100 },
  { x: 540, y: 232, hold: 250 },
  { x: 540, y: 232, click: true, hold: 3200 },
  { x: 880, y: 232, hold: 250 },
  { x: 880, y: 232, click: true, hold: 1800 },
];

const TYPE_LOOP_MS = 11500;

export function FeatureAnnouncementsDemo() {
  const { ref, inView } = useSectionInView<HTMLDivElement>(0.25);
  const [composerOpen, setComposerOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [items, setItems] = useState(baseItems);

  useEffect(() => {
    if (!inView) {
      setComposerOpen(false);
      setTyped("");
      setItems(baseItems);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      setComposerOpen(false);
      setTyped("");
      setItems(baseItems);

      timers.push(setTimeout(() => setComposerOpen(true), 1500));

      const TYPE_START = 2200;
      titleText.split("").forEach((_, i) => {
        timers.push(
          setTimeout(() => setTyped(titleText.slice(0, i + 1)), TYPE_START + i * 55)
        );
      });
      timers.push(
        setTimeout(() => {
          setItems((prev) => [newItem, ...prev]);
          setComposerOpen(false);
          setTyped("");
        }, TYPE_START + titleText.length * 55 + 1700)
      );
      timers.push(
        setTimeout(() => setItems(baseItems), TYPE_START + titleText.length * 55 + 4300)
      );
    };
    run();
    const loop = setInterval(run, TYPE_LOOP_MS);
    return () => {
      clearInterval(loop);
      timers.forEach(clearTimeout);
    };
  }, [inView]);

  return (
    <ReplicaShowcase
      eyebrow="Announcements"
      title={<>One place for ward news. Always up to date.</>}
      description="Add an announcement once and it shows up in the program, on the welcome slide, and in the bulletin — no copy-pasting, no missed updates."
      bullets={[
        "Priority and audience tags",
        "Auto-expires when the event passes",
        "Internal vs. read-on-Sunday scope",
      ]}
    >
      <div ref={ref} className="relative">
        <ReplicaShell active="announcements" breadcrumb="Sacrament · Announcements">
          <div className="h-full overflow-hidden">
            <div className="px-8 py-10">
              <header className="flex items-end justify-between gap-6">
                <div className="min-w-0">
                  <div
                    className="text-[10.5px] font-medium uppercase tracking-[0.18em]"
                    style={{ color: "hsl(var(--landing-demo-subtle))" }}
                  >
                    Announcements
                  </div>
                  <h1
                    className="mt-2 font-serif text-[34px] font-normal leading-none tracking-normal"
                    style={{ color: "hsl(var(--landing-demo-text))" }}
                  >
                    Word worth <em className="italic">spreading</em>
                  </h1>
                  <p
                    className="mt-3 max-w-xl text-[14px] leading-6"
                    style={{ color: "hsl(var(--landing-demo-muted))" }}
                  >
                    Time-sensitive notes for your ward — posted, prioritized, and
                    visible while they matter.
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
                className="mt-8 flex items-center gap-8 border-b"
                style={{ borderColor: "hsl(var(--landing-demo-divider))" }}
              >
                {SCOPES.map((scope, idx) => {
                  const active = idx === 0;
                  return (
                    <div
                      key={scope}
                      className="-mb-px border-b-2 pb-3 text-[13px]"
                      style={{
                        borderColor: active
                          ? "hsl(var(--landing-demo-accent))"
                          : "transparent",
                        color: active
                          ? "hsl(var(--landing-demo-text))"
                          : "hsl(var(--landing-demo-muted))",
                      }}
                    >
                      {scope}
                      <span
                        className="ml-2 text-[10px] tabular-nums opacity-70"
                      >
                        {scope === "All"
                          ? items.length
                          : scope === "Active"
                            ? items.filter((i) => i.status === "Active").length
                            : scope === "Draft"
                              ? items.filter((i) => i.status === "Draft").length
                              : 0}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search
                    className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                    style={{ color: "hsl(var(--landing-demo-subtle))" }}
                  />
                  <div
                    className="h-8 w-[240px] rounded-[8px] border pl-8 pr-3 pt-[7px] text-[12.5px]"
                    style={{
                      borderColor: "hsl(var(--landing-demo-border))",
                      background: "hsl(var(--landing-demo-surface-2))",
                      color: "hsl(var(--landing-demo-subtle))",
                    }}
                  >
                    Search announcements…
                  </div>
                </div>
                <FilterPill label="Priority" value="All" />
                <div
                  className="ml-auto text-[11.5px] tabular-nums"
                  style={{ color: "hsl(var(--landing-demo-subtle))" }}
                >
                  {items.length} of {items.length}
                </div>
              </div>

              <AnimatePresence>
                {composerOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-5 overflow-hidden"
                  >
                    <div
                      className="rounded-xl border p-4"
                      style={{
                        borderColor: "hsl(var(--landing-demo-accent))",
                        background: "hsl(var(--landing-demo-surface))",
                        boxShadow: "0 0 0 4px hsl(var(--landing-demo-accent-soft))",
                      }}
                    >
                      <div
                        className="text-[10.5px] font-medium uppercase tracking-[0.18em]"
                        style={{ color: "hsl(var(--landing-demo-accent))" }}
                      >
                        New announcement
                      </div>
                      <div
                        className="mt-2 font-serif text-[20px]"
                        style={{
                          color: typed
                            ? "hsl(var(--landing-demo-text))"
                            : "hsl(var(--landing-demo-subtle))",
                        }}
                      >
                        {typed || "Title…"}
                        {typed && (
                          <motion.span
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ duration: 0.9, repeat: Infinity }}
                            className="ml-0.5 inline-block h-[1em] w-[1px] align-middle"
                            style={{ background: "hsl(var(--landing-demo-text))" }}
                          />
                        )}
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Tag>All ward members</Tag>
                        <Tag>5 days</Tag>
                        <Tag>Read on Sunday</Tag>
                        <button
                          tabIndex={-1}
                          className="ml-auto rounded-md px-3 py-1.5 text-[12px] font-medium"
                          style={{
                            background: "hsl(var(--landing-demo-accent))",
                            color: "hsl(var(--cp-primary-foreground))",
                          }}
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="mt-6 space-y-2">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: -10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 380, damping: 28 }}
                      className="grid grid-cols-[2.5fr_1.6fr_auto_auto_auto] items-center gap-4 rounded-xl border px-4 py-3"
                      style={{
                        borderColor: "hsl(var(--landing-demo-border))",
                        background: "hsl(var(--landing-demo-surface))",
                      }}
                    >
                      <div className="min-w-0">
                        <div
                          className="truncate font-serif text-[15.5px]"
                          style={{ color: "hsl(var(--landing-demo-text))" }}
                        >
                          {item.title}
                        </div>
                        <div
                          className="truncate text-[12px]"
                          style={{ color: "hsl(var(--landing-demo-subtle))" }}
                        >
                          {item.audience}
                        </div>
                      </div>
                      <div
                        className="text-[12.5px]"
                        style={{ color: "hsl(var(--landing-demo-muted))" }}
                      >
                        {item.audience}
                      </div>
                      <div
                        className="text-[12.5px] tabular-nums"
                        style={{ color: "hsl(var(--landing-demo-muted))" }}
                      >
                        {item.deadline}
                      </div>
                      <div>
                        <StatusBadge status={item.status} />
                      </div>
                      <div>
                        <PriorityBars level={item.priority} />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
          <AnimatedCursor active={inView} keyframes={cursorFrames} label="new" />
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

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11.5px]"
      style={{
        borderColor: "hsl(var(--landing-demo-border))",
        background: "hsl(var(--landing-demo-surface-2))",
        color: "hsl(var(--landing-demo-muted))",
      }}
    >
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: "Active" | "Draft" }) {
  const active = status === "Active";
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={
        active
          ? {
              background: "hsl(var(--landing-demo-success-soft))",
              color: "hsl(var(--landing-demo-success))",
            }
          : {
              background: "hsl(var(--landing-demo-surface-2))",
              color: "hsl(var(--landing-demo-muted))",
            }
      }
    >
      {status}
    </span>
  );
}

function PriorityBars({ level }: { level: 1 | 2 | 3 }) {
  return (
    <div className="flex items-end gap-0.5">
      {[1, 2, 3].map((bar) => (
        <span
          key={bar}
          className="block w-1 rounded-sm"
          style={{
            height: `${bar * 4 + 4}px`,
            background:
              bar <= level
                ? "hsl(var(--landing-demo-accent))"
                : "hsl(var(--landing-demo-divider))",
          }}
        />
      ))}
    </div>
  );
}
