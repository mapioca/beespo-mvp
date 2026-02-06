"use client";

import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  id: string;
  full_name: string | null;
  email?: string;
}

interface UserLinkCellProps {
  value: string | null;
  isEditing: boolean;
  onSave: (value: string | null) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function UserLinkCell({
  value,
  isEditing,
  onSave,
  onKeyDown,
}: UserLinkCellProps) {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  // Fetch profiles for the workspace
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: currentProfile } = await (supabase as any)
            .from("profiles")
            .select("workspace_id")
            .eq("id", user.id)
            .single();

          if (currentProfile?.workspace_id) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: workspaceProfiles } = await (supabase as any)
              .from("profiles")
              .select("id, full_name")
              .eq("workspace_id", currentProfile.workspace_id);

            setProfiles(workspaceProfiles || []);
          }
        }
      } catch (error) {
        console.error("Error fetching profiles:", error);
      }
    };

    fetchProfiles();
  }, []);

  // Set selected profile when value changes
  useEffect(() => {
    if (value) {
      const profile = profiles.find((p) => p.id === value);
      setSelectedProfile(profile || null);
    } else {
      setSelectedProfile(null);
    }
  }, [value, profiles]);

  useEffect(() => {
    if (isEditing) {
      setOpen(true);
    }
  }, [isEditing]);

  const handleSelect = (profileId: string) => {
    if (profileId === "__clear__") {
      onSave(null);
    } else {
      onSave(profileId);
    }
    setOpen(false);
  };

  const getInitials = (name: string | null): string => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const content = (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 min-h-[32px] cursor-text",
        !selectedProfile && "text-muted-foreground text-sm"
      )}
    >
      {selectedProfile ? (
        <>
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[10px]">
              {getInitials(selectedProfile.full_name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm truncate">{selectedProfile.full_name || "Unknown"}</span>
        </>
      ) : (
        <>
          <User className="h-4 w-4" />
          <span>Empty</span>
        </>
      )}
    </div>
  );

  if (isEditing) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="w-full" onKeyDown={onKeyDown}>
            {content}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search people..." />
            <CommandList>
              <CommandEmpty>No people found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__clear__"
                  onSelect={() => handleSelect("__clear__")}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear selection
                </CommandItem>
                {profiles.map((profile) => (
                  <CommandItem
                    key={profile.id}
                    value={profile.full_name || profile.id}
                    onSelect={() => handleSelect(profile.id)}
                  >
                    <Avatar className="h-5 w-5 mr-2">
                      <AvatarFallback className="text-[10px]">
                        {getInitials(profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{profile.full_name || "Unknown"}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  return content;
}
