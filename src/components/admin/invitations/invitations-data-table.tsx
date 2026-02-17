"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Copy, Ban } from "lucide-react";
import { revokeInvitationAction } from "@/app/(admin)/admin/invitations/actions";
import { toast } from "@/lib/toast";
import { format } from "date-fns";

interface Invitation {
  id: string;
  code: string;
  description: string | null;
  max_uses: number;
  uses_count: number;
  expires_at: string | null;
  status: string;
  created_at: string;
}

interface InvitationsDataTableProps {
  invitations: Invitation[];
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "border-green-700 text-green-400";
    case "exhausted":
      return "border-amber-700 text-amber-400";
    case "expired":
      return "border-zinc-700 text-zinc-500";
    case "revoked":
      return "border-red-700 text-red-400";
    default:
      return "border-zinc-700 text-zinc-400";
  }
}

export function InvitationsDataTable({
  invitations,
}: InvitationsDataTableProps) {
  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success("Copied", { description: `Code ${code} copied to clipboard.` });
  };

  const handleRevoke = async (id: string, code: string) => {
    if (!confirm(`Revoke invitation ${code}? This cannot be undone.`)) return;

    const result = await revokeInvitationAction(id);
    if (result.success) {
      toast.success("Revoked", { description: `Invitation ${code} has been revoked.` });
    } else {
      toast.error(result.error || "Failed to revoke invitation.");
    }
  };

  if (invitations.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
        <p className="text-zinc-400 mb-2">No invitations yet.</p>
        <p className="text-sm text-zinc-500">
          Create an invite code to allow new users to sign up.
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
              Code
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Description
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Status
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Uses
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Expires
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Created
            </th>
            <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {invitations.map((inv) => (
            <tr
              key={inv.id}
              className="hover:bg-zinc-800/30 transition-colors"
            >
              <td className="px-4 py-3">
                <code className="text-sm font-mono text-zinc-200">
                  {inv.code}
                </code>
              </td>
              <td className="px-4 py-3 text-sm text-zinc-400 max-w-xs truncate">
                {inv.description || "—"}
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant="outline"
                  className={`text-xs ${getStatusColor(inv.status)}`}
                >
                  {inv.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-zinc-400">
                {inv.uses_count} / {inv.max_uses}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-500">
                {inv.expires_at
                  ? format(new Date(inv.expires_at), "MMM d, yyyy")
                  : "Never"}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-500">
                {format(new Date(inv.created_at), "MMM d, yyyy")}
              </td>
              <td className="px-4 py-3 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="border-zinc-700 bg-zinc-800"
                  >
                    <DropdownMenuItem
                      onClick={() => handleCopy(inv.code)}
                      className="text-zinc-300 focus:bg-zinc-700 focus:text-zinc-100"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Code
                    </DropdownMenuItem>
                    {inv.status === "active" && (
                      <DropdownMenuItem
                        onClick={() => handleRevoke(inv.id, inv.code)}
                        className="text-red-400 focus:bg-zinc-700 focus:text-red-300"
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Revoke
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
