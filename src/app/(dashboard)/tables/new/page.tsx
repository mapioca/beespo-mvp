import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TableBuilder } from "@/components/tables/builder/table-builder";

export default async function NewTablePage() {
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

    return (
        <div className="h-full overflow-auto">
            <div className="p-6 max-w-2xl mx-auto">
                <TableBuilder />
            </div>
        </div>
    );
}
