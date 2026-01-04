import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
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
import { ArrowLeft, Edit, Clock } from "lucide-react";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const { data: profile } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("profiles") as any)
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/setup");
  }

  // Get template details
  const { data: template } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("templates") as any)
    .select("*")
    .eq("id", id)
    .single();

  if (!template) {
    notFound();
  }

  // Get template items
  const { data: items } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("template_items") as any)
    .select("*")
    .eq("template_id", id)
    .order("order_index");

  const canEdit = profile.role === "leader" && !template.is_shared;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalDuration = items?.reduce((sum: number, item: any) => sum + (item.duration_minutes || 0), 0) || 0;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/templates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-3xl">{template.name}</CardTitle>
                  {template.is_shared ? (
                    <Badge variant="secondary">Shared</Badge>
                  ) : (
                    <Badge>Custom</Badge>
                  )}
                </div>
                {template.calling_type && (
                  <Badge variant="outline" className="capitalize">
                    {template.calling_type.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
              {canEdit && (
                <Button asChild>
                  <Link href={`/dashboard/templates/${template.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Template
                  </Link>
                </Button>
              )}
            </div>
            {template.description && (
              <CardDescription className="text-base mt-4">
                {template.description}
              </CardDescription>
            )}
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Agenda Items</CardTitle>
                <CardDescription>
                  {items?.length || 0} item{items?.length !== 1 ? "s" : ""}
                  {totalDuration > 0 && (
                    <span className="ml-2 inline-flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      {totalDuration} min total
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {items && items.length > 0 ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {items.map((item: any, index: number) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 border rounded-lg bg-card"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{item.title}</h4>
                        {item.duration_minutes && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="mr-1 h-3 w-3" />
                            {item.duration_minutes} min
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No agenda items defined for this template
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
