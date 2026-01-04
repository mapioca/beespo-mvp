import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from "lucide-react";

export default async function TemplatesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile to check organization
  const { data: profile } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("profiles") as any)
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/setup");
  }

  // Get all templates (shared + organization-specific)
  const { data: templates } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("templates") as any)
    .select("id, name, description, calling_type, is_shared, created_at")
    .order("is_shared", { ascending: false })
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sharedTemplates = templates?.filter((t: any) => t.is_shared) || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgTemplates = templates?.filter((t: any) => !t.is_shared) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meeting Templates</h1>
          <p className="text-muted-foreground">
            Create and manage reusable meeting agendas
          </p>
        </div>
        {profile.role === "leader" && (
          <Button asChild>
            <Link href="/dashboard/templates/new">
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Link>
          </Button>
        )}
      </div>

      {/* Pre-built Templates */}
      {sharedTemplates.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Pre-built Templates</h2>
            <p className="text-sm text-muted-foreground">
              Ready-to-use templates for common meetings
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {sharedTemplates.map((template: any) => (
              <Card key={template.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <Badge variant="secondary">Shared</Badge>
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  {template.calling_type && (
                    <Badge variant="outline" className="w-fit capitalize">
                      {template.calling_type.replace(/_/g, " ")}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-2">
                    {template.description || "No description"}
                  </CardDescription>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <Link href={`/dashboard/templates/${template.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Organization Templates */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Your Templates</h2>
          <p className="text-sm text-muted-foreground">
            Custom templates for your organization
          </p>
        </div>
        {orgTemplates.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {orgTemplates.map((template: any) => (
              <Card key={template.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <Badge>Custom</Badge>
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  {template.calling_type && (
                    <Badge variant="outline" className="w-fit capitalize">
                      {template.calling_type.replace(/_/g, " ")}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-2">
                    {template.description || "No description"}
                  </CardDescription>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" asChild className="flex-1">
                      <Link href={`/dashboard/templates/${template.id}`}>
                        View
                      </Link>
                    </Button>
                    {profile.role === "leader" && (
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <Link href={`/dashboard/templates/${template.id}/edit`}>
                          Edit
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No custom templates yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first template to get started
              </p>
              {profile.role === "leader" && (
                <Button asChild>
                  <Link href="/dashboard/templates/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
