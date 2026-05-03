import { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { TermsContent } from "@/components/auth/terms-content";

export const metadata: Metadata = {
  title: "Terms of Use | Beespo",
  description: "Beespo Terms of Use agreement.",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="Legal"
      title="Terms"
      accent="of use"
      description={
        <>
          The operating terms for access to Beespo, our related services, and the responsibilities
          attached to each account.
          <p className="mt-2 text-sm">Last updated: January 12, 2026</p>
        </>
      }
    >
      <LegalSection title="Agreement" kicker="Service terms">
        <TermsContent />
      </LegalSection>
    </LegalPageShell>
  );
}
