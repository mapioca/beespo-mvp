import type { Metadata } from "next";
import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { FeaturePlannerDemo } from "@/components/landing/feature-planner-demo";
import { FeatureSpeakersDemo } from "@/components/landing/feature-speakers-demo";
import { FeatureAnnouncementsDemo } from "@/components/landing/feature-announcements-demo";
import { FeatureBusinessDemo } from "@/components/landing/feature-business-demo";
import { CTASection } from "@/components/landing/cta-section";
import { FAQSection } from "@/components/landing/faq-section";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Beespo — The Workspace for Church Leaders",
  description:
    "One workspace for the whole sacrament meeting — program, speakers, announcements, ward business. Built for church leaders.",
  openGraph: {
    title: "Beespo — The Workspace for Church Leaders",
    description:
      "One workspace for the whole sacrament meeting — program, speakers, announcements, ward business. Built for church leaders.",
    type: "website",
  },
};

export default function Home() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "hsl(var(--landing-page-bg))" }}
    >
      <Nav />
      <main
        id="main-content"
        className="flex-1 pt-[var(--landing-nav-height)]"
      >
        <Hero />
        <FeaturePlannerDemo />
        <FeatureSpeakersDemo />
        <FeatureAnnouncementsDemo />
        <FeatureBusinessDemo />
        <CTASection />
        <FAQSection />
      </main>
      <Footer />
    </div>
  );
}
