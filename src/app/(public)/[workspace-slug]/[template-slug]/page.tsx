import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";

interface PublicTemplatePageProps {
  params: Promise<{
    "workspace-slug": string;
    "template-slug": string;
  }>;
}

interface WorkspaceData {
  id: string;
  name: string;
  slug: string | null;
}

interface TemplateData {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  is_shared: boolean;
}

interface TemplateItemData {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  duration_minutes: number | null;
  item_type: string;
}

export default async function PublicTemplatePage({ params }: PublicTemplatePageProps) {
  const { "workspace-slug": workspaceSlug, "template-slug": templateSlug } = await params;

  const supabase = await createClient();

  // Fetch workspace by slug
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workspace, error: workspaceError } = await (supabase.from("workspaces") as any)
    .select("id, name, slug")
    .eq("slug", workspaceSlug)
    .single() as { data: WorkspaceData | null; error: unknown };

  if (workspaceError || !workspace) {
    notFound();
  }

  // Fetch template by slug within workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: template, error: templateError } = await (supabase.from("templates") as any)
    .select("id, name, description, tags, is_shared")
    .eq("workspace_id", workspace.id)
    .eq("slug", templateSlug)
    .eq("is_shared", true)
    .single() as { data: TemplateData | null; error: unknown };

  if (templateError || !template) {
    notFound();
  }

  // Fetch template items
  const { data: items } = await supabase
    .from("template_items")
    .select("id, title, description, order_index, duration_minutes, item_type")
    .eq("template_id", template.id)
    .order("order_index") as { data: TemplateItemData[] | null };

  // Calculate total duration
  const totalDuration = items?.reduce((sum, item) => sum + (item.duration_minutes || 0), 0) || 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Template Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span>{workspace.name}</span>
          <span>/</span>
          <span>Templates</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">{template.name}</h1>
        {template.description && (
          <p className="text-muted-foreground">{template.description}</p>
        )}
        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {totalDuration} minutes total
          </span>
          <span>{items?.length || 0} agenda items</span>
        </div>
      </div>

      {/* Template Items */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Agenda Template</h2>

        {items && items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.id} className="p-4 rounded-lg border bg-card">
                <div className="flex items-start gap-4">
                  <span className="text-2xl font-bold text-muted-foreground/30">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{item.title}</h3>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">
                        {item.item_type}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                  </div>
                  {item.duration_minutes && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      {item.duration_minutes} min
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground py-8 text-center">
            No template items available.
          </p>
        )}
      </div>

      {/* Tags */}
      {template.tags && template.tags.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-medium mb-2">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {template.tags.map((tag: string) => (
              <span
                key={tag}
                className="px-2 py-1 bg-muted text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
        <p>
          This is a shared meeting template from {workspace.name}. Contact the workspace administrator for more information.
        </p>
      </div>
    </div>
  );
}
