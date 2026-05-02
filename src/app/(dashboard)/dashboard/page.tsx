import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  ChevronRight,
  Circle,
  Clock3,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDashboardRequestContext } from "@/lib/dashboard/request-context";
import {
  fetchSacramentHomeData,
  type HomeReadinessItem,
  type HomeReadinessPerson,
  type SacramentHomeData,
} from "@/lib/dashboard/home-data-fetchers";
import { createClient } from "@/lib/supabase/server";

const T_LABEL =
  "text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80";
const T_PANEL_TITLE =
  "text-[15px] font-semibold tracking-[-0.01em] text-foreground";
const PANEL_BASE =
  "rounded-[22px] border border-border/70 bg-background shadow-[0_1px_0_rgba(15,23,42,0.03)]";
const PANEL_PAD = "px-4 py-4 sm:px-5 sm:py-5";

type Tone = "primary" | "secondary" | "critical" | "warning" | "ok" | "muted";

function formatHeaderDate(date = new Date()) {
  return date.toLocaleDateString("en-US", {
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
function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function daysUntil(isoDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${isoDate}T12:00:00`);
  target.setHours(0, 0, 0, 0);
  return Math.max(
    0,
    Math.ceil((target.getTime() - today.getTime()) / 86400000)
  );
}

function relativeDayLabel(isoDate: string) {
  const days = daysUntil(isoDate);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

function formatRelativeTimestamp(isoTimestamp: string | null) {
  if (!isoTimestamp) return null;
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  if (Number.isNaN(diffMs)) return null;

  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `Updated ${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `Updated ${days}d ago`;

  return `Updated ${new Date(isoTimestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

function countPeopleByStatus(
  people: HomeReadinessPerson[],
  status: HomeReadinessPerson["status"]
) {
  return people.filter((person) => person.status === status).length;
}

function countChosenHymns(data: SacramentHomeData) {
  return data.hymns.filter((hymn) => hymn.status === "chosen").length;
}

function countMissingLeadership(data: SacramentHomeData) {
  if (!data.programApplicable) return 0;
  return [data.presiding, data.conducting].filter(
    (slot) => slot.status === "unassigned"
  ).length;
}

function countAssignedLeadership(data: SacramentHomeData) {
  if (!data.programApplicable) return 0;
  return 2 - countMissingLeadership(data);
}

function readinessStats(data: SacramentHomeData) {
  const leadershipTotal = data.programApplicable ? 2 : 0;
  const hymnTotal = data.programApplicable ? data.hymns.length : 0;
  const total = leadershipTotal + data.totalRequiredCount + hymnTotal;
  const completed = data.programApplicable
    ? countAssignedLeadership(data) +
      data.confirmedRequiredCount +
      countChosenHymns(data)
    : 0;

  if (total === 0) {
    return { completed: 1, total: 1, percent: 100 };
  }

  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
}

function attentionPoints(data: SacramentHomeData) {
  return (
    countPeopleByStatus(data.speakers, "missing") +
    countPeopleByStatus(data.speakers, "pending") +
    countPeopleByStatus(data.prayers, "missing") +
    countPeopleByStatus(data.prayers, "pending") +
    data.hymns.filter((hymn) => hymn.status === "unchosen").length +
    countMissingLeadership(data) +
    (data.businessCount > 0 ? 1 : 0) +
    (data.announcementCount > 0 ? 1 : 0)
  );
}

function toneClasses(tone: Tone) {
  if (tone === "primary") {
    return {
      dot: "bg-[hsl(var(--primary-pill-border))]",
      text: "text-[hsl(var(--primary-pill-foreground))]",
      pill: "border-[hsl(var(--primary-pill-border))] bg-[hsl(var(--primary-pill-bg))] text-[hsl(var(--primary-pill-foreground))] hover:bg-[hsl(var(--primary-pill-hover))]",
      bar: "bg-[hsl(var(--primary-pill-border))]",
    };
  }
  if (tone === "secondary") {
    return {
      dot: "bg-[hsl(var(--secondary-border))]",
      text: "text-[hsl(var(--secondary-foreground))]",
      pill: "border-[hsl(var(--secondary-border))] bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary-hover))]",
      bar: "bg-[hsl(var(--secondary-border))]",
    };
  }
  if (tone === "critical") {
    return {
      dot: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-300",
      pill: "border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
      bar: "bg-amber-500",
    };
  }
  if (tone === "warning") {
    return {
      dot: "bg-sky-500",
      text: "text-sky-700 dark:text-sky-300",
      pill: "border-sky-200/80 bg-sky-50 text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200",
      bar: "bg-sky-500",
    };
  }
  if (tone === "ok") {
    return {
      dot: "bg-emerald-500",
      text: "text-emerald-700 dark:text-emerald-300",
      pill: "border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
      bar: "bg-emerald-500",
    };
  }
  return {
    dot: "bg-muted-foreground/35",
    text: "text-muted-foreground",
    pill: "border-border/70 bg-muted/60 text-muted-foreground",
    bar: "bg-muted-foreground/35",
  };
}

function metricTone(missing: number, pending = 0): Tone {
  if (missing > 0) return "critical";
  if (pending > 0) return "warning";
  return "ok";
}

function PanelHeader({
  label,
  title,
  action,
  labelClassName,
  titleClassName,
}: {
  label: string;
  title?: ReactNode;
  action?: ReactNode;
  labelClassName?: string;
  titleClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className={cn(T_LABEL, labelClassName)}>{label}</div>
        {title ? <h2 className={cn(T_PANEL_TITLE, "mt-2", titleClassName)}>{title}</h2> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function TonePill({ tone, children }: { tone: Tone; children: ReactNode }) {
  const classes = toneClasses(tone);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
        classes.pill
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", classes.dot)} />
      {children}
    </span>
  );
}

function AssignmentSummarySegment({
  label,
  value,
  detail,
  badge,
  href,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  badge?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group px-5 py-4 transition-colors hover:bg-surface-body/70",
        "first:rounded-t-[22px] last:rounded-b-[22px] md:first:rounded-l-[22px] md:first:rounded-tr-none md:last:rounded-r-[22px] md:last:rounded-bl-none"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[14px] font-medium text-foreground">{label}</div>
        <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
          Review
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <div className="[font-family:var(--font-inter),system-ui,sans-serif] tabular-nums text-[28px] font-semibold tracking-[-0.03em] text-brand">
          {value}
        </div>
        <div className="text-[12px] font-medium text-muted-foreground/80">{detail}</div>
        {badge ? (
          <TonePill tone="secondary">{badge}</TonePill>
        ) : null}
      </div>
    </Link>
  );
}

function AssignmentSummaryCard({
  speakerConfirmed,
  speakerTotal,
  speakerMissing,
  prayerConfirmed,
  prayerTotal,
  prayerMissing,
  hymnsChosen,
  hymnsTotal,
  programApplicable,
  plannerHref,
}: {
  speakerConfirmed: number;
  speakerTotal: number;
  speakerMissing: number;
  prayerConfirmed: number;
  prayerTotal: number;
  prayerMissing: number;
  hymnsChosen: number;
  hymnsTotal: number;
  hymnsMissing: number;
  programApplicable: boolean;
  plannerHref: string;
}) {
  const speakerAssigned = speakerTotal - speakerMissing;
  const prayerAssigned = prayerTotal - prayerMissing;

  const speakerDetail = !programApplicable ? "no speakers required" : "confirmed";
  const prayerDetail = !programApplicable ? "no prayers required" : "confirmed";
  const hymnDetail = !programApplicable
    ? "no hymns required"
    : "chosen";

  return (
    <section className={cn(PANEL_BASE, "overflow-hidden")}>
      <div className="grid divide-y divide-border/70 md:grid-cols-3 md:divide-x md:divide-y-0">
        <AssignmentSummarySegment
          label="Speakers"
          value={programApplicable ? `${speakerConfirmed}/${speakerTotal}` : "--"}
          detail={speakerDetail}
          badge={programApplicable ? `${speakerAssigned}/${speakerTotal} assigned` : undefined}
          href="/meetings/sacrament/speakers"
        />
        <AssignmentSummarySegment
          label="Prayers"
          value={programApplicable ? `${prayerConfirmed}/${prayerTotal}` : "--"}
          detail={prayerDetail}
          badge={programApplicable ? `${prayerAssigned}/${prayerTotal} assigned` : undefined}
          href={plannerHref}
        />
        <AssignmentSummarySegment
          label="Hymns"
          value={programApplicable ? `${hymnsChosen}/${hymnsTotal}` : "--"}
          detail={hymnDetail}
          href={plannerHref}
        />
      </div>
    </section>
  );
}

function SnapshotRow({
  label,
  value,
  tone = "muted",
  href,
  icon,
}: {
  label: string;
  value: string;
  tone?: Tone;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const isLink = Boolean(href);
  const toneClass =
    tone === "critical"
      ? "is-critical"
      : tone === "warning"
        ? "is-warning"
        : tone === "ok"
          ? "is-ok"
          : "is-muted";
  const MetricIcon =
    icon ??
    (tone === "critical"
      ? AlertTriangle
      : tone === "warning"
        ? Clock3
        : tone === "ok"
          ? Check
          : Circle);
  const content = (
    <div className="overview-row-card">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn("overview-row-icon", toneClass)}
        >
          <MetricIcon
            className={cn(tone === "muted" ? "h-3 w-3" : "h-3.5 w-3.5")}
            strokeWidth={tone === "critical" ? 2 : 2.8}
          />
        </span>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-foreground">{label}</div>
          <div className="overview-row-value-inline text-[12.5px] font-medium">{value}</div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="overview-row-value-trailing text-[12.5px] font-medium">{value}</div>
        {isLink ? (
          <ChevronRight className="overview-row-chevron h-4.5 w-4.5 shrink-0 text-foreground/75" />
        ) : null}
      </div>
    </div>
  );

  return href ? (
    <Link
      href={href}
      className="overview-row-link"
    >
      {content}
    </Link>
  ) : (
    content
  );
}

function QueueCard({
  label,
  href,
  items,
  count,
  emptyCopy,
}: {
  label: string;
  href: string;
  items: HomeReadinessItem[];
  count: number;
  emptyCopy: string;
}) {
  return (
    <section className={cn(PANEL_BASE, PANEL_PAD)}>
      <PanelHeader
        label={label}
        labelClassName="!font-sans text-[14px] font-medium normal-case tracking-normal text-foreground"
        action={<TonePill tone="secondary">{count > 0 ? pluralize(count, "item") : "Clear"}</TonePill>}
      />

      {count === 0 ? (
        <div className="mt-5 rounded-[14px] border border-dashed border-border/70 bg-surface-body/70 px-4 py-5 text-[13px] text-muted-foreground">
          {emptyCopy}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={href}
              className="group block rounded-[18px] transition-transform duration-150 hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-3 rounded-[18px] border border-border/60 bg-background px-4 py-3.5">
                <span className="mt-[7px] inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[hsl(var(--secondary-border))]" />
                <div className="min-w-0 flex-1 pt-px">
                  <div className="text-[13.5px] font-medium leading-5 text-foreground">
                    {item.title}
                  </div>
                  {item.detail ? (
                    <div className="mt-1 text-[12.5px] text-muted-foreground">
                      {item.detail}
                    </div>
                  ) : null}
                </div>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-foreground/65 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function SundaySnapshotCard({
  data,
}: {
  data: SacramentHomeData;
}) {
  const speakerConfirmed = data.speakers.filter(
    (speaker) => speaker.status === "confirmed"
  ).length;
  const speakerMissing = countPeopleByStatus(data.speakers, "missing");
  const speakerPending = countPeopleByStatus(data.speakers, "pending");
  const prayerConfirmed = data.prayers.filter(
    (prayer) => prayer.status === "confirmed"
  ).length;
  const prayerMissing = countPeopleByStatus(data.prayers, "missing");
  const prayerPending = countPeopleByStatus(data.prayers, "pending");
  const hymnMissing = data.hymns.filter((hymn) => hymn.status === "unchosen").length;
  const leadershipMissing = countMissingLeadership(data);
  const readiness = readinessStats(data);

  return (
    <section className="overview-card sm:px-6 sm:py-6">
      <PanelHeader
        label="Overview"
        labelClassName="!font-sans text-[14px] font-medium normal-case tracking-normal text-foreground"
        action={<TonePill tone="secondary">{readiness.percent}% ready</TonePill>}
      />

      <div className="mt-5 space-y-3">
        <SnapshotRow
          label="Leadership"
          value={
            data.programApplicable
              ? `${countAssignedLeadership(data)}/2 set`
              : "Not needed"
          }
          tone={data.programApplicable ? metricTone(leadershipMissing) : "muted"}
          href={data.plannerHref}
        />
        <SnapshotRow
          label="Speakers"
          value={
            data.programApplicable
              ? `${speakerConfirmed}/${data.speakers.length} confirmed`
              : "Not needed"
          }
          tone={data.programApplicable ? metricTone(speakerMissing, speakerPending) : "muted"}
          href="/meetings/sacrament/speakers"
        />
        <SnapshotRow
          label="Prayers"
          value={
            data.programApplicable
              ? `${prayerConfirmed}/${data.prayers.length} confirmed`
              : "Not needed"
          }
          tone={data.programApplicable ? metricTone(prayerMissing, prayerPending) : "muted"}
          href={data.plannerHref}
        />
        <SnapshotRow
          label="Hymns"
          value={
            data.programApplicable
              ? `${countChosenHymns(data)}/${data.hymns.length} chosen`
              : "Not needed"
          }
          tone={data.programApplicable ? metricTone(hymnMissing) : "muted"}
          href={data.plannerHref}
        />
        <SnapshotRow
          label="Business"
          value={data.businessCount > 0 ? `${pluralize(data.businessCount, "item")}` : "Clear"}
          tone={data.businessCount > 0 ? "muted" : "ok"}
          href="/meetings/sacrament/business"
        />
        <SnapshotRow
          label="Announcements"
          value={
            data.announcementCount > 0
              ? `${pluralize(data.announcementCount, "item")}`
              : "Clear"
          }
          tone={data.announcementCount > 0 ? "muted" : "ok"}
          href="/meetings/sacrament/announcements"
        />
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const [{ profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ]);

  const dataPromise = fetchSacramentHomeData(supabase, profile.workspace_id);
  const data = await dataPromise;
  const updatedLabel = formatRelativeTimestamp(data.updatedAt);
  const attentionCount = attentionPoints(data);

  const speakerConfirmed = data.speakers.filter(
    (speaker) => speaker.status === "confirmed"
  ).length;
  const speakerMissing = countPeopleByStatus(data.speakers, "missing");

  const prayerConfirmed = data.prayers.filter(
    (prayer) => prayer.status === "confirmed"
  ).length;
  const prayerMissing = countPeopleByStatus(data.prayers, "missing");

  const hymnsChosen = countChosenHymns(data);
  const hymnsMissing = data.hymns.filter((hymn) => hymn.status === "unchosen").length;
  const firstName = profile.full_name?.trim().split(/\s+/)[0] ?? "there";

  return (
    <div className="h-full w-full overflow-y-auto bg-surface-canvas text-foreground">
      <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="px-1 py-2 sm:px-2">
          <div className="flex flex-col gap-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {formatHeaderDate()}
            </div>
            <h1 className="font-serif text-[18px] leading-[1.08] tracking-[-0.01em] text-muted-foreground sm:text-[22px] lg:text-[26px]">
              {getGreeting()},{" "}
              <span className="text-foreground">
                <em>{firstName}</em>
              </span>
              .
            </h1>
            <p className="max-w-3xl text-[12.5px] leading-5 text-muted-foreground/75 sm:text-[13px]">
              Sunday readiness at a glance.
            </p>
          </div>
        </section>

        <section className={cn(PANEL_BASE, "px-4 py-4 sm:px-5 sm:py-5")}>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Coming up next
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h1 className="font-serif text-3xl leading-[1.1] tracking-tight text-foreground md:text-[34px]">
                    {data.meetingTitle}
                  </h1>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <TonePill tone={attentionCount > 0 ? "primary" : "ok"}>
                    {attentionCount > 0
                      ? `${pluralize(attentionCount, "attention point")}`
                      : "Everything covered"}
                  </TonePill>
                  <TonePill tone="muted">{relativeDayLabel(data.meetingDate)}</TonePill>
                  {updatedLabel ? <TonePill tone="muted">{updatedLabel}</TonePill> : null}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild className="h-10 rounded-full px-4 text-[13px] font-medium">
                  <Link href={data.plannerHref}>
                    Open planner
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <AssignmentSummaryCard
          speakerConfirmed={speakerConfirmed}
          speakerTotal={data.speakers.length}
          speakerMissing={speakerMissing}
          prayerConfirmed={prayerConfirmed}
          prayerTotal={data.prayers.length}
          prayerMissing={prayerMissing}
          hymnsChosen={hymnsChosen}
          hymnsTotal={data.hymns.length}
          hymnsMissing={hymnsMissing}
          programApplicable={data.programApplicable}
          plannerHref={data.plannerHref}
        />

        <div className="grid gap-4 xl:grid-cols-3">
          <SundaySnapshotCard data={data} />
          <QueueCard
            label="Business"
            href="/meetings/sacrament/business"
            items={data.businessItems}
            count={data.businessCount}
            emptyCopy="No business items are queued for this Sunday."
          />
          <QueueCard
            label="Announcements"
            href="/meetings/sacrament/announcements"
            items={data.announcements}
            count={data.announcementCount}
            emptyCopy="No announcements are waiting for Sunday."
          />
        </div>
      </main>
    </div>
  );
}
