"use client";

import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { SharingGroupWithMembers, ShareRecipient } from "@/types/share";

interface RecipientSearchProps {
  suggestedGroups: SharingGroupWithMembers[];
  recentEmails: string[];
  existingRecipientIds: string[]; // already staged or already shared
  onAdd: (recipient: ShareRecipient) => void;
  disabled?: boolean;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function RecipientSearch({
  suggestedGroups,
  recentEmails,
  existingRecipientIds,
  onAdd,
  disabled = false,
}: RecipientSearchProps) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredGroups = suggestedGroups.filter(
    (g) =>
      !existingRecipientIds.includes(g.id) &&
      g.name.toLowerCase().includes(query.toLowerCase())
  );

  const filteredRecent = recentEmails.filter(
    (e) =>
      !existingRecipientIds.includes(e) &&
      e.toLowerCase().includes(query.toLowerCase())
  );

  const showQueryAsEmail =
    query.trim().length > 0 &&
    isValidEmail(query.trim()) &&
    !existingRecipientIds.includes(query.trim().toLowerCase());

  const hasResults =
    filteredGroups.length > 0 ||
    filteredRecent.length > 0 ||
    showQueryAsEmail;

  const handleAddGroup = (group: SharingGroupWithMembers) => {
    onAdd({
      type: "group",
      id: group.id,
      label: group.name,
      group,
      permission: "viewer",
    });
    setQuery("");
    setShowDropdown(false);
  };

  const handleAddEmail = (email: string) => {
    const normalised = email.trim().toLowerCase();
    onAdd({
      type: "individual",
      id: normalised,
      label: normalised,
      email: normalised,
      permission: "viewer",
    });
    setQuery("");
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && showQueryAsEmail) {
      e.preventDefault();
      handleAddEmail(query);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search groups or type email..."
          className="pl-9"
          disabled={disabled}
        />
      </div>

      {showDropdown && hasResults && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-y-auto">
          {/* Groups */}
          {filteredGroups.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Groups
              </div>
              {filteredGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleAddGroup(group);
                  }}
                >
                  <span className="font-medium">{group.name}</span>
                  <span className="text-muted-foreground text-xs ml-2">
                    {group.member_count}{" "}
                    {group.member_count === 1 ? "member" : "members"}
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Recent emails */}
          {filteredRecent.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-t">
                Recently Shared With
              </div>
              {filteredRecent.map((email) => (
                <button
                  key={email}
                  type="button"
                  className="flex w-full items-center px-3 py-2 text-sm hover:bg-accent text-left"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleAddEmail(email);
                  }}
                >
                  {email}
                </button>
              ))}
            </>
          )}

          {/* Direct email entry */}
          {showQueryAsEmail && (
            <>
              <div className="border-t" />
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleAddEmail(query);
                }}
              >
                <span>Add</span>
                <span className="font-medium">{query.trim()}</span>
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                  External
                </Badge>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
