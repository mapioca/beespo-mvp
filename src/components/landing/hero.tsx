"use client";

import { motion } from "framer-motion";
import { WaitlistForm } from "./waitlist-form";
import { GeometricComposition } from "./geometric-composition";

const namedFeatures = [
  { label: "Planner", color: "var(--lp-accent)" },
  { label: "Speakers", color: "var(--lp-ink)" },
  { label: "Business", color: "var(--lp-soft)" },
  { label: "Directory", color: "var(--lp-accent)" },
];

export function Hero() {
  return (
    <section
      className="relative overflow-hidden px-4 pb-20 pt-20 md:pb-28 md:pt-24"
      style={{ background: "var(--lp-bg)" }}
    >
      <div className="container relative mx-auto">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          {/* Text column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-center lg:text-left"
          >
            <h1
              className="text-hero font-bold tracking-tighter"
              style={{ color: "var(--lp-ink)" }}
            >
              Your calling shouldn&apos;t
              <br />
              start from{" "}
              <span
                className="italic"
                style={{
                  color: "var(--lp-accent)",
                  fontFamily: "var(--font-serif, ui-serif, Georgia, serif)",
                }}
              >
                zero
              </span>
              .
            </h1>

            <p
              className="text-hero-sub mx-auto mt-6 max-w-xl leading-relaxed lg:mx-0"
              style={{ color: "color-mix(in srgb, var(--lp-ink) 80%, transparent)" }}
            >
              Beespo is the first workspace built for the bishopric — so
              speakers, business, announcements, and meeting history live in
              one place that outlasts every release.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 lg:items-start">
              <WaitlistForm />
              <p
                className="text-xs"
                style={{ color: "color-mix(in srgb, var(--lp-ink) 60%, transparent)" }}
              >
                Built by ward members who&apos;ve sat in the chairs.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 lg:justify-start">
              {namedFeatures.map((f) => (
                <span
                  key={f.label}
                  className="inline-flex items-center gap-2 text-[13px] font-medium tracking-wide uppercase"
                  style={{ color: "var(--lp-ink)" }}
                >
                  <span
                    className="inline-block h-2.5 w-2.5"
                    style={{ background: f.color, borderRadius: "2px" }}
                  />
                  {f.label}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Composition column */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="relative mx-auto w-full max-w-[480px]"
          >
            <GeometricComposition className="h-auto w-full" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
