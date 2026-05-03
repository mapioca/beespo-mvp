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

  const shellStyle = {
    background: "color-mix(in srgb, var(--lp-bg) 84%, white 16%)",
    border: "1px solid color-mix(in srgb, var(--lp-ink) 12%, transparent)",
  } as const;

  const fieldStyle = {
    background: "var(--lp-bg)",
    color: "var(--lp-ink)",
    borderColor: "color-mix(in srgb, var(--lp-ink) 10%, transparent)",
  } as const;

  const selectTriggerClassName =
    "bg-transparent focus:ring-0";

  const actionButtonClassName =
    "border-0 bg-[var(--lp-accent)] text-[var(--lp-bg)] hover:opacity-90";

  if (loading) {
    return (
      <div
        className="flex h-40 items-center justify-center rounded-[24px] text-sm"
        style={{
          ...shellStyle,
          color: "color-mix(in srgb, var(--lp-ink) 60%, transparent)",
        }}
      >
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-3 rounded-[24px] p-6 text-center" style={shellStyle}>
        <p style={{ color: "color-mix(in srgb, var(--lp-ink) 72%, transparent)" }}>
          Sign in to submit a support ticket and track your requests.
        </p>
        <Button asChild className={actionButtonClassName}>
          <Link href="/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="space-y-4 rounded-[24px] p-8 text-center" style={shellStyle}>
        <div
          className="mx-auto grid h-12 w-12 place-items-center rounded-full text-2xl"
          style={{
            background: "color-mix(in srgb, var(--lp-accent) 14%, transparent)",
            color: "var(--lp-accent)",
          }}
        >
          ✓
        </div>
        <h3 className="font-serif text-2xl text-[var(--lp-ink)]">Ticket submitted</h3>
        <p className="text-sm" style={{ color: "color-mix(in srgb, var(--lp-ink) 72%, transparent)" }}>
          We&apos;ll get back to you at <strong>{user.email}</strong> within one business day.
        </p>
        <Button
          variant="outline"
          className="border-[color:var(--lp-ink)]/20 bg-transparent text-[var(--lp-ink)] hover:bg-[var(--lp-bg)]"
          onClick={() => { setSubmitted(false); setSubject(""); setDescription(""); }}
        >
          Submit another ticket
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-[24px] p-6 sm:p-7" style={shellStyle}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label
            className="text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "color-mix(in srgb, var(--lp-ink) 55%, transparent)" }}
          >
            Type
          </Label>
          <Select value={requestType} onValueChange={setRequestType}>
            <SelectTrigger className={selectTriggerClassName} style={fieldStyle}>
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
          <Label
            className="text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "color-mix(in srgb, var(--lp-ink) 55%, transparent)" }}
          >
            Priority
          </Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className={selectTriggerClassName} style={fieldStyle}>
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
        <Label
          htmlFor="subject"
          className="text-[11px] uppercase tracking-[0.18em]"
          style={{ color: "color-mix(in srgb, var(--lp-ink) 55%, transparent)" }}
        >
          Subject
        </Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief summary of your issue"
          className="bg-transparent text-[var(--lp-ink)]"
          style={fieldStyle}
          required
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="description"
          className="text-[11px] uppercase tracking-[0.18em]"
          style={{ color: "color-mix(in srgb, var(--lp-ink) 55%, transparent)" }}
        >
          Description
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your issue in detail. Include steps to reproduce if reporting a bug."
          rows={5}
          className="bg-transparent text-[var(--lp-ink)]"
          style={fieldStyle}
          required
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs" style={{ color: "color-mix(in srgb, var(--lp-ink) 62%, transparent)" }}>
          Submitting as <strong>{user.email}</strong>
        </p>
        <Button type="submit" disabled={submitting} className={actionButtonClassName}>
          {submitting ? "Submitting…" : "Submit Ticket"}
        </Button>
      </div>
    </form>
  );
}
