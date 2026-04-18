import type { Metadata } from "next";

import { PublicGallery } from "@/components/templates/public/public-gallery";
import type { PublicTemplate } from "@/components/templates/public/types";
import { fetchPublicTemplates } from "@/lib/templates/fetch-public-templates";

export const metadata: Metadata = {
  title: "Free Church Meeting Templates | Beespo",
  description:
    "Browse free sacrament meeting agenda templates, program templates, and forms. Preview in seconds and import into Beespo.",
  openGraph: {
    title: "Free Church Meeting Templates | Beespo",
    description:
      "Browse free sacrament meeting agenda templates, program templates, and forms. Preview in seconds and import into Beespo.",
    type: "website",
    url: "https://beespo.com/templates",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://beespo.com/templates",
  },
};

export const revalidate = 3600;

export default async function PublicTemplatesGalleryPage() {
  const templates: PublicTemplate[] = await fetchPublicTemplates();
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Beespo Template Gallery",
    itemListElement: templates.map((template, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: template.name,
      url: `https://beespo.com/templates/${template.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <section className="container mx-auto px-4 py-10 sm:py-12">
        <PublicGallery templates={templates} />
      </section>
    </>
  );
}
