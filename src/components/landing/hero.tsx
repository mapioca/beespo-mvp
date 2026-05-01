"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { WaitlistForm } from "./waitlist-form";
import { HeroBackground } from "./hero-background";

const rotatingTools = [
  "spreadsheets and group texts?",
  "Google Docs and email threads?",
  "paper agendas and phone calls?",
  "shared folders and sticky notes?",
  "text chains and printouts?",
];

const longestText = "shared folders and sticky notes?";

export function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % rotatingTools.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const scrollToFirst = () => {
    const target = document.getElementById("feature-planner");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-28 md:pb-32 md:pt-36">
      <HeroBackground />
      <div className="container relative mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-4xl"
        >
          <span
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
            style={{
              borderColor: "hsl(var(--landing-demo-border))",
              background: "hsl(var(--landing-demo-surface) / 0.6)",
              color: "hsl(var(--landing-demo-muted))",
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "hsl(var(--landing-demo-accent))" }}
            />
            Built for sacrament meeting planning
          </span>
          <h1 className="text-hero font-bold tracking-tighter">
            Still running your presidency on
          </h1>
          <div className="relative inline-block w-full">
            <span className="text-hero invisible block font-bold tracking-tighter">
              {longestText}
            </span>
            <span className="absolute inset-0 flex items-start justify-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-hero font-bold tracking-tighter underline decoration-2 underline-offset-4"
                  style={{
                    textDecorationColor: "hsl(var(--landing-demo-accent))",
                  }}
                >
                  {rotatingTools[currentIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="text-hero-sub mx-auto mt-6 max-w-xl leading-relaxed"
          style={{ color: "hsl(var(--landing-demo-muted))" }}
        >
          One workspace for the whole sacrament meeting — program, speakers,
          announcements, ward business.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-col items-center"
        >
          <WaitlistForm />
          <p
            className="mt-4 text-xs"
            style={{ color: "hsl(var(--landing-demo-subtle))" }}
          >
            Built by church members who&apos;ve been there.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-20 flex flex-col items-center"
        >
          <button
            onClick={scrollToFirst}
            className="group flex flex-col items-center cursor-pointer transition-opacity hover:opacity-70"
          >
            <span
              className="mb-3 text-sm"
              style={{ color: "hsl(var(--landing-demo-muted))" }}
            >
              See how it works
            </span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown
                className="h-5 w-5"
                style={{ color: "hsl(var(--landing-demo-muted))" }}
              />
            </motion.div>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
