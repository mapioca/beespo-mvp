"use client";

import { motion } from "framer-motion";
import { WaitlistForm } from "./waitlist-form";
import { DashboardPreview } from "./dashboard-preview";
import { ChevronDown } from "lucide-react";

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
          Still running your presidency on spreadsheets and group texts?
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="text-hero-sub text-muted-foreground mt-6 max-w-xl mx-auto leading-relaxed"
        >
          There&apos;s a better way.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-col items-center"
        >
          <WaitlistForm />
          <p className="mt-4 text-xs text-muted-foreground">
            Built by church members who&apos;ve been there.
          </p>
        </motion.div>

        {/* Transition to demo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 flex flex-col items-center"
        >
          <p className="text-sm text-muted-foreground mb-3">
            See what&apos;s possible
          </p>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </motion.div>

        <DashboardPreview />
      </div>
    </section>
  );
}
