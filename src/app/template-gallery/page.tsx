import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { GalleryClient } from "@/components/public/template-gallery/gallery-client";
import { GalleryTemplate } from "@/components/public/template-gallery/types";

export const metadata: Metadata = {
  title: "Free Meeting Agenda Templates | Beespo",
  description:
    "Browse free meeting agenda templates designed for LDS church leaders — Sacrament Meeting, Relief Society, Elders Quorum, and more. Import any template to your Beespo workspace instantly.",
  openGraph: {
    title: "Free Meeting Agenda Templates | Beespo",
    description:
      "Browse free meeting agenda templates for church leaders. Filter by organization, preview agenda structure, and import with one click.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default async function TemplateGalleryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: templates } = await (supabase.from("templates") as ReturnType<typeof supabase.from>)
    .select("*, items:template_items(*)")
    .is("workspace_id", null)
    .order("calling_type", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true });

  const galleryTemplates = (templates ?? []) as GalleryTemplate[];

  // JSON-LD structured data
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Beespo Meeting Agenda Templates",
    description:
      "Free meeting agenda templates for LDS church leaders, created by the Beespo team.",
    itemListElement: galleryTemplates
      .filter((t) => t.slug)
      .map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: t.name,
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://beespo.com"}/template-gallery/${t.slug}`,
      })),
  };

  return (
    <div className="container mx-auto px-4 py-12">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          Meeting Agenda Templates
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Ready-made agendas for every organization. Preview the structure, then
          import to your workspace in one click.
        </p>
      </div>

      <GalleryClient templates={galleryTemplates} userId={user?.id ?? null} />
    </div>
  );
}
