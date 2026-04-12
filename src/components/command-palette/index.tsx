"use client";

import dynamic from "next/dynamic";

export const CommandPalette = dynamic(
  () =>
    import("./command-palette").then((module) => ({
      default: module.CommandPalette,
    })),
  {
    ssr: false,
    loading: () => null,
  }
);
