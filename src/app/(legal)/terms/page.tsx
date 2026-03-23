import { Metadata } from "next";
import { TermsContent } from "@/components/auth/terms-content";

export const metadata: Metadata = {
  title: "Terms of Use | Beespo",
  description: "Beespo Terms of Use agreement.",
};

export default function TermsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Terms of Use</h1>
        <p className="text-muted-foreground mt-2">Last updated: January 12, 2026</p>
      </div>
      <div className="prose prose-sm max-w-none">
        <TermsContent />
      </div>
    </div>
  );
}
