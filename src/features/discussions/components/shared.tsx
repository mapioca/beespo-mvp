"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AppUser } from "../data/types";
import type { Tone } from "../lib/meta";

const toneClass: Record<Tone, string> = {
  neutral: "border-border bg-muted text-foreground",
  primary: "border-primary/30 bg-primary/10 text-primary",
  success: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400",
  warning: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  muted: "border-border bg-muted text-muted-foreground",
};

export function Pill({
  children,
  tone = "neutral",
  dot,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-full border px-2 text-xs font-medium leading-none",
        toneClass[tone],
        className,
      )}
    >
      {dot ? (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            tone === "primary" && "bg-primary",
            tone === "success" && "bg-green-500",
            tone === "warning" && "bg-yellow-500",
            tone === "danger" && "bg-destructive",
            (tone === "neutral" || tone === "muted") && "bg-muted-foreground",
          )}
        />
      ) : null}
      {children}
    </span>
  );
}

export function Avatar({
  name,
  size = 28,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const hue = hash % 360;

  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-medium", className)}
      style={{
        width: size,
        height: size,
        background: `hsl(${hue} 30% 22%)`,
        color: `hsl(${hue} 50% 78%)`,
        fontSize: Math.round(size * 0.4),
      }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  right,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-start justify-between gap-6", className)}>
      <div className="min-w-0 max-w-[620px]">
        {eyebrow ? (
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="mt-2 font-serif text-4xl font-normal leading-none tracking-normal text-foreground">
          {title}
        </h1>
        {subtitle ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  );
}

export function userById(users: AppUser[], id: string) {
  return users.find((user) => user.id === id);
}
