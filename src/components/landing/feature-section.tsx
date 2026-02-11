"use client";

import { AnimateOnScroll } from "./animate-on-scroll";
import { FeatureKanban } from "./feature-kanban";
import { FeatureToggle } from "./feature-toggle";
import { FeatureTable } from "./feature-table";

const features = [
  {
    number: "01",
    title: "Calling Pipeline",
    description:
      "Track every calling through 7 stages: Defined, Approved, Extended, Accepted, Sustained, Set Apart, Recorded. Never lose a candidate in the process.",
    visual: <FeatureKanban />,
  },
  {
    number: "02",
    title: "Meeting Builder",
    description:
      "Drag-and-drop agenda items with automatic time-boxing. Assign speakers, hymns, and facilitators. Works for Sacrament, Ward Council, or any meeting.",
    visual: <FeatureToggle />,
  },
  {
    number: "03",
    title: "Custom Tables",
    description:
      "Build databases without code. Text, selects, dates, checkboxes, user assignments. Filter, sort, and save views. Member directories, event RSVPs, anything.",
    visual: <FeatureTable />,
  },
];

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

        <div className="space-y-20">
          {features.map((feature, index) => (
            <AnimateOnScroll key={feature.title} delay={index * 0.1}>
              <div
                className={`grid md:grid-cols-2 gap-8 md:gap-12 items-center ${
                  index % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                <div className={index % 2 === 1 ? "md:order-2" : ""}>
                  <span className="text-xs font-mono text-neutral-400 tracking-widest">
                    {feature.number}
                  </span>
                  <h3 className="text-xl font-semibold mt-2 mb-3 text-neutral-900">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-500 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
                <div className={index % 2 === 1 ? "md:order-1" : ""}>
                  {feature.visual}
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
