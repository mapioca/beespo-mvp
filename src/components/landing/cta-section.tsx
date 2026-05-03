"use client";

import { AnimateOnScroll } from "./animate-on-scroll";
import { WaitlistForm } from "./waitlist-form";

export function CTASection() {
  return (
    <section
      className="px-4 py-20 md:py-28"
      style={{ background: "var(--lp-bg)" }}
    >
      <div className="container mx-auto max-w-4xl">
        <AnimateOnScroll>
          <div
            className="rounded-2xl px-8 py-14 text-center md:px-14 md:py-20"
            style={{
              background: "var(--lp-surface)",
              border: "1px solid color-mix(in srgb, var(--lp-ink) 14%, transparent)",
            }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--lp-accent)" }}
            >
              Join the waitlist
            </p>
            <h2
              className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl"
              style={{ color: "var(--lp-ink)" }}
            >
              Stop running your bishopric on stitched-together tools.
            </h2>
            <p
              className="mx-auto mt-4 max-w-xl text-base leading-relaxed md:text-lg"
              style={{ color: "color-mix(in srgb, var(--lp-ink) 75%, transparent)" }}
            >
              Beespo is opening to wards in waves. Add your email and we&apos;ll
              reach out when your spot is ready.
            </p>
            <div className="mt-8 flex justify-center">
              <WaitlistForm />
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
