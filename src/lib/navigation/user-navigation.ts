import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  FavoriteEntityType,
  NavigationFavoriteItem,
  NavigationItem,
  NavigationItemInput,
  NavigationRecentItem,
  UserNavigationItems,
} from "@/lib/navigation/types";

type NavigationDbClient = SupabaseClient<Database>;

type UserNavigationContext = {
  userId: string;
  workspaceId: string;
};

type SavedFavoriteRow = Database["public"]["Tables"]["user_favorites"]["Row"];
type SavedRecentRow = Database["public"]["Tables"]["user_recent_items"]["Row"];

const NAVIGATION_ICON_BY_TYPE: Record<FavoriteEntityType, FavoriteEntityType> = {
  meeting: "meeting",
  table: "table",
  form: "form",
  discussion: "discussion",
  notebook: "notebook",
  note: "note",
};

async function getCurrentNavigationContext(
  supabase: NavigationDbClient
): Promise<UserNavigationContext | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await (supabase.from("profiles") as any)
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return null;
  }

  return {
    userId: user.id,
    workspaceId: profile.workspace_id,
  };
}

function hydrateNavigationItem(
  row: Pick<SavedFavoriteRow, "entity_id" | "entity_type" | "title" | "href" | "parent_title">
): NavigationItem {
  const entityType = row.entity_type as FavoriteEntityType;

  return {
    id: row.entity_id,
    entityType,
    title: row.title,
    href: row.href,
    icon: NAVIGATION_ICON_BY_TYPE[entityType],
    parentTitle: row.parent_title,
  };
}

async function getValidEntityIds(
  supabase: NavigationDbClient,
  workspaceId: string,
  rows: Array<Pick<SavedFavoriteRow, "entity_id" | "entity_type">>
): Promise<Map<FavoriteEntityType, Set<string>>> {
  const idsByType = rows.reduce((acc, row) => {
    const entityType = row.entity_type as FavoriteEntityType;
    acc[entityType].push(row.entity_id);
    return acc;
  }, {
    meeting: [] as string[],
    table: [] as string[],
    form: [] as string[],
    discussion: [] as string[],
    notebook: [] as string[],
    note: [] as string[],
  });

  const validIds = new Map<FavoriteEntityType, Set<string>>();

  const loadIds = async (
    entityType: FavoriteEntityType,
    table: string,
    titleColumn: string = "id"
  ) => {
    const ids = idsByType[entityType];
    if (ids.length === 0) {
      validIds.set(entityType, new Set());
      return;
    }

    const { data } = await (supabase.from(table as any) as any)
      .select(titleColumn)
      .eq("workspace_id", workspaceId)
      .in("id", ids);

    validIds.set(
      entityType,
      new Set(((data ?? []) as Array<{ id: string }>).map((item) => item.id))
    );
  };

  await Promise.all([
    loadIds("meeting", "meetings"),
    loadIds("table", "dynamic_tables"),
    loadIds("form", "forms"),
    loadIds("discussion", "discussions"),
    loadIds("notebook", "notebooks"),
    loadIds("note", "notes"),
  ]);

  return validIds;
}

