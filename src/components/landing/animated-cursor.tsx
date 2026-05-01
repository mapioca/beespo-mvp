"use client";

import { motion, useAnimationControls } from "framer-motion";
import { useEffect } from "react";

export type CursorKeyframe = {
  x: number;
  y: number;
  click?: boolean;
  hold?: number;
};

interface AnimatedCursorProps {
  active: boolean;
  keyframes: CursorKeyframe[];
  loop?: boolean;
  label?: string;
}

export function AnimatedCursor({
  active,
  keyframes,
  loop = true,
  label,
}: AnimatedCursorProps) {
  const cursor = useAnimationControls();
  const ring = useAnimationControls();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!keyframes.length) return;
      cursor.set({ x: keyframes[0].x, y: keyframes[0].y, opacity: 0 });
      await cursor.start({ opacity: 1, transition: { duration: 0.4 } });
      while (!cancelled) {
        for (let i = 0; i < keyframes.length; i++) {
          if (cancelled) return;
          const frame = keyframes[i];
          await cursor.start({
            x: frame.x,
            y: frame.y,
            transition: { duration: 0.85, ease: [0.65, 0, 0.35, 1] },
          });
          if (cancelled) return;
          if (frame.click) {
            ring.set({ scale: 0.6, opacity: 0.6 });
            ring.start({
              scale: 2.4,
              opacity: 0,
              transition: { duration: 0.55, ease: "easeOut" },
            });
            await new Promise((r) => setTimeout(r, 280));
          }
          if (frame.hold) {
            await new Promise((r) => setTimeout(r, frame.hold));
          }
        }
        if (!loop) break;
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    if (active) {
      run();
    } else {
      cursor.start({ opacity: 0, transition: { duration: 0.3 } });
    }

    return () => {
      cancelled = true;
    };
  }, [active, keyframes, loop, cursor, ring]);

  return (
    <motion.div
      animate={cursor}
      initial={{ opacity: 0 }}
      className="pointer-events-none absolute left-0 top-0 z-30"
      aria-hidden
    >
      <div className="relative">
        <motion.span
          animate={ring}
          initial={{ scale: 0.6, opacity: 0 }}
          className="absolute -left-3 -top-3 block h-9 w-9 rounded-full"
          style={{
            background: "hsl(var(--landing-cursor-fill) / 0.35)",
          }}
        />
        <svg
          width="20"
          height="22"
          viewBox="0 0 20 22"
          className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.18)]"
        >
          <path
            d="M2 1.4 L2 17.6 L6.4 13.6 L9 19.5 L11.6 18.3 L9 12.4 L15 12.4 Z"
            fill="hsl(var(--landing-cursor-fill))"
            stroke="hsl(var(--landing-cursor-ring))"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
        {label ? (
          <span
            className="absolute left-5 top-5 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium"
            style={{
              background: "hsl(var(--landing-cursor-fill))",
              color: "hsl(var(--landing-cursor-ring))",
            }}
          >
            {label}
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}
