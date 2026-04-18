import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicTemplateDetail } from "@/components/templates/public/public-template-detail";

import {
  fetchPublicTemplateBySlug,
  fetchPublicTemplates,
  fetchPublicTemplateSlugs,
} from "@/lib/templates/fetch-public-templates";

interface TemplateDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TemplateDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const template = await fetchPublicTemplateBySlug(slug);

  if (!template) {
    return {
      title: "Template Not Found | Beespo",
      robots: { index: false, follow: false },
    };
  }

  const description =
    template.description ||
    "Preview this Beespo official meeting template and import it into your workspace.";
  const canonical = `https://beespo.com/templates/${template.slug}`;

  return {
    title: `${template.name} Template | Beespo`,
    description,
    openGraph: {
      title: `${template.name} Template | Beespo`,
      description,
      type: "article",
      url: canonical,
    },
    alternates: {
      canonical,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export async function generateStaticParams() {
  const slugs = await fetchPublicTemplateSlugs();
  return slugs.map((slug) => ({ slug }));
}

export const revalidate = 3600;

export default async function PublicTemplateDetailPage({ params }: TemplateDetailPageProps) {
  const { slug } = await params;
  const template = await fetchPublicTemplateBySlug(slug);

  if (!template) {
    notFound();
  }

  const relatedTemplates = (await fetchPublicTemplates())
    .filter(
      (candidate) =>
        candidate.slug !== template.slug &&
        candidate.templateKind === template.templateKind
    )
    .slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: template.name,
    description:
      template.description ||
      "Preview this Beespo official meeting template and import it into your workspace.",
    totalTime:
      template.estimatedDurationMinutes > 0
        ? `PT${template.estimatedDurationMinutes}M`
        : undefined,
    step: template.items.map((item, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: item.title,
      text: item.description || undefined,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicTemplateDetail template={template} relatedTemplates={relatedTemplates} />
    </>
  );
}
