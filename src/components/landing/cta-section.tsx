"use client";

import { AnimateOnScroll } from "./animate-on-scroll";
import { WaitlistForm } from "./waitlist-form";

export function CTASection() {
  return (
    <section className="py-16 md:py-24 px-4 border-t border-neutral-100">
      <div className="container mx-auto max-w-2xl text-center">
        <AnimateOnScroll>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
            Ready to try a better way?
          </h2>
          <p className="text-muted-foreground mb-8">
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
