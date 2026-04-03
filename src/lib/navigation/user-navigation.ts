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
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type EntityTableName =
  | "meetings"
  | "dynamic_tables"
  | "forms"
  | "discussions"
  | "notebooks"
  | "notes";
type MeetingSummary = { id: string; title: string };
type TableSummary = { id: string; name: string };
type FormSummary = { id: string; title: string };
type DiscussionSummary = { id: string; title: string };
type NotebookSummary = { id: string; title: string };
type NoteSummary = { id: string; title: string | null; notebook_id: string | null };

const fromTable = (supabase: NavigationDbClient, table: string) =>
  supabase.from(table as never) as ReturnType<typeof supabase.from>;

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

  const { data: profile } = await (supabase
    .from("profiles") as ReturnType<typeof supabase.from>)
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  const profileData = profile as Pick<ProfileRow, "workspace_id"> | null;
  if (!profileData?.workspace_id) {
    return null;
  }

  return {
    userId: user.id,
    workspaceId: profileData.workspace_id,
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
    table: EntityTableName,
    titleColumn: "id" = "id"
  ) => {
    const ids = idsByType[entityType];
    if (ids.length === 0) {
      validIds.set(entityType, new Set());
      return;
    }

    const { data } = await supabase
      .from(table)
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
      const { data } = await (supabase
        .from("meetings") as ReturnType<typeof supabase.from>)
        .select("id, title")
        .eq("id", item.id)
        .eq("workspace_id", workspaceId)
        .single();

      const meeting = data as MeetingSummary | null;
      if (!meeting) return null;

      return {
        id: meeting.id,
        entityType: "meeting",
        title: meeting.title,
        href: `/meetings/${meeting.id}`,
        icon: "meeting",
        parentTitle: null,
      };
    }

    case "table": {
      const { data } = await (supabase
        .from("dynamic_tables") as ReturnType<typeof supabase.from>)
        .select("id, name")
        .eq("id", item.id)
        .eq("workspace_id", workspaceId)
        .single();

      const table = data as TableSummary | null;
      if (!table) return null;

      return {
        id: table.id,
        entityType: "table",
        title: table.name,
        href: `/tables/${table.id}`,
        icon: "table",
        parentTitle: null,
      };
    }

    case "form": {
      const { data } = await (supabase
        .from("forms") as ReturnType<typeof supabase.from>)
        .select("id, title")
        .eq("id", item.id)
        .eq("workspace_id", workspaceId)
        .single();

      const form = data as FormSummary | null;
      if (!form) return null;

      return {
        id: form.id,
        entityType: "form",
        title: form.title,
        href: `/forms/${form.id}`,
        icon: "form",
        parentTitle: null,
      };
    }

    case "discussion": {
      const { data } = await (supabase
        .from("discussions") as ReturnType<typeof supabase.from>)
        .select("id, title")
        .eq("id", item.id)
        .eq("workspace_id", workspaceId)
        .single();

      const discussion = data as DiscussionSummary | null;
      if (!discussion) return null;

      return {
        id: discussion.id,
        entityType: "discussion",
        title: discussion.title,
        href: `/meetings/discussions/${discussion.id}`,
        icon: "discussion",
        parentTitle: null,
      };
    }

    case "notebook": {
      const { data } = await (supabase
        .from("notebooks") as ReturnType<typeof supabase.from>)
        .select("id, title")
        .eq("id", item.id)
        .eq("workspace_id", workspaceId)
        .single();

      const notebook = data as NotebookSummary | null;
      if (!notebook) return null;

      return {
        id: notebook.id,
        entityType: "notebook",
        title: notebook.title,
        href: `/notebooks/${notebook.id}`,
        icon: "notebook",
        parentTitle: null,
      };
    }

    case "note": {
      const { data } = await (supabase
        .from("notes") as ReturnType<typeof supabase.from>)
        .select("id, title, notebook_id")
        .eq("id", item.id)
        .eq("workspace_id", workspaceId)
        .single();

      const note = data as NoteSummary | null;
      if (!note) return null;

      let parentTitle: string | null = null;
      if (note.notebook_id) {
        const { data: notebook } = await (supabase
          .from("notebooks") as ReturnType<typeof supabase.from>)
          .select("id, title")
          .eq("id", note.notebook_id)
          .eq("workspace_id", workspaceId)
          .single();

        const notebookData = notebook as NotebookSummary | null;
        parentTitle = notebookData?.title ?? null;
      }

      return {
        id: note.id,
        entityType: "note",
        title: note.title || "Untitled Note",
        href: note.notebook_id
          ? `/notebooks/${note.notebook_id}/notes/${note.id}`
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
    fromTable(supabase, "user_favorites")
      .select("*")
      .eq("user_id", context.userId)
      .eq("workspace_id", context.workspaceId)
      .order("position", { ascending: true })
      .order("updated_at", { ascending: false }),
    fromTable(supabase, "user_recent_items")
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

  const { data } = await fromTable(supabase, "user_favorites")
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

  const { data: existing } = await fromTable(supabase, "user_favorites")
    .select("entity_id")
    .eq("user_id", context.userId)
    .eq("workspace_id", context.workspaceId)
    .eq("entity_type", canonicalItem.entityType)
    .eq("entity_id", canonicalItem.id)
    .maybeSingle();

  if (existing) {
    const { error } = await fromTable(supabase, "user_favorites")
      .delete()
      .eq("user_id", context.userId)
      .eq("workspace_id", context.workspaceId)
      .eq("entity_type", canonicalItem.entityType)
      .eq("entity_id", canonicalItem.id);

    if (error) {
      return { error: error.message } as const;
    }

    return {
      favorited: false,
      item: canonicalItem,
    };
  }

  const { data: lastFavorite } = await fromTable(supabase, "user_favorites")
    .select("position")
    .eq("user_id", context.userId)
    .eq("workspace_id", context.workspaceId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await fromTable(supabase, "user_favorites").insert({
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
    return { error: error.message } as const;
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

  const { error } = await fromTable(supabase, "user_favorites")
    .delete()
    .eq("user_id", context.userId)
    .eq("workspace_id", context.workspaceId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  if (error) {
    return { error: error.message } as const;
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

  const { error: upsertRecentError } = await fromTable(supabase, "user_recent_items")
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
    return { error: upsertRecentError.message } as const;
  }

  await fromTable(supabase, "user_favorites")
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

  const { data: staleRows } = await fromTable(supabase, "user_recent_items")
    .select("entity_type, entity_id")
    .eq("user_id", context.userId)
    .eq("workspace_id", context.workspaceId)
    .order("last_viewed_at", { ascending: false })
    .range(8, 100);

  if (staleRows && staleRows.length > 0) {
    const clauses = (staleRows as Array<Pick<SavedRecentRow, "entity_type" | "entity_id">>)
      .map((row) => `and(entity_type.eq.${row.entity_type},entity_id.eq.${row.entity_id})`)
      .join(",");

    await fromTable(supabase, "user_recent_items")
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

  const { error } = await fromTable(supabase, "user_recent_items")
    .delete()
    .eq("user_id", context.userId)
    .eq("workspace_id", context.workspaceId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  if (error) {
    return { error: error.message } as const;
  }

  return { success: true as const };
}
