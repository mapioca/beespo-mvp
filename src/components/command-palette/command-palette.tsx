"use client";

import { useRouter } from "next/navigation";
import {
  Archive,
  BookUser,
  BriefcaseBusiness,
  Home,
  Landmark,
  Megaphone,
  MicVocal,
  Settings,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { useHotkeys } from "@/hooks/use-hotkeys";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/directory", label: "Directory", icon: BookUser },
  { href: "/meetings/sacrament/planner", label: "Sacrament Planner", icon: Landmark },
  { href: "/meetings/sacrament/speakers", label: "Sacrament Speakers", icon: MicVocal },
  { href: "/meetings/sacrament/business", label: "Sacrament Business", icon: BriefcaseBusiness },
  { href: "/meetings/sacrament/announcements", label: "Sacrament Announcements", icon: Megaphone },
  { href: "/meetings/sacrament/archive", label: "Sacrament Archive", icon: Archive },
  { href: "/settings/account", label: "Settings", icon: Settings },
];

export function CommandPalette() {
  const router = useRouter();
  const isOpen = useCommandPaletteStore((s) => s.isOpen);
  const close = useCommandPaletteStore((s) => s.close);
  const toggle = useCommandPaletteStore((s) => s.toggle);

  useHotkeys("k", toggle);

  const go = (href: string) => {
    close();
    router.push(href);
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => (open ? toggle() : close())}>
      <CommandInput placeholder="Search or jump to..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Go to">
          {navItems.map(({ href, label, icon: Icon }) => (
            <CommandItem key={href} value={label} onSelect={() => go(href)}>
              <Icon className="mr-2 h-4 w-4" />
              <span>{label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
