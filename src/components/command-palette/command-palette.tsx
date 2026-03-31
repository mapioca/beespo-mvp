"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  MessagesSquare,
  Handshake,
  Megaphone,
  HandHeart,
  CheckSquare,
  ClipboardList,
  Table2,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { useHotkeys } from "@/hooks/use-hotkeys";

interface CommandEntry {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  keywords?: string[];
}

interface CommandSection {
  heading: string;
  items: CommandEntry[];
}

const commandSections: CommandSection[] = [
  {
    heading: "Meetings",
    items: [
      {
        id: "new-meeting",
        label: "New Meeting",
        icon: CalendarDays,
        href: "/meetings/new",
        keywords: ["agenda", "schedule", "create"],
      },
      {
        id: "new-discussion",
        label: "New Discussion",
        icon: MessagesSquare,
        href: "/meetings/discussions/new",
        keywords: ["topic", "conversation", "create"],
      },
      {
        id: "new-business-item",
        label: "New Business Item",
        icon: Handshake,
        href: "/meetings/business/new",
        keywords: ["sustaining", "release", "calling", "create"],
      },
      {
        id: "new-announcement",
        label: "New Announcement",
        icon: Megaphone,
        href: "/meetings/announcements/new",
        keywords: ["notice", "message", "create"],
      },
    ],
  },
  {
    heading: "Organization",
    items: [
      {
        id: "new-calling",
        label: "New Calling",
        icon: HandHeart,
        href: "/callings",
        keywords: ["assignment", "role", "create"],
      },
      {
        id: "new-task",
        label: "New Task",
        icon: CheckSquare,
        href: "/tasks",
        keywords: ["todo", "action", "create"],
      },
    ],
  },
  {
    heading: "Data",
    items: [
      {
        id: "new-form",
        label: "New Form",
        icon: ClipboardList,
        href: "/forms/new",
        keywords: ["survey", "questionnaire", "create"],
      },
      {
        id: "new-table",
        label: "New Table",
        icon: Table2,
        href: "/tables/new",
        keywords: ["spreadsheet", "database", "create"],
      },
      {
        id: "new-notebook",
        label: "New Notebook",
        icon: BookOpen,
        href: "/notebooks",
        keywords: ["notes", "journal", "create"],
      },
    ],
  },
];

export function CommandPalette() {
  const { isOpen, close, toggle } = useCommandPaletteStore();
  const router = useRouter();

  useHotkeys("k", useCallback(toggle, [toggle]));

  const handleSelect = (href: string) => {
    close();
    router.push(href);
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {commandSections.map((section, index) => (
          <div key={section.heading}>
            {index > 0 && <CommandSeparator />}
            <CommandGroup heading={section.heading}>
              {section.items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.label}
                  keywords={item.keywords}
                  onSelect={() => handleSelect(item.href)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
