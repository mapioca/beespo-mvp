import type { Metadata } from "next";
import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { BenefitGrid } from "@/components/landing/benefit-grid";
import { FeatureSection } from "@/components/landing/feature-section";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Beespo — The Operating System for Church Leadership",
  description:
    "Replace scattered spreadsheets, texts, and loose papers with a single operating system. Unify your Bishopric, Quorums, and Presidencies in one secure environment.",
  openGraph: {
    title: "Beespo — The Operating System for Church Leadership",
    description:
      "Replace scattered spreadsheets, texts, and loose papers with a single operating system. Unify your Bishopric, Quorums, and Presidencies in one secure environment.",
    type: "website",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 pt-16">
        <Hero />
        <BenefitGrid />
        <FeatureSection />
      </main>
      <Footer />
    </div>
  );
}
