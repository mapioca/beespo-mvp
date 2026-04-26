"use client";

import type { ReactNode } from "react";
import { DiscussionsProvider } from "@/features/discussions/lib/store";

export default function DiscussionsLayout({ children }: { children: ReactNode }) {
  return <DiscussionsProvider>{children}</DiscussionsProvider>;
}