async function resolveCanonicalNavigationItem(
  supabase: NavigationDbClient,
  workspaceId: string,
  item: NavigationItemInput
): Promise<NavigationItem | null> {
  switch (item.entityType) {
    case "meeting": {
      const { data } = await (supabase.from("meetings") as any)
        .select("id, title")
        .eq("id", item.id)
        .eq("workspace_id", workspaceId)
        .single();

      if (!data) return null;

      return {
        id: data.id,
        entityType: "meeting",
        title: data.title,
        href: `/meetings/${data.id}`,
        icon: "meeting",
        parentTitle: null,
      };
    }

    case "table": {
      const { data } = await (supabase.from("dynamic_tables") as any)
        .select("id, name")
        .eq("id", item.id)
        .eq("workspace_id", workspaceId)
        .single();

      if (!data) return null;

      return {
        id: data.id,
        entityType: "table",
        title: data.name,
        href: `/tables/${data.id}`,
        icon: "table",
        parentTitle: null,
      };
    }

    case "form": {
      const { data } = await (supabase.from("forms") as any)
        .select("id, title")
        .eq("id", item.id)
        .eq("workspace_id", workspaceId)
        .single();

      if (!data) return null;

      return {
        id: data.id,
        entityType: "form",
        title: data.title,
        href: `/forms/${data.id}`,
        icon: "form",
        parentTitle: null,
      };
    }

    case "discussion": {
      const { data } = await (supabase.from("discussions") as any)
        .select("id, title")
        .eq("id", item.id)
        .eq("workspace_id", workspaceId)
        .single();

      if (!data) return null;

      return {
        id: data.id,
        entityType: "discussion",
        title: data.title,
        href: `/meetings/discussions/${data.id}`,
        icon: "discussion",
        parentTitle: null,
      };
    }

    case "notebook": {
      const { data } = await (supabase.from("notebooks") as any)
        .select("id, title")
        .eq("id", item.id)
        .eq("workspace_id", workspaceId)
        .single();

      if (!data) return null;

      return {
        id: data.id,
        entityType: "notebook",
        title: data.title,
        href: `/notebooks/${data.id}`,
        icon: "notebook",
        parentTitle: null,
      };
    }

    case "note": {
      const { data } = await (supabase.from("notes") as any)
        .select("id, title, notebook_id")
        .eq("id", item.id)
        .eq("workspace_id", workspaceId)
        .single();

      if (!data) return null;

      let parentTitle: string | null = null;
      if (data.notebook_id) {
        const { data: notebook } = await (supabase.from("notebooks") as any)
          .select("id, title")
          .eq("id", data.notebook_id)
          .eq("workspace_id", workspaceId)
          .single();

        parentTitle = notebook?.title ?? null;
      }

      return {
        id: data.id,
        entityType: "note",
        title: data.title || "Untitled Note",
        href: data.notebook_id
          ? `/notebooks/${data.notebook_id}/notes/${data.id}`
          : item.href || `/notebooks`,
        icon: "note",
        parentTitle,
      };
    }
  }
}

export const getUserNavigationItems = cache(async (): Promise<UserNavigationItems> => {
  const supabase = await createClient();
  const context = await getCurrentNavigationContext(supabase);

  if (!context) {
    return {
      favorites: [],
      recents: [],
    };
  }

  const [favoritesResult, recentsResult] = await Promise.all([
    (supabase.from("user_favorites") as any)
      .select("*")
      .eq("user_id", context.userId)
      .eq("workspace_id", context.workspaceId)
      .order("position", { ascending: true })
      .order("updated_at", { ascending: false }),
    (supabase.from("user_recent_items") as any)
      .select("*")
      .eq("user_id", context.userId)
      .eq("workspace_id", context.workspaceId)
      .order("last_viewed_at", { ascending: false }),
  ]);

  const favoritesRows = (favoritesResult.data ?? []) as SavedFavoriteRow[];
  const recentRows = (recentsResult.data ?? []) as SavedRecentRow[];
  const validIds = await getValidEntityIds(supabase, context.workspaceId, [
    ...favoritesRows,
    ...recentRows,
  ]);

  const favorites: NavigationFavoriteItem[] = favoritesRows
    .filter((row) => validIds.get(row.entity_type as FavoriteEntityType)?.has(row.entity_id))
    .map((row) => ({
      ...hydrateNavigationItem(row),
      position: row.position,
    }));

  const recents: NavigationRecentItem[] = recentRows
    .filter((row) => validIds.get(row.entity_type as FavoriteEntityType)?.has(row.entity_id))
    .map((row) => ({
      ...hydrateNavigationItem(row),
      lastViewedAt: row.last_viewed_at,
    }));

  return { favorites, recents };
});

