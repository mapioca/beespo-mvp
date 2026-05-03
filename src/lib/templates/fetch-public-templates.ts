import { unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";

export type PublicTemplateKind = "agenda" | "program" | "event" | "table" | "form" | null;

interface TemplateItemRow {
  id: string;
  title: string;
  description: string | null;
  item_type: string;
  order_index: number;
  duration_minutes: number | null;
}

interface TemplateRow {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  template_kind: PublicTemplateKind;
  tags: string[];
  items?: TemplateItemRow[];
}

export interface PublicTemplateListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  templateKind: PublicTemplateKind;
  tags: string[];
  itemCount: number;
  estimatedDurationMinutes: number;
}

export interface PublicTemplateDetailItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  templateKind: PublicTemplateKind;
  tags: string[];
  itemCount: number;
  estimatedDurationMinutes: number;
  items: {
    id: string;
    title: string;
    description: string | null;
    itemType: string;
    orderIndex: number;
    durationMinutes: number | null;
  }[];
}

const mapListItem = (template: TemplateRow & { slug: string }): PublicTemplateListItem => {
  const items = template.items ?? [];
  return {
    id: template.id,
    slug: template.slug,
    name: template.name,
    description: template.description,
    templateKind: template.template_kind,
    tags: template.tags ?? [],
    itemCount: items.length,
    estimatedDurationMinutes: items.reduce((sum, item) => sum + (item.duration_minutes ?? 0), 0),
  };
};

const mapDetailItem = (template: TemplateRow & { slug: string }): PublicTemplateDetailItem => {
  const listItem = mapListItem(template);
  return {
    ...listItem,
    items: (template.items ?? [])
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        itemType: item.item_type,
        orderIndex: item.order_index,
        durationMinutes: item.duration_minutes,
      })),
  };
};

const fetchPublicTemplatesCached = unstable_cache(
  async (): Promise<PublicTemplateListItem[]> => {
    const supabase = createAdminClient();

    const { data, error } = await (supabase.from("templates") as ReturnType<typeof supabase.from>)
      .select("id, slug, name, description, template_kind, tags, items:template_items(id, title, description, item_type, order_index, duration_minutes)")
      .is("workspace_id", null)
      .eq("is_active", true)
      .not("slug", "is", null)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to load public templates:", error.message);
      return [];
    }

    return ((data ?? []) as TemplateRow[])
      .filter((template): template is TemplateRow & { slug: string } => Boolean(template.slug))
      .map(mapListItem);
  },
  ["public-template-gallery"],
  { revalidate: 3600 }
);

const fetchPublicTemplateBySlugCached = unstable_cache(
  async (slug: string): Promise<PublicTemplateDetailItem | null> => {
    const supabase = createAdminClient();

    const { data, error } = await (supabase.from("templates") as ReturnType<typeof supabase.from>)
      .select("id, slug, name, description, template_kind, tags, items:template_items(id, title, description, item_type, order_index, duration_minutes)")
      .eq("slug", slug)
      .is("workspace_id", null)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return null;
    }

    const template = data as TemplateRow;
    if (!template.slug) {
      return null;
    }

    return mapDetailItem(template as TemplateRow & { slug: string });
  },
  ["public-template-by-slug"],
  { revalidate: 3600 }
);

const fetchPublicTemplateSlugsCached = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = createAdminClient();

    const { data, error } = await (supabase.from("templates") as ReturnType<typeof supabase.from>)
      .select("slug")
      .is("workspace_id", null)
      .eq("is_active", true)
      .not("slug", "is", null)
      .limit(200);

    if (error) {
      console.error("Failed to load public template slugs:", error.message);
      return [];
    }

    return ((data ?? []) as { slug: string | null }[])
      .filter((row): row is { slug: string } => Boolean(row.slug))
      .map((row) => row.slug);
  },
  ["public-template-slugs"],
  { revalidate: 3600 }
);

export async function fetchPublicTemplates(): Promise<PublicTemplateListItem[]> {
  return fetchPublicTemplatesCached();
}

export async function fetchPublicTemplateBySlug(slug: string): Promise<PublicTemplateDetailItem | null> {
  return fetchPublicTemplateBySlugCached(slug);
}

export async function fetchPublicTemplateSlugs(): Promise<string[]> {
  return fetchPublicTemplateSlugsCached();
}
