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

        {/* Feature 03 - Calendar (Full width hero style) */}
        <AnimateOnScroll className="mb-20">
          <div className="relative">
            {/* Text overlay card */}
            <div className="md:absolute md:top-8 md:left-0 md:z-10 md:max-w-xs bg-white p-6 border border-neutral-200 shadow-lg mb-6 md:mb-0">
              <span className="text-xs font-mono text-neutral-400 tracking-widest">
                03
              </span>
              <h3 className="text-xl font-semibold mt-2 mb-3 text-neutral-900">
                Calendar
              </h3>
              <p className="text-neutral-500 leading-relaxed text-sm">
                Week view with color-coded meetings. Subscribe to Google,
                Outlook, or iCal feeds. Recurring events for weekly meetings.
              </p>
            </div>
            {/* Demo - larger and offset */}
            <div className="md:ml-auto md:w-[85%]">
              <FeatureCalendar />
            </div>
          </div>
        </AnimateOnScroll>

        {/* Feature 04 & 05 - Tasks & Tables (Side by side) */}
        <AnimateOnScroll className="mb-20">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Tasks */}
            <div>
              <div className="mb-4">
                <span className="text-xs font-mono text-neutral-400 tracking-widest">
                  04
                </span>
                <h3 className="text-lg font-semibold mt-1 mb-2 text-neutral-900">
                  Tasks
                </h3>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  Created from meetings, linked to discussions. Priority levels,
                  due dates, assignees.
                </p>
              </div>
              <FeatureTasks />
            </div>

            {/* Tables */}
            <div>
              <div className="mb-4">
                <span className="text-xs font-mono text-neutral-400 tracking-widest">
                  05
                </span>
                <h3 className="text-lg font-semibold mt-1 mb-2 text-neutral-900">
                  Custom Tables
                </h3>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  Build databases without code. Text, selects, dates, users.
                  Filter, sort, save views.
                </p>
              </div>
              <FeatureTable />
            </div>
          </div>
        </AnimateOnScroll>

        {/* Feature 06 - Notebooks (Centered with demo below) */}
        <AnimateOnScroll>
          <div className="text-center max-w-2xl mx-auto mb-6">
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
          <div className="max-w-2xl mx-auto">
            <FeatureNotes />
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