export async function isUserFavorite(
  entityType: FavoriteEntityType,
  entityId: string
): Promise<boolean> {
  const supabase = await createClient();
  const context = await getCurrentNavigationContext(supabase);

  if (!context) {
    return false;
  }

  const { data } = await (supabase.from("user_favorites") as any)
    .select("entity_id")
    .eq("user_id", context.userId)
    .eq("workspace_id", context.workspaceId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();

  return Boolean(data);
}

export async function toggleFavoriteForCurrentUser(item: NavigationItemInput) {
  const supabase = await createClient();
  const context = await getCurrentNavigationContext(supabase);

  if (!context) {
    return { error: "Unauthorized" as const };
  }

  const canonicalItem = await resolveCanonicalNavigationItem(
    supabase,
    context.workspaceId,
    item
  );

  if (!canonicalItem) {
    return { error: "Item not found" as const };
  }

  const { data: existing } = await (supabase.from("user_favorites") as any)
    .select("entity_id")
    .eq("user_id", context.userId)
    .eq("workspace_id", context.workspaceId)
    .eq("entity_type", canonicalItem.entityType)
    .eq("entity_id", canonicalItem.id)
    .maybeSingle();

  if (existing) {
    const { error } = await (supabase.from("user_favorites") as any)
      .delete()
      .eq("user_id", context.userId)
      .eq("workspace_id", context.workspaceId)
      .eq("entity_type", canonicalItem.entityType)
      .eq("entity_id", canonicalItem.id);

    if (error) {
      return { error: error.message as const };
    }

    return {
      favorited: false,
      item: canonicalItem,
    };
  }

  const { data: lastFavorite } = await (supabase.from("user_favorites") as any)
    .select("position")
    .eq("user_id", context.userId)
    .eq("workspace_id", context.workspaceId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await (supabase.from("user_favorites") as any).insert({
    user_id: context.userId,
    entity_type: canonicalItem.entityType,
    entity_id: canonicalItem.id,
    workspace_id: context.workspaceId,
    title: canonicalItem.title,
    href: canonicalItem.href,
    parent_title: canonicalItem.parentTitle,
    position: (lastFavorite?.position ?? -1) + 1,
  });

  if (error) {
    return { error: error.message as const };
  }

  return {
    favorited: true,
    item: canonicalItem,
  };
}

export async function removeFavoriteForCurrentUser(
  entityType: FavoriteEntityType,
  entityId: string
) {
  const supabase = await createClient();
  const context = await getCurrentNavigationContext(supabase);

  if (!context) {
    return { error: "Unauthorized" as const };
  }

  const { error } = await (supabase.from("user_favorites") as any)
    .delete()
    .eq("user_id", context.userId)
    .eq("workspace_id", context.workspaceId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  if (error) {
    return { error: error.message as const };
  }

  return { success: true as const };
}

export async function recordRecentVisitForCurrentUser(item: NavigationItemInput) {
  const supabase = await createClient();
  const context = await getCurrentNavigationContext(supabase);

  if (!context) {
    return { error: "Unauthorized" as const };
  }

  const canonicalItem = await resolveCanonicalNavigationItem(
    supabase,
    context.workspaceId,
    item
  );

  if (!canonicalItem) {
    return { error: "Item not found" as const };
  }

  const lastViewedAt = new Date().toISOString();

  const { error: upsertRecentError } = await (supabase.from("user_recent_items") as any)
    .upsert(
      {
        user_id: context.userId,
        entity_type: canonicalItem.entityType,
        entity_id: canonicalItem.id,
        workspace_id: context.workspaceId,
        title: canonicalItem.title,
        href: canonicalItem.href,
        parent_title: canonicalItem.parentTitle,
        last_viewed_at: lastViewedAt,
      },
      { onConflict: "user_id,entity_type,entity_id" }
    );

  if (upsertRecentError) {
    return { error: upsertRecentError.message as const };
  }

  await (supabase.from("user_favorites") as any)
    .update({
      title: canonicalItem.title,
      href: canonicalItem.href,
      parent_title: canonicalItem.parentTitle,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", context.userId)
    .eq("workspace_id", context.workspaceId)
    .eq("entity_type", canonicalItem.entityType)
    .eq("entity_id", canonicalItem.id);

  const { data: staleRows } = await (supabase.from("user_recent_items") as any)
    .select("entity_type, entity_id")
    .eq("user_id", context.userId)
    .eq("workspace_id", context.workspaceId)
    .order("last_viewed_at", { ascending: false })
    .range(8, 100);

  if (staleRows && staleRows.length > 0) {
    const clauses = (staleRows as Array<{ entity_type: string; entity_id: string }>)
      .map((row) => `and(entity_type.eq.${row.entity_type},entity_id.eq.${row.entity_id})`)
      .join(",");

    await (supabase.from("user_recent_items") as any)
      .delete()
      .eq("user_id", context.userId)
      .eq("workspace_id", context.workspaceId)
      .or(clauses);
  }

  return {
    item: canonicalItem,
    lastViewedAt,
  };
}

export async function removeRecentForCurrentUser(
  entityType: FavoriteEntityType,
  entityId: string
) {
  const supabase = await createClient();
  const context = await getCurrentNavigationContext(supabase);

  if (!context) {
    return { error: "Unauthorized" as const };
  }

  const { error } = await (supabase.from("user_recent_items") as any)
    .delete()
    .eq("user_id", context.userId)
    .eq("workspace_id", context.workspaceId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  if (error) {
    return { error: error.message as const };
  }

  return { success: true as const };
}
