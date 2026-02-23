"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { inviteWaitlistUserAction } from "@/app/(admin)/admin/waitlist/actions";
import { format } from "date-fns";
import { Mail, Loader2 } from "lucide-react";

interface WaitlistSignup {
  id: string;
  email: string;
  created_at: string;
  invited_at: string | null;
}

interface WaitlistDataTableProps {
  signups: WaitlistSignup[];
}

function InviteButton({ id, email }: { id: string; email: string }) {
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!confirm(`Send a platform invitation to ${email}?`)) return;
    setLoading(true);
    try {
      const result = await inviteWaitlistUserAction(id, email);
      if (result.success) {
        toast.success("Invitation Sent", {
          description: `Invite code ${result.code} sent to ${email}.`,
        });
      } else {
        toast.error(result.error || "Failed to send invitation.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      onClick={handleInvite}
      disabled={loading}
      className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200 h-7 text-xs"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <>
          <Mail className="mr-1.5 h-3 w-3" />
          Invite
        </>
      )}
    </Button>
  );
}

export function WaitlistDataTable({ signups }: WaitlistDataTableProps) {
  if (signups.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
        <p className="text-zinc-400 mb-2">No waitlist signups yet.</p>
        <p className="text-sm text-zinc-500">
          Signups from the landing page will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/50">
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Email
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Status
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Signed Up
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Invited
            </th>
            <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {signups.map((signup) => (
            <tr
              key={signup.id}
              className="hover:bg-zinc-800/30 transition-colors"
            >
              <td className="px-4 py-3 text-sm text-zinc-200">
                {signup.email}
              </td>
              <td className="px-4 py-3">
                {signup.invited_at ? (
                  <Badge
                    variant="outline"
                    className="text-xs border-green-700 text-green-400"
                  >
                    invited
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-xs border-amber-700 text-amber-400"
                  >
                    pending
                  </Badge>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-500">
                {format(new Date(signup.created_at), "MMM d, yyyy")}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-500">
                {signup.invited_at
                  ? format(new Date(signup.invited_at), "MMM d, yyyy")
                  : "—"}
              </td>
              <td className="px-4 py-3 text-right">
                {!signup.invited_at && (
                  <InviteButton id={signup.id} email={signup.email} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
