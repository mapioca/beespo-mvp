"use client";

import { AnimateOnScroll } from "./animate-on-scroll";
import { EditorialCard } from "./editorial-card";

const benefits = [
  {
    number: "01",
    title: "Cross-Organization Unity",
    description:
      "Break down the silos between the Bishopric and the organizations. Ensure the Elders Quorum, Relief Society, and Young Women move as one.",
  },
  {
    number: "02",
    title: "The End of Fragmentation",
    description:
      "Stop chasing spreadsheets, Google Docs, and productivity apps. Beespo is the only tool you need for agendas, callings, and revelation.",
  },
  {
    number: "03",
    title: "Intelligent Automation",
    description:
      "Automate the repetitive administrative work. Free up your presidency to focus on what matters: ministering to the one.",
  },
];

export function BenefitGrid() {
  return (
    <section className="py-16 md:py-24 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-100">
          {benefits.map((benefit, index) => (
            <AnimateOnScroll key={benefit.title} delay={index * 0.15}>
              <EditorialCard
                number={benefit.number}
                title={benefit.title}
                description={benefit.description}
              />
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
