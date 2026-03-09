import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { TemplateAgendaPreview } from "@/components/templates/template-agenda-preview";
import { UseTemplateButton } from "@/components/public/template-gallery/use-template-button";
import { GalleryTemplate } from "@/components/public/template-gallery/types";
import { Database } from "@/types/database";

type TemplateItem = Database["public"]["Tables"]["template_items"]["Row"];

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const supabase = await createClient();
  const { data } = await (supabase.from("templates") as ReturnType<typeof supabase.from>)
    .select("slug")
    .is("workspace_id", null)
    .not("slug", "is", null);

  return (data ?? []).map((t: { slug: string }) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: template } = await (supabase.from("templates") as ReturnType<typeof supabase.from>)
    .select("name, description, calling_type")
    .is("workspace_id", null)
    .eq("slug", slug)
    .single();

  if (!template) {
    return { title: "Template Not Found | Beespo" };
  }

  const title = `${template.name} Meeting Template | Beespo`;
  const description =
    template.description ??
    `A free ${template.calling_type ?? "meeting"} agenda template for church leaders.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
    robots: { index: true, follow: true },
  };
}

export default async function TemplateDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: template } = await (supabase.from("templates") as ReturnType<typeof supabase.from>)
    .select("*, items:template_items(*)")
    .is("workspace_id", null)
    .eq("slug", slug)
    .single();

  if (!template) notFound();

  const t = template as GalleryTemplate;
  const items = (t.items ?? []) as TemplateItem[];
  const sortedItems = [...items].sort((a, b) => a.order_index - b.order_index);
  const totalDuration = items.reduce((acc, i) => acc + (i.duration_minutes ?? 0), 0);
  const tags = (t.tags as string[] | null) ?? [];

  // JSON-LD HowTo schema
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: t.name,
    description: t.description ?? undefined,
    ...(totalDuration > 0 ? { totalTime: `PT${totalDuration}M` } : {}),
    step: sortedItems.map((item, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: item.title,
      ...(item.description ? { text: item.description } : {}),
    })),
  };

  return (
    <div className="container mx-auto px-4 py-10">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

      {/* Back link */}
      <Link
        href="/template-gallery"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        All templates
      </Link>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left: Agenda preview */}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight mb-6">{t.name}</h1>
          <div className="rounded-xl border bg-card p-6">
            <TemplateAgendaPreview items={sortedItems} />
          </div>
        </div>

        {/* Right: Metadata sidebar */}
        <aside className="lg:w-72 shrink-0 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border bg-card p-6 space-y-5">
            {t.description && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Description
                </p>
                <p className="text-sm leading-relaxed">{t.description}</p>
              </div>
            )}

            {t.calling_type && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Organization
                </p>
                <p className="text-sm">{t.calling_type}</p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Overview
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </span>
                {totalDuration > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {totalDuration} min
                  </span>
                )}
              </div>
            </div>

            {tags.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <UseTemplateButton
              templateId={t.id}
              templateSlug={t.slug}
              userId={user?.id ?? null}
              className="w-full mt-2"
            />

            <p className="text-[11px] text-muted-foreground/60 text-center leading-snug">
              {user
                ? "This template will be added to your workspace."
                : "You'll be asked to sign in before importing."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
