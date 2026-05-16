export const TERMS_UPDATE_NOTICE = {
  active: true,
  version: "2026-05-16",
  effectiveDate: "2026-06-15",
  summary: "We've updated our Terms of Use and Privacy Policy to clarify our subscription cancellation, data handling, and user rights.",
  termsUrl: "/terms",
} as const;

export type TermsUpdateNotice = typeof TERMS_UPDATE_NOTICE;
