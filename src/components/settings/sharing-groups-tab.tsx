"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/lib/toast";
import { SharingGroupCard } from "./sharing-group-card";
import { SharingGroupForm } from "./sharing-group-form";
import type { SharingGroupWithMembers } from "@/types/share";

interface WorkspaceMember {
  email: string;
  full_name: string | null;
}

interface SharingGroupsTabProps {
  sharingGroups: SharingGroupWithMembers[];
  workspaceMembers: WorkspaceMember[];
  canManage: boolean; // admin or leader
}

export function SharingGroupsTab({
  sharingGroups,
  workspaceMembers,
  canManage,
}: SharingGroupsTabProps) {
  const router = useRouter();
  const [groups, setGroups] = useState<SharingGroupWithMembers[]>(sharingGroups);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SharingGroupWithMembers | null>(null);

  const handleCreate = async (data: {
    name: string;
    description: string;
    memberEmails: string[];
  }) => {
    const res = await fetch("/api/sharing-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error || "Failed to create group");
      throw new Error(json.error);
    }
    toast.success("Group created", {
      description: `"${data.name}" has been created.`,
    });
    router.refresh();
    // Optimistically add the new group
    setGroups((prev) => [
      {
        ...json.group,
        members: data.memberEmails.map((email) => ({
          id: "",
          group_id: json.group.id,
          email,
          added_by: null,
          created_at: new Date().toISOString(),
        })),
        member_count: data.memberEmails.length,
      },
      ...prev,
    ]);
  };

  const handleEdit = async (data: {
    name: string;
    description: string;
    memberEmails: string[];
  }) => {
    if (!editingGroup) return;
    const groupId = editingGroup.id;

    const res = await fetch(`/api/sharing-groups/${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name, description: data.description }),
    });
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error || "Failed to update group");
      throw new Error(json.error);
    }

    // Handle member changes
    const existingEmails = editingGroup.members.map((m) => m.email);
    const toAdd = data.memberEmails.filter((e) => !existingEmails.includes(e));
    const toRemove = existingEmails.filter(
      (e) => !data.memberEmails.includes(e)
    );

    await Promise.all([
      ...toAdd.map((email) =>
        fetch(`/api/sharing-groups/${groupId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        })
      ),
      ...toRemove.map((email) =>
        fetch(
          `/api/sharing-groups/${groupId}/members?email=${encodeURIComponent(email)}`,
          { method: "DELETE" }
        )
      ),
    ]);

    toast.success("Group updated");
    router.refresh();
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              name: data.name,
              description: data.description || null,
              members: data.memberEmails.map((email) => {
                const existing = g.members.find((m) => m.email === email);
                return (
                  existing ?? {
                    id: "",
                    group_id: groupId,
                    email,
                    added_by: null,
                    created_at: new Date().toISOString(),
                  }
                );
              }),
              member_count: data.memberEmails.length,
            }
          : g
      )
    );
    setEditingGroup(null);
  };

  const handleDelete = async (group: SharingGroupWithMembers) => {
    const res = await fetch(`/api/sharing-groups/${group.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error || "Failed to delete group");
      return;
    }
    toast.success("Group deleted", {
      description: `"${group.name}" and all associated shares have been removed.`,
    });
    setGroups((prev) => prev.filter((g) => g.id !== group.id));
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sharing Groups</CardTitle>
            <CardDescription>
              Groups let you share meetings with multiple people at once.{" "}
              {groups.length}{" "}
              {groups.length === 1 ? "group" : "groups"} in this workspace.
            </CardDescription>
          </div>
          {canManage && (
            <Button
              size="sm"
              onClick={() => setShowCreateForm(true)}
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Group
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No sharing groups yet.
              </p>
              {canManage && (
                <p className="text-sm text-muted-foreground mt-1">
                  Create a group to share meetings with multiple people at once.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <SharingGroupCard
                  key={group.id}
                  group={group}
                  canManage={canManage}
                  onEdit={(g) => setEditingGroup(g)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {!canManage && (
            <p className="text-sm text-muted-foreground mt-4">
              Contact an admin or leader to manage sharing groups.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Create form dialog */}
      <SharingGroupForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        workspaceMembers={workspaceMembers}
        onSave={handleCreate}
      />

      {/* Edit form dialog */}
      {editingGroup && (
        <SharingGroupForm
          open={Boolean(editingGroup)}
          onOpenChange={(open) => {
            if (!open) setEditingGroup(null);
          }}
          group={editingGroup}
          workspaceMembers={workspaceMembers}
          onSave={handleEdit}
        />
      )}
    </>
  );
}
