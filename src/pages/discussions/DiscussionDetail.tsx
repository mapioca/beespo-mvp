"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DiscussionDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [discussion, setDiscussion] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDiscussion = async () => {
      if (!params?.id) return;
      
      try {
        const response = await fetch(`/api/discussions/${params.id}`);
        const result = await response.json();
        
        if (result.data) {
          setDiscussion(result.data);
        }
      } catch (error) {
        console.error("Failed to load discussion:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDiscussion();
  }, [params?.id]);

  if (loading) {
    return (
      <div className="min-h-full bg-background px-5 py-12 text-foreground sm:px-8">
        <div className="mx-auto max-w-[900px]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="min-h-full bg-background px-5 py-12 text-foreground sm:px-8">
        <div className="mx-auto max-w-[900px]">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </button>
          <div className="mt-8 rounded-lg border bg-card px-6 py-12 text-center">
            <h2 className="font-serif text-2xl font-normal">Discussion not found</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background px-5 py-10 text-foreground sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[900px]">
        <Link href="/discussions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" />
          All discussions
        </Link>

        <div className="mt-8">
          <h1 className="font-serif text-4xl font-normal">{discussion.title}</h1>
          {discussion.description && (
            <p className="mt-4 text-muted-foreground">{discussion.description}</p>
          )}
          
          <div className="mt-6 flex gap-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
              discussion.status === "new" && "border-border bg-muted",
              discussion.status === "active" && "border-primary/30 bg-primary/10 text-primary",
              discussion.status === "resolved" && "border-green-500/30 bg-green-500/10 text-green-700"
            )}>
              {discussion.status}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs">
              {discussion.priority}
            </span>
          </div>

          <div className="mt-8 rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">
              Discussion details and notes will be implemented in the next phase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
