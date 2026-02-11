"use client";

import { AnimateOnScroll } from "./animate-on-scroll";
import { FeatureKanban } from "./feature-kanban";
import { FeatureToggle } from "./feature-toggle";
import { FeatureTable } from "./feature-table";
import { FeatureCalendar } from "./feature-calendar";
import { FeatureTasks } from "./feature-tasks";
import { FeatureNotes } from "./feature-notes";

export function FeatureSection() {
  return (
    <section className="py-16 md:py-24 px-4 border-t border-neutral-100">
      <div className="container mx-auto max-w-5xl">
        <AnimateOnScroll className="text-center mb-16">
          <span className="text-xs font-mono text-neutral-400 tracking-widest uppercase">
            Features
          </span>
          <h2 className="text-2xl md:text-3xl font-semibold mt-2 tracking-tight">
            Everything you need, nothing you don&apos;t
          </h2>
        </AnimateOnScroll>

        {/* Feature 01 - Meeting Builder (Left text, Right demo) */}
        <AnimateOnScroll className="mb-20">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <span className="text-xs font-mono text-neutral-400 tracking-widest">
                01
              </span>
              <h3 className="text-xl font-semibold mt-2 mb-3 text-neutral-900">
                Meeting Builder
              </h3>
              <p className="text-neutral-500 leading-relaxed">
                Drag-and-drop agenda items with automatic time-boxing. Assign
                speakers, hymns, and facilitators. Color-coded by type:
                procedural, discussion, business, announcements.
              </p>
            </div>
            <div>
              <FeatureToggle />
            </div>
          </div>
        </AnimateOnScroll>

        {/* Feature 02 - Calling Pipeline (Right text, Left demo) */}
        <AnimateOnScroll className="mb-20">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="md:order-2">
              <span className="text-xs font-mono text-neutral-400 tracking-widest">
                02
              </span>
              <h3 className="text-xl font-semibold mt-2 mb-3 text-neutral-900">
                Calling Pipeline
              </h3>
              <p className="text-neutral-500 leading-relaxed">
                Track every calling through 7 stages: Defined, Approved,
                Extended, Accepted, Sustained, Set Apart, Recorded. Visual
                progress for each candidate.
              </p>
            </div>
            <div className="md:order-1">
              <FeatureKanban />
            </div>
          </div>
        </AnimateOnScroll>

        {/* Feature 03 - Calendar (Full width, text above) */}
        <AnimateOnScroll className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-mono text-neutral-400 tracking-widest">
              03
            </span>
            <h3 className="text-xl font-semibold mt-2 mb-3 text-neutral-900">
              Calendar
            </h3>
            <p className="text-neutral-500 leading-relaxed">
              Week view with color-coded meetings and events. Subscribe to
              Google, Outlook, or iCal feeds. Set recurring events for weekly
              meetings.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <FeatureCalendar />
          </div>
        </AnimateOnScroll>

        {/* Feature 04 - Tasks (Left text, Right demo) */}
        <AnimateOnScroll className="mb-20">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <span className="text-xs font-mono text-neutral-400 tracking-widest">
                04
              </span>
              <h3 className="text-xl font-semibold mt-2 mb-3 text-neutral-900">
                Tasks
              </h3>
              <p className="text-neutral-500 leading-relaxed">
                Tasks with context. Created from meetings, linked to discussions
                or callings. Priority levels, due dates, and assignees. See
                overdue items at a glance.
              </p>
            </div>
            <div>
              <FeatureTasks />
            </div>
          </div>
        </AnimateOnScroll>

        {/* Feature 05 - Custom Tables (Right text, Left demo) */}
        <AnimateOnScroll className="mb-20">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="md:order-2">
              <span className="text-xs font-mono text-neutral-400 tracking-widest">
                05
              </span>
              <h3 className="text-xl font-semibold mt-2 mb-3 text-neutral-900">
                Custom Tables
              </h3>
              <p className="text-neutral-500 leading-relaxed">
                Build databases without code. Text, selects, dates, checkboxes,
                user assignments. Filter, sort, and save views. Member
                directories, event RSVPs, anything.
              </p>
            </div>
            <div className="md:order-1">
              <FeatureTable />
            </div>
          </div>
        </AnimateOnScroll>

        {/* Feature 06 - Notebooks (Left text, Right demo) */}
        <AnimateOnScroll>
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <span className="text-xs font-mono text-neutral-400 tracking-widest">
                06
              </span>
              <h3 className="text-xl font-semibold mt-2 mb-3 text-neutral-900">
                Notebooks
              </h3>
              <p className="text-neutral-500 leading-relaxed">
                Organized notes by meeting type or topic. Rich text with action
                items. Search across all notes. Keep institutional knowledge in
                one place.
              </p>
            </div>
            <div>
              <FeatureNotes />
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
