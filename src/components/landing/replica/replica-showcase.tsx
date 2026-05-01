"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

interface ReplicaShowcaseProps {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  bullets?: string[];
  children: ReactNode;
  id?: string;
}

export function ReplicaShowcase({
  eyebrow,
  title,
  description,
  bullets,
  children,
  id,
}: ReplicaShowcaseProps) {
  return (
    <section id={id} className="relative px-4 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mb-12 max-w-3xl text-center md:mb-16"
        >
          <div
            className="text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: "hsl(var(--landing-demo-accent))" }}
          >
            {eyebrow}
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.05]">
            {title}
          </h2>
          <p
            className="mx-auto mt-5 max-w-2xl text-base leading-relaxed md:text-lg"
            style={{ color: "hsl(var(--landing-demo-muted))" }}
          >
            {description}
          </p>
          {bullets?.length ? (
            <ul className="mx-auto mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              {bullets.map((b) => (
                <li
                  key={b}
                  className="inline-flex items-center gap-2 text-sm"
                  style={{ color: "hsl(var(--landing-demo-text))" }}
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: "hsl(var(--landing-demo-accent))" }}
                  />
                  {b}
                </li>
              ))}
            </ul>
          ) : null}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}
