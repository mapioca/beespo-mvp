import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicFormClient } from "./public-form-client";
import type { Form } from "@/types/form-types";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function PublicFormPage({ params }: PageProps) {
    const { id: slug } = await params;
    const supabase = await createClient();

    // Get published form by slug
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: form, error } = await (supabase.from("forms") as any)
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

    if (error || !form) {
        notFound();
    }

    // Increment view count (fire and forget)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("forms") as any)
        .update({ views_count: form.views_count + 1 })
        .eq("id", form.id)
        .then(() => { });

    return <PublicFormClient form={form as Form} />;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
    const { id: slug } = await params;
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: form } = await (supabase.from("forms") as any)
        .select("title, description")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

    if (!form) {
        return { title: "Form Not Found" };
    }

    return {
        title: form.title,
        description: form.description || `Fill out ${form.title}`,
    };
}
