"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";

interface DirectoryMember {
  id: string;
  name: string;
}

interface DirectoryMemberSelectProps {
  value: string; // The name string
  onChange: (name: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DirectoryMemberSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const supabase = createClient();
    (supabase.from("directory") as ReturnType<typeof supabase.from>)
      .select("id, name")
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (!error) setMembers(data || []);
        setIsLoading(false);
      });
  }, []);

  return (
    <Command>
      <CommandInput placeholder="Search name..." className="h-8" />
      <CommandList className="max-h-[200px]">
        <CommandEmpty>No one found.</CommandEmpty>
        <CommandGroup>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            members.map((member) => (
              <CommandItem
                key={member.id}
                value={member.name}
                onSelect={() => onChange(member.name)}
                className="text-[13px]"
              >
                {member.name}
              </CommandItem>
            ))
          )}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function DirectoryMemberSelect({
  value,
  onChange,
  placeholder = "Select name...",
  disabled = false,
}: DirectoryMemberSelectProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && members.length === 0) {
      loadMembers();
    }
  }, [open, members.length]);

  const loadMembers = async () => {
    setIsLoading(true);
    const supabase = createClient();
    try {
      // Fetch members from the directory table
      const { data, error } = await (supabase.from("directory") as ReturnType<typeof supabase.from>)
        .select("id, name")
        .order("name", { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error("Failed to load directory members:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-8 rounded-md bg-[hsl(var(--settings-input-bg))] border-[hsl(var(--settings-divider))] text-[13px] font-medium leading-none px-3",
            !value && "text-muted-foreground font-normal"
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search name..." className="h-8" />
          <CommandList className="max-h-[200px]">
            <CommandEmpty>No one found.</CommandEmpty>
            <CommandGroup>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                members.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={member.name}
                    onSelect={() => {
                      onChange(member.name);
                      setOpen(false);
                    }}
                    className="text-[13px]"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === member.name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {member.name}
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
