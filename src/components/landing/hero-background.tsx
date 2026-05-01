"use client";

import { motion } from "framer-motion";

export function HeroBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        className="absolute -left-[20%] top-[-10%] h-[60vw] w-[60vw] max-h-[820px] max-w-[820px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, hsl(var(--landing-glow-primary) / var(--landing-glow-opacity)) 0%, transparent 60%)",
          filter: "blur(40px)",
        }}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, delay: 0.2, ease: "easeOut" }}
        className="absolute -right-[15%] top-[10%] h-[55vw] w-[55vw] max-h-[760px] max-w-[760px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, hsl(var(--landing-glow-secondary) / calc(var(--landing-glow-opacity) * 0.85)) 0%, transparent 60%)",
          filter: "blur(50px)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          opacity: "var(--landing-grain-opacity)",
          mixBlendMode: "overlay",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-40"
        style={{
          background:
            "linear-gradient(to bottom, transparent, hsl(var(--landing-page-bg)))",
        }}
      />
    </div>
  );
}
