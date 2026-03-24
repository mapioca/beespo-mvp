import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { MarkdownRenderer } from "@/components/meetings/markdown-renderer";
import { PrintTrigger } from "@/app/(print)/meetings/[id]/print/print-trigger";

export const dynamic = "force-dynamic";

interface SharedPrintPageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedPrintPage({ params }: SharedPrintPageProps) {
  const { token } = await params;
  const supabase = createAdminClient();

  // Verify token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tokenRow } = await (supabase as any)
    .from("meeting_shares")
    .select("id, status, meeting_id")
    .eq("token", token)
    .single() as { data: { id: string; status: string; meeting_id: string } | null };

  if (!tokenRow || tokenRow.status !== "active") {
    notFound();
  }

  // Fetch meeting markdown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: meeting } = await (supabase as any)
    .from("meetings")
    .select("id, title, markdown_agenda")
    .eq("id", tokenRow.meeting_id)
    .single() as { data: { id: string; title: string; markdown_agenda: string | null } | null };

  if (!meeting || !meeting.markdown_agenda) {
    return (
      <div className="p-12 max-w-2xl mx-auto text-center mt-20">
        <h1 className="text-2xl font-bold mb-4">No Agenda Content</h1>
        <p className="text-gray-500">There is no agenda content available to print for this meeting.</p>
        <p className="text-sm mt-8 opacity-70">You can safely close this tab.</p>
      </div>
    );
  }

  return (
    <div className="relative print:bg-white print:m-0 print:p-0">
      <style>{`
        @page {
          margin: 1in;
        }
      `}</style>

      {/* Screen-only notice */}
      <div className="print:hidden bg-blue-50 border-b border-blue-100 p-4 text-center text-sm text-blue-800">
        <p>Opening print dialog… Please close this tab after printing.</p>
      </div>

      <main className="max-w-[850px] mx-auto p-12 sm:p-16 print:p-0 print:max-w-none">
        <MarkdownRenderer markdown={meeting.markdown_agenda} />
      </main>

      <PrintTrigger />
    </div>
  );
}
