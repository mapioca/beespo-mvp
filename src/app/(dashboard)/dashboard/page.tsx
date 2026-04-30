import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";

import { getDashboardRequestContext } from "@/lib/dashboard/request-context";
import {
  fetchSacramentHomeData,
  fetchUpcomingSacramentSummaries,
  type HomeAssignmentSlot,
  type HomeHymnSlot,
  type HomeReadinessItem,
  type HomeReadinessPerson,
  type SacramentHomeData,
  type UpcomingSacramentSummary,
} from "@/lib/dashboard/home-data-fetchers";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Type tokens ────────────────────────────────────────────────────────────

const T_META = "text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground";
const T_BODY = "text-[13.5px] leading-relaxed";
const T_LEAD = "text-[18px] font-medium leading-[1.25] sm:text-[19px]";
const T_DISPLAY =
  "font-serif text-[34px] font-normal leading-[1.05] tracking-tight sm:text-[44px]";

// ── Card primitives ────────────────────────────────────────────────────────

const CARD_BASE =
  "rounded-2xl border border-border/70 bg-surface-raised shadow-[var(--shadow-builder-card)]";
const CARD_PAD = "px-5 py-5 sm:px-6 sm:py-6";
const CARD_PAD_LG = "px-5 py-6 sm:px-7 sm:py-7";

const ROW_BASE = cn(
  "group -mx-2 flex min-h-[44px] flex-col gap-0.5 rounded-md px-2 py-2 outline-none transition-colors duration-75",
  "hover:bg-[var(--app-nav-hover)] focus-visible:bg-[var(--app-nav-hover)] focus-visible:ring-1 focus-visible:ring-foreground/20"
);

// ── Date / greeting helpers ────────────────────────────────────────────────

