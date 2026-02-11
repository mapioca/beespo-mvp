"use client";

import { motion } from "framer-motion";
import { WaitlistForm } from "./waitlist-form";
import { DashboardPreview } from "./dashboard-preview";

export function Hero() {
  return (
    <section className="pt-32 pb-16 md:pt-40 md:pb-24 px-4">
      <div className="container mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-hero font-bold tracking-tighter max-w-4xl mx-auto"
        >
          Unify Your Leadership. Automate the Administration.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="text-hero-sub text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed"
        >
          Replace scattered spreadsheets, texts, and loose papers with a single
          operating system. Connect the Bishopric to every Quorum and Presidency
          in one secure environment.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-col items-center"
        >
          <WaitlistForm />
          <p className="mt-4 text-xs text-muted-foreground max-w-sm">
            Independent software. Not affiliated with The Church of Jesus Christ
            of Latter-day Saints.
          </p>
        </motion.div>

        <DashboardPreview />
      </div>
    </section>
  );
}
