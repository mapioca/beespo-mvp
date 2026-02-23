"use client";

import { AnimateOnScroll } from "./animate-on-scroll";
import { EditorialCard } from "./editorial-card";

const benefits = [
  {
    number: "01",
    title: "No more 'I didn't know about that.'",
    description:
      "Each organization gets their own workspace—connected to the others. When the Relief Society plans a service project, the Elders Quorum sees it. When the Bishop needs follow-up, everyone knows.",
  },
  {
    number: "02",
    title: "Stop asking 'where's that spreadsheet?'",
    description:
      "The agenda, the calling tracker, the task list—all in one place. No more digging through emails, drives, or group chats to find what you need.",
  },
  {
    number: "03",
    title: "Get your Sunday nights back.",
    description:
      "Less time formatting agendas. Less time chasing confirmations. More time for the people who actually need you.",
  },
];

export function BenefitGrid() {
  return (
    <section id="benefits" className="py-16 md:py-24 px-4">
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
