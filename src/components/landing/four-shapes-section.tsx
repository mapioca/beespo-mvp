"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

type FeatureCard = {
  name: string;
  headline: string;
  description: string;
  art: ReactNode;
};

const SIZE = 160;
const cream = "#f9faf9";
const burnt = "#cb6538";
const walnut = "#6e5345";
const taupe = "#988d7a";

function PlannerArt() {
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
      <rect width={SIZE} height={SIZE} fill={burnt} />
      <rect x="20" y="40" width="120" height="14" fill={cream} />
      <rect x="20" y="64" width="80" height="14" fill={cream} opacity="0.55" />
      <rect x="20" y="88" width="100" height="14" fill={cream} opacity="0.7" />
      <rect x="20" y="112" width="60" height="14" fill={cream} opacity="0.45" />
    </svg>
  );
}

function SpeakersArt() {
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
      <rect width={SIZE} height={SIZE} fill={cream} />
      <circle cx="56" cy="80" r="34" fill={walnut} />
      <circle cx="104" cy="80" r="34" fill={burnt} />
      <path
        d={`M 56 80 m -34 0 a 34 34 0 0 0 68 0 Z`}
        fill={cream}
        opacity="0"
      />
    </svg>
  );
}

function BusinessArt() {
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
      <rect width={SIZE} height={SIZE} fill={walnut} />
      <path
        d={`M 0 80 A 80 80 0 0 1 160 80 Z`}
        fill={cream}
      />
      <circle cx="80" cy="80" r="14" fill={burnt} />
    </svg>
  );
}

function DirectoryArt() {
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
      <rect width={SIZE} height={SIZE} fill={cream} />
      {/* Two opposing quarter-circles forming a leaf — different shapes fitting together */}
      <path d={`M 0 0 L 160 0 A 160 160 0 0 0 0 160 Z`} fill={taupe} />
      <path d={`M 160 160 L 0 160 A 160 160 0 0 0 160 0 Z`} fill={burnt} />
    </svg>
  );
}

const features: FeatureCard[] = [
  {
    name: "Planner",
    headline: "The program, built once and reused forever.",
    description:
      "Drag-and-drop sacrament meeting agendas with hymns, talks, and ordinances. Save templates so the next presidency doesn't start from a blank page.",
    art: <PlannerArt />,
  },
  {
    name: "Speakers",
    headline: "Never double-book or forget a thank-you again.",
    description:
      "Invite, assign, and track every speaker — confirmations, topics, and follow-ups in one place. The whole bishopric sees the same status.",
    art: <SpeakersArt />,
  },
  {
    name: "Business",
    headline: "Sustaining and releases, on the record.",
    description:
      "Capture ward business items as they come up, vote and confirm them in meeting, and keep an auditable history without digging through notebooks.",
    art: <BusinessArt />,
  },
  {
    name: "Directory",
    headline: "Your ward, in one shared roster.",
    description:
      "A living directory of members and assignments that travels with the calling — so a new counselor inherits context, not a Google Drive folder.",
    art: <DirectoryArt />,
  },
];

function FeatureTile({ feature, index }: { feature: FeatureCard; index: number }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-5"
    >
      <div
        className="aspect-square w-full overflow-hidden"
        style={{ borderRadius: "4px" }}
      >
        {feature.art}
      </div>
      <div>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--brand-burnt)" }}
        >
          {feature.name}
        </p>
        <h3
          className="mt-2 text-[22px] font-bold leading-tight tracking-tight"
          style={{ color: "var(--brand-walnut)" }}
        >
          {feature.headline}
        </h3>
        <p
          className="mt-3 text-[15px] leading-relaxed"
          style={{ color: "color-mix(in srgb, var(--brand-walnut) 75%, transparent)" }}
        >
          {feature.description}
        </p>
      </div>
    </motion.article>
  );
}

export function FourShapesSection() {
  return (
    <section
      id="features"
      className="relative px-4 py-24 md:py-32"
      style={{ background: "var(--brand-cream)" }}
    >
      <div className="container mx-auto">
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--brand-burnt)" }}
          >
            What&#39;s inside
          </p>
          <h2
            className="mt-4 text-4xl font-bold tracking-tight md:text-5xl"
            style={{ color: "var(--brand-walnut)" }}
          >
            Four shapes.
            <br />
            One workspace for the bishopric.
          </h2>
          <p
            className="mx-auto mt-5 max-w-xl text-lg leading-relaxed"
            style={{ color: "color-mix(in srgb, var(--brand-walnut) 75%, transparent)" }}
          >
            Every presidency operates a little differently. Beespo gives each
            of you the same simple pieces — and lets the ward keep what was
            built when callings change.
          </p>
        </div>

        <div className="mt-16 grid gap-12 md:grid-cols-2 md:gap-x-12 md:gap-y-16 lg:grid-cols-4 lg:gap-x-8">
          {features.map((feature, i) => (
            <FeatureTile key={feature.name} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
