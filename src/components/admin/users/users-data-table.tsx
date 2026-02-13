"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Search, Shield, ShieldOff } from "lucide-react";
import { toggleSysAdminAction } from "@/app/(admin)/admin/users/actions";
import { useToast } from "@/lib/hooks/use-toast";
import { format } from "date-fns";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_sys_admin: boolean;
  workspace_id: string | null;
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workspaces: any;
}

interface UsersDataTableProps {
  profiles: Profile[];
}

const PAGE_SIZE = 20;

export function UsersDataTable({ profiles }: UsersDataTableProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const filtered = profiles.filter((p) => {
    const matchesSearch =
      !search ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.full_name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleToggleAdmin = async (userId: string, currentValue: boolean) => {
    const result = await toggleSysAdminAction(userId, !currentValue);
    if (result.success) {
      toast({
        title: currentValue ? "Admin removed" : "Admin granted",
        description: currentValue
          ? "User is no longer a system administrator."
          : "User is now a system administrator.",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update user.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9 border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[140px] border-zinc-700 bg-zinc-800 text-zinc-100">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent className="border-zinc-700 bg-zinc-800">
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="leader">Leader</SelectItem>
            <SelectItem value="guest">Guest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Email
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Role
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Workspace
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Admin
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
            {paginated.map((profile) => (
              <tr
                key={profile.id}
                className="hover:bg-zinc-800/30 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-zinc-300">
                  {profile.email}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-300">
                  {profile.full_name}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className="border-zinc-700 text-zinc-400 text-xs"
                  >
                    {profile.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-400">
                  {(Array.isArray(profile.workspaces) ? profile.workspaces[0]?.name : profile.workspaces?.name) || "—"}
                </td>
                <td className="px-4 py-3">
                  {profile.is_sys_admin && (
                    <Shield className="h-4 w-4 text-amber-500" />
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-500">
                  {format(new Date(profile.created_at), "MMM d, yyyy")}
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
                        onClick={() =>
                          handleToggleAdmin(profile.id, profile.is_sys_admin)
                        }
                        className="text-zinc-300 focus:bg-zinc-700 focus:text-zinc-100"
                      >
                        {profile.is_sys_admin ? (
                          <>
                            <ShieldOff className="mr-2 h-4 w-4" />
                            Remove Admin
                          </>
                        ) : (
                          <>
                            <Shield className="mr-2 h-4 w-4" />
                            Make Admin
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-zinc-500"
                >
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Showing {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length} users
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
