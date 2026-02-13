import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Shield } from "lucide-react";

export default async function AdminDashboardPage() {
    const supabase = await createClient();

    // Fetch summary stats
    const [usersResult, templatesResult] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
            .from("templates")
            .select("id", { count: "exact", head: true })
            .is("workspace_id", null),
    ]);

    const totalUsers = usersResult.count ?? 0;
    const globalTemplates = templatesResult.count ?? 0;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">
                    Dashboard
                </h1>
                <p className="mt-1 text-sm text-zinc-400">
                    Platform overview at a glance.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    icon={<Users className="h-5 w-5 text-blue-400" />}
                    label="Total Users"
                    value={totalUsers}
                />
                <StatCard
                    icon={<FileText className="h-5 w-5 text-emerald-400" />}
                    label="Global Templates"
                    value={globalTemplates}
                />
                <StatCard
                    icon={<Shield className="h-5 w-5 text-red-400" />}
                    label="Admin Console"
                    value="Active"
                />
            </div>
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
}) {
    return (
        <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
                {icon}
                <CardTitle className="text-sm font-medium text-zinc-400">
                    {label}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold text-white">{value}</p>
            </CardContent>
        </Card>
    );
}
