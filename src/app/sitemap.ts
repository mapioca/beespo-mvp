import type { MetadataRoute } from "next";

import { fetchPublicTemplateSlugs } from "@/lib/templates/fetch-public-templates";

const BASE_URL = "https://beespo.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await fetchPublicTemplateSlugs();

  const templateEntries: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${BASE_URL}/templates/${slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    {
      url: `${BASE_URL}/templates`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...templateEntries,
  ];
}
