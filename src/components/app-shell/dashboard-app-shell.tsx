"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "./app-shell";
import { MeetingsSecondaryPanel } from "./meetings-secondary-panel";

type DashboardAppShellProps = {
  children: ReactNode;
  userName: string;
  userEmail: string;
};

export function DashboardAppShell({
  children,
  userName,
  userEmail,
}: DashboardAppShellProps) {
  const pathname = usePathname();
  const showMeetingsSecondaryPanel =
    pathname.startsWith("/meetings") || pathname.startsWith("/templates");

  return (
    <AppShell
      userName={userName}
      userEmail={userEmail}
      secondaryPanel={showMeetingsSecondaryPanel ? <MeetingsSecondaryPanel /> : undefined}
    >
      {children}
    </AppShell>
  );
}

