import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const borderColor = "color-mix(in srgb, var(--lp-ink) 14%, transparent)";

export function LegalPageShell({
  eyebrow,
  title,
  accent,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <div
        className="absolute inset-x-0 top-8 -z-10 mx-auto h-48 max-w-5xl rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--lp-accent) 18%, transparent) 0%, transparent 72%)",
        }}
      />

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-3xl">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--lp-accent)" }}
          >
            {eyebrow}
          </p>
          <h1
            className="mt-4 text-4xl font-normal leading-[0.95] tracking-[-0.03em] sm:text-5xl"
            style={{ color: "var(--lp-ink)" }}
          >
            <span className="font-serif">{title}</span>
            {accent ? <span className="font-serif italic"> {accent}</span> : null}
          </h1>
          <div
            className="mt-5 max-w-2xl text-[15px] leading-7 sm:text-[17px]"
            style={{ color: "color-mix(in srgb, var(--lp-ink) 78%, transparent)" }}
          >
            {description}
          </div>
        </div>

        <div className="mt-10 space-y-6">{children}</div>
      </section>
    </div>
  );
}

export function LegalSection({
  title,
  kicker,
  children,
  className,
}: {
  title?: string;
  kicker?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-[28px] p-6 sm:p-8", className)}
      style={{
        background: "var(--lp-surface)",
        border: `1px solid ${borderColor}`,
      }}
    >
      {kicker ? (
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "color-mix(in srgb, var(--lp-ink) 52%, transparent)" }}
        >
          {kicker}
        </p>
      ) : null}
      {title ? (
        <h2
          className={cn(
            "font-serif text-[24px] leading-tight text-[var(--lp-ink)]",
            kicker ? "mt-3" : ""
          )}
        >
          {title}
        </h2>
      ) : null}
      <div className={cn(title || kicker ? "mt-5" : "")}>{children}</div>
    </section>
  );
}