function formatHeaderDate(date = new Date()) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatShortDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatLongDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function daysUntil(isoDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${isoDate}T12:00:00`);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000));
}

function relativeDayLabel(isoDate: string) {
  const days = daysUntil(isoDate);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

// ── Severity & summary copy ────────────────────────────────────────────────

type ProgramSeverity = "needs-assignment" | "needs-confirmation" | "set" | "n-a";

function deriveProgramSeverity(data: SacramentHomeData): ProgramSeverity {
  if (!data.programApplicable) return "n-a";
  const slots: { unassigned: boolean; pending: boolean }[] = [
    { unassigned: data.conducting.status === "unassigned", pending: false },
    { unassigned: data.presiding.status === "unassigned", pending: false },
    ...data.speakers.map((p) => ({
      unassigned: p.status === "missing",
      pending: p.status === "pending",
    })),
    ...data.prayers.map((p) => ({
      unassigned: p.status === "missing",
      pending: p.status === "pending",
    })),
    ...data.hymns.map((h) => ({
      unassigned: h.status === "unchosen",
      pending: false,
    })),
  ];
  if (slots.some((s) => s.unassigned)) return "needs-assignment";
  if (slots.some((s) => s.pending)) return "needs-confirmation";
  return "set";
}

function formatList(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function gapPhrase(data: SacramentHomeData): string {
  const speakersUnassigned = data.speakers.filter((p) => p.status === "missing").length;
  const prayersUnassigned = data.prayers.filter((p) => p.status === "missing").length;
  const hymnsUnchosen = data.hymns.filter((h) => h.status === "unchosen").length;
  const conductingUnassigned = data.conducting.status === "unassigned";
  const presidingUnassigned = data.presiding.status === "unassigned";

  const parts: string[] = [];
  if (speakersUnassigned > 0)
    parts.push(`${speakersUnassigned} ${speakersUnassigned === 1 ? "speaker" : "speakers"}`);
  if (prayersUnassigned > 0)
    parts.push(`${prayersUnassigned} ${prayersUnassigned === 1 ? "prayer" : "prayers"}`);
  if (hymnsUnchosen > 0)
    parts.push(`${hymnsUnchosen} ${hymnsUnchosen === 1 ? "hymn" : "hymns"}`);
  if (conductingUnassigned) parts.push("conducting");
  if (presidingUnassigned) parts.push("presiding");
  if (parts.length === 0) return "Some assignments are still open";

  const onlyHymns = hymnsUnchosen > 0 && parts.length === 1;
  const verb = onlyHymns ? "to choose" : "to assign";
  return `${capitalize(formatList(parts))} ${verb}`;
}

function statusSubhead(data: SacramentHomeData): string {
  const severity = deriveProgramSeverity(data);
  if (severity === "needs-assignment") return `${gapPhrase(data)}.`;
  if (severity === "needs-confirmation") {
    const pending =
      data.speakers.filter((p) => p.status === "pending").length +
      data.prayers.filter((p) => p.status === "pending").length;
    if (pending === 0) return "Awaiting confirmations.";
    return `Awaiting ${pending} ${pending === 1 ? "confirmation" : "confirmations"}.`;
  }
  if (severity === "n-a") return "No program assignments needed this Sunday.";
  return "Sunday is set.";
}

// ── Row primitives ─────────────────────────────────────────────────────────

type DotTone = "ok" | "pending" | "missing" | "muted";

function StatusDot({ tone }: { tone: DotTone }) {
  const cls =
    tone === "ok"
      ? "bg-emerald-500/80"
      : tone === "missing"
      ? "bg-[hsl(var(--cp-warning))]"
      : tone === "pending"
      ? "bg-muted-foreground/60"
      : "bg-muted-foreground/30";
  return (
    <span
      className={cn("mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full sm:mt-0", cls)}
      aria-hidden
    />
  );
}

function SlotRow({
  href,
  tone,
  role,
  primary,
  status,
}: {
  href: string;
  tone: DotTone;
  role: string;
  primary: ReactNode;
  status?: ReactNode;
}) {
  return (
    <Link href={href} className={ROW_BASE}>
      <div className="flex items-start gap-2.5 sm:items-center">
        <StatusDot tone={tone} />
        <span className={cn(T_META, "shrink-0 sm:w-[120px]")}>{role}</span>
        <span className="min-w-0 flex-1 text-[14px] text-foreground sm:text-[13.5px]">
          {primary}
        </span>
        {status ? (
          <span className="hidden text-[12.5px] text-muted-foreground sm:inline">
            {status}
          </span>
        ) : null}
      </div>
      {status ? (
        <span className="pl-[26px] text-[12.5px] text-muted-foreground sm:hidden">
          {status}
        </span>
      ) : null}
    </Link>
  );
}

function ItemRow({ href, item }: { href: string; item: HomeReadinessItem }) {
  return (
    <Link href={href} className={ROW_BASE}>
      <div className="flex items-start gap-3">
        <span
          className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40"
          aria-hidden
        />
        <span className="min-w-0 flex-1 text-[14px] leading-snug text-foreground sm:text-[13.5px]">
          <span>{item.title}</span>
          {item.detail ? (
            <span className="text-muted-foreground"> · {item.detail}</span>
          ) : null}
        </span>
      </div>
    </Link>
  );
}

function SubgroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="pb-1 pt-4 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/60 first:pt-0">
      {children}
    </div>
  );
}

function CardHeader({
  label,
  summary,
  href,
}: {
  label: string;
  summary?: ReactNode;
  href?: string;
}) {
  const heading = (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
      {label}
    </h2>
  );
  return (
    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
      {href ? (
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          {heading}
          <ChevronRight className="h-3 w-3 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : (
        heading
      )}
      {summary ? (
        <span className="text-[12.5px] text-muted-foreground">{summary}</span>
      ) : null}
    </div>
  );
}

// ── Slot row variants ──────────────────────────────────────────────────────

function AssignmentRow({ slot, href }: { slot: HomeAssignmentSlot; href: string }) {
  if (slot.status === "assigned") {
    return (
      <SlotRow
        href={href}
        tone="muted"
        role={slot.role}
        primary={<span className="text-foreground">{slot.name}</span>}
      />
    );
  }
  return (
    <SlotRow
      href={href}
      tone="missing"
      role={slot.role}
      primary={<span className="italic text-muted-foreground">Not assigned</span>}
    />
  );
}

function PersonRow({
  person,
  href,
  kind,
}: {
  person: HomeReadinessPerson;
  href: string;
  kind: "speaker" | "prayer";
}) {
  if (person.status === "missing") {
    return (
      <SlotRow
        href={href}
        tone="missing"
        role={person.role}
        primary={<span className="italic text-muted-foreground">Not assigned</span>}
      />
    );
  }
  const tone: DotTone = person.status === "confirmed" ? "ok" : "pending";
  const status = person.status === "pending" ? "Awaiting confirmation" : undefined;
  return (
    <SlotRow
      href={href}
      tone={tone}
      role={person.role}
      primary={
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-foreground">{person.name}</span>
          {kind === "speaker" && person.detail ? (
            <span className="text-muted-foreground">· {person.detail}</span>
          ) : null}
        </span>
      }
      status={status}
    />
  );
}

function HymnRow({ hymn, href }: { hymn: HomeHymnSlot; href: string }) {
  if (hymn.status === "unchosen") {
    return (
      <SlotRow
        href={href}
        tone="missing"
        role={hymn.role}
        primary={<span className="italic text-muted-foreground">Not chosen</span>}
      />
    );
  }
  const numberLabel = typeof hymn.hymnNumber === "number" ? `№ ${hymn.hymnNumber}` : null;
  return (
    <SlotRow
      href={href}
      tone="ok"
      role={hymn.role}
      primary={
        <span className="flex flex-wrap items-baseline gap-x-2">
          {numberLabel ? (
            <span className="font-mono text-[12px] text-muted-foreground">{numberLabel}</span>
          ) : null}
          <span className="text-foreground">{hymn.hymnTitle ?? "Selected"}</span>
        </span>
      }
    />
  );
}

// ── Sections (each is a card) ──────────────────────────────────────────────

function ThisSundayCard({ data }: { data: SacramentHomeData }) {
  const dayLabel = relativeDayLabel(data.meetingDate);
  return (
    <section
      className={cn(
        CARD_BASE,
        CARD_PAD_LG,
        "relative overflow-hidden"
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent"
        aria-hidden
      />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="flex min-w-0 flex-col gap-2">
          <div className={T_META}>This Sunday · {dayLabel}</div>
          <div className={cn(T_LEAD, "text-foreground")}>
            {formatLongDate(data.meetingDate)}
          </div>
          <div className="text-[13px] text-muted-foreground">
            {data.meetingType} · {data.meetingTime}
          </div>
        </div>
        <Button asChild size="default" className="w-full sm:w-auto">
          <Link href={data.plannerHref}>
            Open agenda
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function ProgramCard({ data }: { data: SacramentHomeData }) {
  const plannerHref = data.plannerHref;
  const speakersHref = "/meetings/sacrament/speakers";

  if (!data.programApplicable) {
    return (
      <section className={cn(CARD_BASE, CARD_PAD)}>
        <CardHeader label="Program" summary="No program needed" />
        <p className={cn(T_BODY, "text-muted-foreground")}>
          {data.meetingType} doesn&apos;t require speaker, prayer, or hymn assignments.
        </p>
      </section>
    );
  }

  return (
    <section className={cn(CARD_BASE, CARD_PAD)}>
      <CardHeader label="Program" href={plannerHref} />

      <SubgroupLabel>Conducting · Presiding</SubgroupLabel>
      <AssignmentRow slot={data.conducting} href={plannerHref} />
      <AssignmentRow slot={data.presiding} href={plannerHref} />

      {data.speakers.length > 0 ? (
        <>
          <SubgroupLabel>Speakers</SubgroupLabel>
          {data.speakers.map((person) => (
            <PersonRow key={person.id} person={person} href={speakersHref} kind="speaker" />
          ))}
        </>
      ) : null}

      {data.prayers.length > 0 ? (
        <>
          <SubgroupLabel>Prayers</SubgroupLabel>
          {data.prayers.map((person) => (
            <PersonRow key={person.id} person={person} href={plannerHref} kind="prayer" />
          ))}
        </>
      ) : null}

      {data.hymns.length > 0 ? (
        <>
          <SubgroupLabel>Hymns</SubgroupLabel>
          {data.hymns.map((hymn) => (
            <HymnRow key={hymn.id} hymn={hymn} href={plannerHref} />
          ))}
        </>
      ) : null}
    </section>
  );
}

function BusinessCard({ data }: { data: SacramentHomeData }) {
  const href = "/meetings/sacrament/business";
  const summary =
    data.businessCount === 0
      ? "Nothing this week"
      : `${data.businessCount} ${data.businessCount === 1 ? "item" : "items"}`;

  return (
    <section className={cn(CARD_BASE, CARD_PAD)}>
      <CardHeader label="Business" summary={summary} href={href} />
      {data.businessItems.length === 0 ? (
        <p className={cn(T_BODY, "text-muted-foreground")}>
          No sustainings, releases, or other business this week.
        </p>
      ) : (
        <div className="flex flex-col">
          {data.businessItems.map((item) => (
            <ItemRow key={item.id} item={item} href={href} />
          ))}
        </div>
      )}
    </section>
  );
}

function AnnouncementsCard({ data }: { data: SacramentHomeData }) {
  const href = "/meetings/sacrament/announcements";
  const summary =
    data.announcementCount === 0
      ? "Nothing to read"
      : `${data.announcementCount} ${
          data.announcementCount === 1 ? "announcement" : "announcements"
        }`;

  return (
    <section className={cn(CARD_BASE, CARD_PAD)}>
      <CardHeader label="Announcements" summary={summary} href={href} />
      {data.announcements.length === 0 ? (
        <p className={cn(T_BODY, "text-muted-foreground")}>
          No active announcements for this Sunday.
        </p>
      ) : (
        <div className="flex flex-col">
          {data.announcements.map((item) => (
            <ItemRow key={item.id} item={item} href={href} />
          ))}
        </div>
      )}
    </section>
  );
}

function upcomingPhrase(summary: UpcomingSacramentSummary): string {
  if (!summary.isProgramApplicable) return "No program needed";
  if (!summary.hasAnyData) return "Not started";

  const speakersGap = summary.speakersTotal - summary.speakersAssigned;
  const prayersGap = summary.prayersTotal - summary.prayersAssigned;
  const hymnsGap = summary.hymnsTotal - summary.hymnsChosen;

  if (speakersGap === 0 && prayersGap === 0 && hymnsGap === 0) {
    if (summary.speakersTotal === 0 && summary.prayersTotal === 0 && summary.hymnsTotal === 0) {
      return "Not started";
    }
    return "All set";
  }

  const parts: string[] = [];
  if (speakersGap > 0) parts.push(`${speakersGap} ${speakersGap === 1 ? "speaker" : "speakers"}`);
  if (prayersGap > 0) parts.push(`${prayersGap} ${prayersGap === 1 ? "prayer" : "prayers"}`);
  if (hymnsGap > 0) parts.push(`${hymnsGap} ${hymnsGap === 1 ? "hymn" : "hymns"}`);

  const onlyHymns = hymnsGap > 0 && parts.length === 1;
  const verb = onlyHymns ? "to choose" : "to assign";
  return `${capitalize(formatList(parts))} ${verb}`;
}

function LookingAheadCard({ rows }: { rows: UpcomingSacramentSummary[] }) {
  if (rows.length === 0) return null;
  return (
    <section className={cn(CARD_BASE, CARD_PAD)}>
      <CardHeader label="Looking ahead" summary="Next 3 Sundays" />
      <div className="flex flex-col">
        {rows.map((row) => {
          const phrase = upcomingPhrase(row);
          const isSet = phrase === "All set";
          const isEmpty = phrase === "Not started" || phrase === "No program needed";
          const phraseTone = isSet
            ? "text-emerald-600 dark:text-emerald-500/90"
            : isEmpty
            ? "text-muted-foreground/60"
            : "text-foreground/90";
          return (
            <Link key={row.meetingDate} href={row.plannerHref} className={ROW_BASE}>
              <div className="flex items-baseline gap-3 sm:items-center sm:gap-4">
                <span className="w-[60px] shrink-0 text-[13.5px] font-medium text-foreground sm:w-[80px]">
                  {formatShortDate(row.meetingDate)}
                </span>
                <span className="hidden text-[12px] text-muted-foreground sm:inline sm:w-[180px]">
                  {row.meetingType}
                </span>
                <span className={cn("text-[12.5px] sm:flex-1 sm:text-[13px]", phraseTone)}>
                  {phrase}
                </span>
              </div>
              <span className="pl-[60px] text-[11px] text-muted-foreground/70 sm:hidden">
                {row.meetingType}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [{ profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ]);

  const data = await fetchSacramentHomeData(supabase, profile.workspace_id);
  const upcoming = await fetchUpcomingSacramentSummaries(
    supabase,
    profile.workspace_id,
    data.meetingDate,
    3
  );

  const role = (profile as { role?: string | null }).role?.toLowerCase() ?? "";
  const firstName = profile.full_name?.split(" ")[0] ?? "Bishop";
  const displayName = role.includes("bishop") ? "Bishop" : firstName;

  return (
    <div className="h-full w-full overflow-y-auto bg-surface-canvas text-foreground">
      <main className="mx-auto flex w-full max-w-[920px] flex-col gap-5 px-4 py-8 sm:gap-6 sm:px-8 sm:py-12">
        {/* Greeting — flat on canvas, no card */}
        <header className="flex flex-col gap-3 px-1 pb-2 sm:px-2 sm:pb-3">
          <div className={T_META}>{formatHeaderDate()}</div>
          <h1 className={cn(T_DISPLAY, "text-foreground")}>
            {getGreeting()},{" "}
            <span className="italic text-brand">{displayName}.</span>
          </h1>
          <p className={cn(T_BODY, "max-w-xl text-muted-foreground")}>
            {statusSubhead(data)}
          </p>
        </header>

        {/* Hero card */}
        <ThisSundayCard data={data} />

        {/* Content cards */}
        <ProgramCard data={data} />
        <BusinessCard data={data} />
        <AnnouncementsCard data={data} />

        {/* Closing card */}
        <LookingAheadCard rows={upcoming} />
      </main>
    </div>
  );
}
