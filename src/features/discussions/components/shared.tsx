"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AppUser } from "../data/types";
import type { Tone } from "../lib/meta";

const toneClass: Record<Tone, string> = {
  neutral: "border-border/70 bg-surface-raised text-foreground/80",
  primary: "border-brand/30 bg-brand/10 text-brand",
  success: "border-[hsl(var(--cp-success)/0.3)] bg-[hsl(var(--cp-success)/0.1)] text-[hsl(var(--cp-success))]",
  warning: "border-[hsl(var(--cp-warning)/0.3)] bg-[hsl(var(--cp-warning)/0.1)] text-[hsl(var(--cp-warning))]",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  muted: "border-border/70 bg-surface-raised text-muted-foreground",
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
        "inline-flex h-[22px] items-center gap-1.5 rounded-full border px-2 text-[10.5px] font-medium leading-none",
        toneClass[tone],
        className,
      )}
    >
      {dot ? (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            tone === "primary" && "bg-brand",
            tone === "success" && "bg-[hsl(var(--cp-success))]",
            tone === "warning" && "bg-[hsl(var(--cp-warning))]",
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
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="mt-2 font-serif text-[34px] font-normal leading-none tracking-normal text-foreground">
          {title}
        </h1>
        {subtitle ? <p className="mt-3 text-[14px] leading-6 text-muted-foreground">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  );
}

export function userById(users: AppUser[], id: string) {
  return users.find((user) => user.id === id);
}
