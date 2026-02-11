import type { Metadata } from "next";
import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { BenefitGrid } from "@/components/landing/benefit-grid";
import { FeatureSection } from "@/components/landing/feature-section";
import { FAQSection } from "@/components/landing/faq-section";
import { CTASection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Beespo — The Workspace for Church Leaders",
  description:
    "Still running your presidency on spreadsheets and group texts? One shared workspace for meetings, callings, tasks, and notes. Built for church leaders.",
  openGraph: {
    title: "Beespo — The Workspace for Church Leaders",
    description:
      "Still running your presidency on spreadsheets and group texts? One shared workspace for meetings, callings, tasks, and notes. Built for church leaders.",
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
        <CTASection />
        <FAQSection />
      </main>
      <Footer />
    </div>
  );
}
