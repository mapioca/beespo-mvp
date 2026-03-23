"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect } from "react";

interface User {
  id: string;
  email: string;
  user_metadata: { full_name?: string; name?: string };
}

export function SupportForm() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [requestType, setRequestType] = useState("General Question");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user as User | null);
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      const userName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Beespo User";

      const res = await fetch("/api/support/create-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType,
          subject,
          description,
          priority,
          userEmail: user.email,
          userName,
          metadata: {
            currentUrl: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit ticket");
      }

      setSubmitted(true);
      toast.success("Support ticket submitted successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="border rounded-lg p-6 bg-muted/30 text-center space-y-3">
        <p className="text-muted-foreground">Sign in to submit a support ticket and track your requests.</p>
        <Button asChild>
          <Link href="/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="border rounded-lg p-8 bg-muted/30 text-center space-y-4">
        <div className="text-2xl">✓</div>
        <h3 className="font-semibold text-lg">Ticket submitted</h3>
        <p className="text-muted-foreground text-sm">
          We&apos;ll get back to you at <strong>{user.email}</strong> within one business day.
        </p>
        <Button variant="outline" onClick={() => { setSubmitted(false); setSubject(""); setDescription(""); }}>
          Submit another ticket
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 border rounded-lg p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={requestType} onValueChange={setRequestType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="General Question">General Question</SelectItem>
              <SelectItem value="Bug Report">Bug Report</SelectItem>
              <SelectItem value="Feature Request">Feature Request</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief summary of your issue"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your issue in detail. Include steps to reproduce if reporting a bug."
          rows={5}
          required
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Submitting as <strong>{user.email}</strong></p>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit Ticket"}
        </Button>
      </div>
    </form>
  );
}
