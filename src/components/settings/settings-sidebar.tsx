"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Bell,
    Building2,
    Languages,
    Radio,
    User,
    Users,
    Users2,
    type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type SettingsNavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
};

type SettingsNavGroup = {
    label: string;
    items: SettingsNavItem[];
};

const navGroups: SettingsNavGroup[] = [
    {
        label: "Account",
        items: [{ href: "/settings/account", label: "Account", icon: User }],
    },
    {
        label: "Workspace",
        items: [
            { href: "/settings/workspace", label: "Workspace", icon: Building2 },
            { href: "/settings/team", label: "Team", icon: Users },
            { href: "/settings/sharing-groups", label: "Sharing Groups", icon: Users2 },
            { href: "/settings/audience", label: "Audience", icon: Radio },
        ],
    },
    {
        label: "Personal",
        items: [
            { href: "/settings/notifications", label: "Notifications", icon: Bell },
            { href: "/settings/language", label: "Language", icon: Languages },
        ],
    },
];

function isItemActive(pathname: string | null, href: string) {
    if (!pathname) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
}

export function SettingsSidebar() {
    const pathname = usePathname();

    return (
        <nav className="flex flex-col gap-5">
            {navGroups.map((group) => (
                <div key={group.label}>
                    <div className="px-3 pb-1.5 text-[11px] font-medium text-[#6b5947] dark:text-[#b79f84]">
                        {group.label}
                    </div>
                    <div className="flex flex-col gap-0.5">
                        {group.items.map((item) => {
                            const active = isItemActive(pathname, item.href);
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-current={active ? "page" : undefined}
                                    className={cn(
                                        "flex items-center gap-2.5 rounded-[6px] px-2.5 py-[7px] text-[13.5px] text-[var(--app-nav-text)] transition-colors duration-75 hover:bg-[var(--app-nav-hover)]",
                                        active && "bg-[var(--app-nav-active)] font-medium text-[var(--app-nav-strong)]"
                                    )}
                                >
                                    <Icon
                                        className={cn(
                                            "h-[15px] w-[15px] shrink-0 text-[var(--app-nav-icon)]",
                                            active && "text-[var(--app-nav-strong)]"
                                        )}
                                        strokeWidth={1.8}
                                    />
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
    );
}
