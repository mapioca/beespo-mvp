"use client";

import { AnimateOnScroll } from "./animate-on-scroll";
import { WaitlistForm } from "./waitlist-form";

export function CTASection() {
  return (
    <section
      className="border-t px-4 py-20 md:py-28"
      style={{ borderColor: "hsl(var(--landing-demo-divider))" }}
    >
      <div className="container mx-auto max-w-2xl text-center">
        <AnimateOnScroll>
          <h2 className="mb-4 text-2xl font-semibold tracking-tight md:text-3xl">
            Ready to try a better way?
          </h2>
          <p
            className="mb-8"
            style={{ color: "hsl(var(--landing-demo-muted))" }}
          >
            Join the waitlist and be the first to know when we launch.
          </p>
          <div className="flex justify-center">
            <WaitlistForm />
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
