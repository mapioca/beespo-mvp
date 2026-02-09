import Link from "next/link";
import { Plus, FileText, BarChart2, MoreHorizontal, Trash2, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { Form } from "@/types/form-types";
import { format } from "date-fns";

export default async function FormsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Get user's workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from("profiles") as any)
        .select("workspace_id")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) {
        redirect("/onboarding");
    }

    // Get forms
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: forms } = await (supabase.from("forms") as any)
        .select("*")
        .eq("workspace_id", profile.workspace_id)
        .order("created_at", { ascending: false });

    const formsList = (forms || []) as Form[];

    return (
        <div className="h-full overflow-auto">
            <div className="p-6 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">Forms</h1>
                        <p className="text-muted-foreground">
                            Create and manage feedback forms
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/forms/new">
                            <Plus className="h-4 w-4 mr-2" />
                            New Form
                        </Link>
                    </Button>
                </div>

                {/* Forms List */}
                {formsList.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                            <CardTitle className="mb-2">No forms yet</CardTitle>
                            <CardDescription className="text-center mb-6">
                                Create your first form to start collecting feedback
                            </CardDescription>
                            <Button asChild>
                                <Link href="/forms/new">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Form
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>All Forms</CardTitle>
                            <CardDescription>
                                {formsList.length} form{formsList.length !== 1 ? "s" : ""}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Views</TableHead>
                                        <TableHead className="text-right">Responses</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {formsList.map((form) => (
                                        <TableRow key={form.id}>
                                            <TableCell>
                                                <Link
                                                    href={`/forms/${form.id}`}
                                                    className="font-medium hover:underline"
                                                >
                                                    {form.title}
                                                </Link>
                                                {form.description && (
                                                    <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                                                        {form.description}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={form.is_published ? "default" : "secondary"}>
                                                    {form.is_published ? "Published" : "Draft"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {form.views_count}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {/* We'll add submission count later */}
                                                —
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {format(new Date(form.created_at), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Actions</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/forms/${form.id}`}>
                                                                <FileText className="h-4 w-4 mr-2" />
                                                                Edit
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/forms/${form.id}/results`}>
                                                                <BarChart2 className="h-4 w-4 mr-2" />
                                                                View Results
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        {form.is_published && (
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/f/${form.slug}`} target="_blank">
                                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                                    Open Form
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive">
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
