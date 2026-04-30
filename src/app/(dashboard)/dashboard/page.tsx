import type { ElementType, ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Hand,
  Megaphone,
  UserRoundCheck,
} from "lucide-react";

import { getDashboardRequestContext } from "@/lib/dashboard/request-context";
import {
  fetchSacramentHomeData,
  type HomeReadinessItem,
  type HomeReadinessPerson,
} from "@/lib/dashboard/home-data-fetchers";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

function formatMeetingDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

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

function daysUntilMeeting(isoDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const meetingDate = new Date(`${isoDate}T12:00:00`);
  meetingDate.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((meetingDate.getTime() - today.getTime()) / 86400000));
}

function readinessPercent(data: {
  assignedRequiredCount: number;
  totalRequiredCount: number;
}) {
  if (data.totalRequiredCount === 0) return 100;
  return Math.round((data.assignedRequiredCount / data.totalRequiredCount) * 100);
}

function openItemLabel(total: number, assigned: number) {
  const remaining = Math.max(0, total - assigned);
  if (total === 0) return "No local assignments";
  if (remaining === 0) return "All assigned";
  return `${remaining} still open`;
}

function HeaderAction({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
    >
      Open Sunday agenda
      <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function ReadinessChip({
  href,
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  href: string;
  icon: ElementType;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-7 items-center gap-2 rounded-full border px-3 text-[12px] font-semibold transition-colors",
        accent
          ? "border-[hsl(var(--cp-warning)/0.3)] bg-[hsl(var(--cp-warning)/0.1)] text-[hsl(var(--cp-warning))]"
          : "border-border bg-background/40 text-muted-foreground hover:border-border/80 hover:text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
      <span className="font-mono opacity-70">{value}</span>
    </Link>
  );
}

function statusDotClass(status: HomeReadinessPerson["status"]) {
  if (status === "confirmed") return "bg-emerald-500";
  if (status === "pending") return "bg-[hsl(var(--cp-warning))]";
  return "bg-muted-foreground/40";
}

function statusLabel(status: HomeReadinessPerson["status"]) {
  if (status === "missing") return "needed";
  return status;
}

function HomeHeader({
  displayName,
  readiness,
}: {
  displayName: string;
  readiness: Awaited<ReturnType<typeof fetchSacramentHomeData>>;
}) {
  const percent = readinessPercent(readiness);
  const dayCount = daysUntilMeeting(readiness.meetingDate);
  const speakersAssigned = readiness.speakers.filter((speaker) => speaker.name).length;
  const prayersAssigned = readiness.prayers.filter((prayer) => prayer.name).length;
  const meetingMeta = [
    formatMeetingDate(readiness.meetingDate),
    readiness.presidingName ? `Presiding ${readiness.presidingName}` : null,
    readiness.conductingName ? `Conducting ${readiness.conductingName}` : null,
  ].filter(Boolean);

  return (
    <header className="flex flex-col gap-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {formatHeaderDate()}
          </div>
          <h1 className="font-serif text-4xl font-normal leading-[1.05] tracking-tight text-foreground md:text-[44px]">
            {getGreeting()},{" "}
            <span className="italic text-brand">{displayName}.</span>
          </h1>
          <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-muted-foreground">
            Here&apos;s how the ward is shaping up for the week ahead.
          </p>
        </div>

        <HeaderAction href={readiness.plannerHref} />
      </div>

      <section
        className="relative overflow-hidden rounded-2xl border border-border/80 px-8 py-8 sm:px-10 sm:py-10"
        style={{
          backgroundImage:
            "radial-gradient(900px 320px at 100% 0%, hsl(var(--brand) / 0.18), transparent 60%), linear-gradient(180deg, hsl(var(--surface-raised)), hsl(var(--surface-base)))",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 items-center rounded-full border border-brand/30 bg-brand/10 px-2.5 text-[11px] font-medium text-brand">
                Next sacrament
              </span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                In {dayCount} {dayCount === 1 ? "day" : "days"}
              </span>
            </div>

            <h2 className="mt-5 font-serif text-[40px] font-normal leading-[1.02] tracking-tight text-foreground md:text-[52px]">
              Ready for <span className="italic">Sunday</span>.
            </h2>
            <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
              {meetingMeta.join(" · ") || readiness.meetingType}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <ReadinessChip
                href="/meetings/sacrament/speakers"
                icon={UserRoundCheck}
                label="Speakers"
                value={`${speakersAssigned}/${readiness.speakers.length}`}
                accent={readiness.speakers.some((speaker) => speaker.status !== "confirmed")}
              />
              <ReadinessChip
                href={readiness.plannerHref}
                icon={Hand}
                label="Prayers"
                value={`${prayersAssigned}/${readiness.prayers.length}`}
                accent={readiness.prayers.some((prayer) => prayer.status !== "confirmed")}
              />
              <ReadinessChip
                href="/meetings/sacrament/business"
                icon={BriefcaseBusiness}
                label="Business"
                value={`${readiness.businessCount}`}
              />
              <ReadinessChip
                href="/meetings/sacrament/announcements"
                icon={Megaphone}
                label="Announcements"
                value={`${readiness.announcementCount}`}
              />
            </div>
          </div>

          <div className="flex items-center justify-center lg:justify-end">
            <div
              className="grid h-[164px] w-[164px] place-items-center rounded-full"
              style={{
                background: `conic-gradient(hsl(var(--brand)) ${percent * 3.6}deg, hsl(var(--border)) 0deg)`,
              }}
            >
              <div className="grid h-[132px] w-[132px] place-items-center rounded-full bg-surface-base text-center shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.04)]">
                <div>
                  <div className="font-serif text-[34px] leading-none text-foreground">
                    {percent}%
                  </div>
                  <div className="mt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Readiness
                  </div>
                  <div className="mt-2 text-[12px] text-muted-foreground">
                    {openItemLabel(
                      readiness.totalRequiredCount,
                      readiness.assignedRequiredCount
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </header>
  );
}
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </div>
  );
}

function ProgramSection({
  speakers,
  prayers,
  speakerHref,
  prayerHref,
}: {
  speakers: HomeReadinessPerson[];
  prayers: HomeReadinessPerson[];
  speakerHref: string;
  prayerHref: string;
}) {
  const people = [...speakers, ...prayers];

  return (
    <section className="rounded-xl border border-border/70 bg-surface-raised p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <SectionLabel>On the program</SectionLabel>
          <h3 className="mt-1 font-serif text-xl text-foreground">Speakers & prayers</h3>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={speakerHref}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Speakers <ArrowUpRight className="h-3 w-3" />
          </Link>
          <Link
            href={prayerHref}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Prayers <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {people.length > 0 ? (
        <ul className="mt-5 divide-y divide-border/60">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-3 py-3">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", statusDotClass(person.status))} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-foreground">
                  {person.name || (
                    <span className="italic text-muted-foreground">Not assigned</span>
                  )}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {person.role}
                  {person.detail ? <> · {person.detail}</> : null}
                </div>
              </div>
              <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                {statusLabel(person.status)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-lg border border-border/60 bg-background/30 px-4 py-8 text-center text-[12.5px] text-muted-foreground">
          No local speaker or prayer assignments required.
        </div>
      )}
    </section>
  );
}

function PreviewSection({
  href,
  eyebrow,
  title,
  items,
  empty,
  hideDetail,
  maxVisibleItems = 3,
  totalCount,
}: {
  href: string;
  eyebrow: string;
  title: string;
  items: HomeReadinessItem[];
  empty: string;
  hideDetail?: boolean;
  maxVisibleItems?: number;
  totalCount?: number;
}) {
  const visibleItems = items.slice(0, maxVisibleItems);
  const remainingCount = Math.max(0, (totalCount ?? items.length) - visibleItems.length);

  return (
    <Link
      href={href}
      className="group rounded-xl border border-border/70 bg-surface-raised p-6 transition-colors hover:bg-surface-hover"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <SectionLabel>{eyebrow}</SectionLabel>
          <h3 className="mt-1 font-serif text-xl text-foreground">{title}</h3>
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
      </div>
      <ul className="mt-4 space-y-2">
        {items.length === 0 ? (
          <li className="text-[12.5px] italic text-muted-foreground">{empty}</li>
        ) : (
          <>
            {visibleItems.map((item) => (
              <li key={item.id} className="flex items-start gap-2.5 text-[12.5px] text-foreground/90">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand" />
                <span className="min-w-0">
                  <span>{item.title}</span>
                  {!hideDetail && item.detail ? (
                    <span className="text-muted-foreground"> · {item.detail}</span>
                  ) : null}
                </span>
              </li>
            ))}
            {remainingCount > 0 ? (
              <li className="pl-3.5 text-[12.5px] font-medium text-muted-foreground">
                + {remainingCount} more
              </li>
            ) : null}
          </>
        )}
      </ul>
    </Link>
  );
}

export default async function DashboardPage() {
  const [{ profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ]);

  const readiness = await fetchSacramentHomeData(supabase, profile.workspace_id);
  const role = (profile as { role?: string | null }).role?.toLowerCase() ?? "";
  const firstName = profile.full_name?.split(" ")[0] ?? "Bishop";
  const displayName = role.includes("bishop") ? "Bishop" : firstName;

  return (
    <div className="h-full w-full overflow-y-auto bg-surface-canvas text-foreground">
      <main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-8 py-10 lg:px-12">
        <HomeHeader displayName={displayName} readiness={readiness} />

        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <ProgramSection
            speakers={readiness.speakers}
            prayers={readiness.prayers}
            speakerHref="/meetings/sacrament/speakers"
            prayerHref={readiness.plannerHref}
          />
          <section className="grid grid-rows-2 gap-3">
            <PreviewSection
              href="/meetings/sacrament/business"
              eyebrow="Ward business"
              title="To present"
              items={readiness.businessItems}
              empty="No business this week."
              hideDetail
              maxVisibleItems={5}
              totalCount={readiness.businessCount}
            />
            <PreviewSection
              href="/meetings/sacrament/announcements"
              eyebrow="Announcements"
              title="To read"
              items={readiness.announcements}
              empty="Nothing to announce."
              hideDetail
              maxVisibleItems={5}
              totalCount={readiness.announcementCount}
            />
          </section>
        </section>
      </main>
    </div>
  );
}
