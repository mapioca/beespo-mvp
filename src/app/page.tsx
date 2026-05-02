import type { Metadata } from "next";
import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { FourShapesSection } from "@/components/landing/four-shapes-section";
import { CTASection } from "@/components/landing/cta-section";
import { FAQSection } from "@/components/landing/faq-section";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Beespo — The Workspace for the Bishopric",
  description:
    "The first workspace built for ward leadership — planner, speakers, business, and directory in one place that outlasts every release.",
  openGraph: {
    title: "Beespo — The Workspace for the Bishopric",
    description:
      "The first workspace built for ward leadership — planner, speakers, business, and directory in one place that outlasts every release.",
    type: "website",
  },
};

export default function Home() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--brand-cream)" }}
    >
      <Nav />
      <main
        id="main-content"
        className="flex-1 pt-[var(--landing-nav-height)]"
      >
        <Hero />
        <FourShapesSection />
        <CTASection />
        <FAQSection />
      </main>
      <Footer />
    </div>
  );
}
