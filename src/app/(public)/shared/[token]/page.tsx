import { Metadata } from "next";
import Link from "next/link";
import { Building2, Printer } from "lucide-react";
import { MarkdownRenderer } from "@/components/meetings/markdown-renderer";
import { createAdminClient } from "@/lib/supabase/admin";

interface SharedMeetingPageProps {
  params: Promise<{ token: string }>;
}

const ORG_TYPE_LABELS: Record<string, string> = {
  bishopric: "Bishopric",
  elders_quorum: "Elders Quorum",
  relief_society: "Relief Society",
  young_men: "Young Men",
  young_women: "Young Women",
  primary: "Primary",
  missionary_work: "Missionary Work",
  temple_family_history: "Temple & Family History",
  sunday_school: "Sunday School",
};

export async function generateMetadata({
  params,
}: SharedMeetingPageProps): Promise<Metadata> {
  const { token } = await params;
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: share } = await (supabase as any)
    .from("meeting_shares")
    .select("meetings!meeting_id(title)")
    .eq("token", token)
    .eq("status", "active")
    .single();

  const title = share?.meetings?.title
    ? `${share.meetings.title} | Beespo`
    : "Shared Meeting | Beespo";

  return {
    title,
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    },
  };
}

function NotAvailablePage() {
  return (
    <div className="h-full flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            This meeting is no longer available
          </h1>
          <p className="text-gray-500 mb-8">
            The owner may have removed access to this meeting.
          </p>
          <Link
            href="https://beespo.com"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Go to Beespo
          </Link>
        </div>
      </main>
    </div>
  );
}

export default async function SharedMeetingPage({
  params,
}: SharedMeetingPageProps) {
  const { token } = await params;
  // Use admin client so RLS doesn't block external (unauthenticated) users.
  // The token itself is the authorization gate.
  const supabase = createAdminClient();

  // Step 1 — verify token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tokenRow } = await (supabase as any)
    .from("meeting_shares")
    .select("id, status, meeting_id")
    .eq("token", token)
    .single() as { data: { id: string; status: string; meeting_id: string } | null };

  if (!tokenRow || tokenRow.status !== "active") {
    return <NotAvailablePage />;
  }

  // Step 2 — fetch meeting + workspace (including the pre-saved markdown_agenda)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: meeting } = await (supabase as any)
    .from("meetings")
    .select(`
      id, title, markdown_agenda,
      workspaces:workspace_id (name, unit_name, organization_type)
    `)
    .eq("id", tokenRow.meeting_id)
    .single() as {
      data: {
        id: string;
        title: string;
        markdown_agenda: string | null;
        workspaces: { name: string; unit_name: string | null; organization_type: string | null } | null;
      } | null;
    };

  if (!meeting) {
    return <NotAvailablePage />;
  }

  // Build the "shared from" label
  const ws = meeting.workspaces;
  const unitName = ws?.unit_name || ws?.name || "";
  const orgLabel = ws?.organization_type
    ? (ORG_TYPE_LABELS[ws.organization_type] ?? ws.organization_type)
    : null;
  const sharedFrom = orgLabel ? `${unitName} ${orgLabel}`.trim() : unitName;

  return (
    <div className="h-full flex flex-col">
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-[850px] mx-auto w-full">
          {/* Top meta row: shared-from label + print button */}
          <div className="flex items-center justify-between mb-4">
            {sharedFrom ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span>Shared from {sharedFrom}</span>
              </div>
            ) : (
              <span />
            )}
            <a
              href={`/shared/${token}/print`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </a>
          </div>

          {/* Card matching the internal meeting detail view exactly */}
          <div className="bg-background border rounded-none sm:rounded-lg shadow-sm w-full min-h-[1056px] p-8 sm:p-12 lg:p-16">
            {meeting.markdown_agenda ? (
              <MarkdownRenderer markdown={meeting.markdown_agenda} />
            ) : (
              <p className="text-muted-foreground text-sm text-center pt-12">
                No agenda content available for this meeting.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
