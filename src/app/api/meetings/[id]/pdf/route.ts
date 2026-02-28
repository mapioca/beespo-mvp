import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMeetingMarkdown } from "@/lib/generate-meeting-markdown";
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    renderToBuffer,
    Font,
} from "@react-pdf/renderer";
import React from "react";

export const dynamic = "force-dynamic";

// ── Inter font from jsDelivr (subset of weights: 400, 500, 600, 700) ─────────
const INTER_BASE = "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files";
Font.register({
    family: "Inter",
    fonts: [
        { src: `${INTER_BASE}/inter-latin-400-normal.woff`, fontWeight: 400, fontStyle: "normal" },
        { src: `${INTER_BASE}/inter-latin-500-normal.woff`, fontWeight: 500, fontStyle: "normal" },
        { src: `${INTER_BASE}/inter-latin-600-normal.woff`, fontWeight: 600, fontStyle: "normal" },
        { src: `${INTER_BASE}/inter-latin-700-normal.woff`, fontWeight: 700, fontStyle: "normal" },
    ],
});

// Disable the default hyphenation so words don't break mid-word
Font.registerHyphenationCallback((word) => [word]);

// ── Design tokens (mirrors Tailwind/MarkdownRenderer exactly) ─────────────────
// Tailwind base font is 16px. PDF pt ≈ px for screen-matching purposes.
// text-xl  = 20px → 15pt (PDF pt ~0.75 of screen px for A4/Letter body)
// text-base= 16px → 12pt
// text-sm  = 14px → 10.5pt
// text-[11px] → ~8pt
// Colors: foreground ≈ #111827, muted-foreground ≈ #6b7280, border/60 ≈ #d1d5db
const TOKEN = {
    foreground: "#111827",
    mutedForeground: "#6b7280",
    border: "#e5e7eb",
    borderStrong: "#d1d5db",
};

const styles = StyleSheet.create({
    page: {
        fontFamily: "Inter",
        fontWeight: 400,
        fontSize: 10.5,              // text-sm baseline
        color: TOKEN.foreground,
        backgroundColor: "#ffffff",
        paddingTop: 48,
        paddingBottom: 64,
        paddingHorizontal: 64,       // mirrors p-16 on the print page ~64px
        lineHeight: 1.6,             // leading-relaxed
    },

    // h1 — text-xl font-bold mb-1 leading-tight
    h1: {
        fontSize: 15,
        fontWeight: 700,
        color: TOKEN.foreground,
        marginBottom: 3,
        lineHeight: 1.25,
    },

    // subtitle (date line) — text-sm text-muted-foreground mb-1.5
    subtitle: {
        fontSize: 10.5,
        color: TOKEN.mutedForeground,
        marginBottom: 6,
    },

    // hr — border-t-2 border-border/60 my-3
    hr: {
        borderBottomWidth: 1.5,
        borderBottomColor: TOKEN.borderStrong,
        marginTop: 10,
        marginBottom: 10,
    },

    // h2 — text-base font-semibold text-foreground mt-4 mb-2
    // NOTE: Section headers (Discussions, Ward Business, Announcements) use ## → h2
    h2: {
        fontSize: 12,
        fontWeight: 600,
        color: TOKEN.foreground,
        marginTop: 16,
        marginBottom: 8,
    },

    // h3 — text-[11px] font-bold text-black uppercase tracking-[0.15em] + hr below, mt-10 mb-3
    h3: {
        fontSize: 8,
        fontWeight: 700,
        color: "#000000",
        textTransform: "uppercase",
        letterSpacing: 1.2,
        marginTop: 24,
        marginBottom: 4,
    },
    h3Rule: {
        borderBottomWidth: 0.5,
        borderBottomColor: TOKEN.border,
        marginBottom: 8,
    },

    // ul / li — space-y-1 mb-2, li text-sm muted
    ul: {
        marginBottom: 8,
    },
    li: {
        flexDirection: "row",
        marginBottom: 4,
        paddingLeft: 0,
    },
    liBullet: {
        width: 12,
        fontSize: 10.5,
        color: TOKEN.mutedForeground,
        marginTop: 1,
        // renders a small circle by using U+2022 but styled small
    },
    liContent: {
        flex: 1,
        fontSize: 10.5,
        color: TOKEN.mutedForeground,
        lineHeight: 1.6,
    },

    // p — text-sm text-muted-foreground mb-1.5 leading-relaxed
    p: {
        fontSize: 10.5,
        color: TOKEN.mutedForeground,
        marginBottom: 6,
        lineHeight: 1.6,
    },

    // strong — font-medium text-foreground
    strong: {
        fontWeight: 500,
        color: TOKEN.foreground,
    },

    // em — not-italic font-medium text-foreground
    em: {
        fontStyle: "normal",
        fontWeight: 500,
        color: TOKEN.foreground,
    },

    // Roles grid — grid grid-cols-2 gap-8 mb-6 mt-4
    rolesGrid: {
        flexDirection: "row",
        gap: 32,
        marginTop: 16,
        marginBottom: 24,
    },
    rolesColumn: {
        flex: 1,
        flexDirection: "column",
    },
    roleText: {
        fontSize: 10.5,
        color: TOKEN.mutedForeground,
        marginBottom: 4,
        lineHeight: 1.6,
    },
    roleLabel: {
        fontWeight: 500,
        color: TOKEN.foreground,
    },
});

// ── Types ─────────────────────────────────────────────────────────────────────
interface BulletItem {
    title: string;
    description?: string;
    priority?: string;
}

interface Section {
    type: "title" | "subtitle" | "divider" | "h2" | "h3" | "roles" | "procedural";
    content?: string;
    items?: BulletItem[];
    roles?: { label: string; value: string }[];
    label?: string;
    value?: string;
}

// ── Markdown parser ───────────────────────────────────────────────────────────
function parseMarkdownToSections(markdown: string): Section[] {
    const lines = markdown.split("\n");
    const sections: Section[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // h1 — # Title
        if (line.startsWith("# ")) {
            sections.push({ type: "title", content: line.slice(2).trim() });
            i++;
            continue;
        }

        // h2 — ## Section (Discussions, Ward Business, Announcements)
        if (line.startsWith("## ")) {
            const header = line.slice(3).trim();
            i++;
            const bullets: BulletItem[] = [];
            while (i < lines.length && !lines[i].startsWith("#") && lines[i].trim() !== "---") {
                const bl = lines[i];
                if (bl.startsWith("- ")) {
                    const raw = bl.slice(2);
                    // **Bold title** — description *(priority priority)*
                    const boldMatch = raw.match(/^\*\*(.+?)\*\*(?:\s*—\s*(.+?))?(?:\s*\*\((.+?)\)\*)?$/);
                    if (boldMatch) {
                        bullets.push({
                            title: boldMatch[1],
                            description: boldMatch[2]?.trim(),
                            priority: boldMatch[3]?.trim(),
                        });
                    } else {
                        bullets.push({ title: raw });
                    }
                }
                i++;
            }
            sections.push({ type: "h2", content: header, items: bullets });
            continue;
        }

        // h3 — ### Header
        if (line.startsWith("### ")) {
            sections.push({ type: "h3", content: line.slice(4).trim() });
            i++;
            continue;
        }

        // Divider
        if (line.trim() === "---") {
            sections.push({ type: "divider" });
            i++;
            continue;
        }

        // Roles grid
        if (line.trim() === ":::roles-grid") {
            const roles: { label: string; value: string }[] = [];
            i++;
            while (i < lines.length && lines[i].trim() !== ":::end-grid") {
                const rl = lines[i].trim();
                const roleMatch = rl.match(/^\*\*(.+?):\*\*\s*(.+)$/);
                if (roleMatch) {
                    roles.push({ label: roleMatch[1], value: roleMatch[2] });
                }
                i++;
            }
            i++;
            if (roles.length > 0) sections.push({ type: "roles", roles });
            continue;
        }

        // Procedural: *Label:* Value
        const proceduralMatch = line.match(/^\*(.+?):\*\s*(.+)$/);
        if (proceduralMatch) {
            sections.push({ type: "procedural", label: proceduralMatch[1], value: proceduralMatch[2] });
            i++;
            continue;
        }

        // Speaker topic continuation
        if (line.startsWith("  Topic:")) {
            const prev = sections[sections.length - 1];
            if (prev?.type === "procedural") {
                prev.value = `${prev.value} — Topic: ${line.slice(9).trim()}`;
            }
            i++;
            continue;
        }

        // Date subtitle right after title
        if (line.trim() && sections.length === 1 && sections[0].type === "title") {
            sections.push({ type: "subtitle", content: line.trim() });
            i++;
            continue;
        }

        i++;
    }
    return sections;
}

// ── Build the PDF element ──────────────────────────────────────────────────────
function buildPdfElement(sections: Section[], meetingTitle: string) {
    const children: React.ReactElement[] = [];

    for (let idx = 0; idx < sections.length; idx++) {
        const section = sections[idx];

        switch (section.type) {
            case "title":
                children.push(
                    React.createElement(Text, { key: idx, style: styles.h1 }, section.content)
                );
                break;

            case "subtitle":
                children.push(
                    React.createElement(Text, { key: idx, style: styles.subtitle }, section.content)
                );
                break;

            case "divider":
                children.push(
                    React.createElement(View, { key: idx, style: styles.hr })
                );
                break;

            case "roles":
                children.push(
                    React.createElement(
                        View,
                        { key: idx, style: styles.rolesGrid },
                        ...(section.roles ?? []).map((r, ri) =>
                            React.createElement(
                                View,
                                { key: ri, style: styles.rolesColumn },
                                // **Label:** Value — mirroring strong + regular text
                                React.createElement(
                                    Text,
                                    { style: styles.roleText },
                                    React.createElement(Text, { style: styles.roleLabel }, `${r.label}: `),
                                    r.value
                                )
                            )
                        )
                    )
                );
                break;

            case "h2":
                // Section header (Discussions, Ward Business, etc.) + bullet list
                children.push(
                    React.createElement(
                        View,
                        { key: idx },
                        React.createElement(Text, { style: styles.h2 }, section.content),
                        ...(section.items ?? []).map((bullet, bi) =>
                            React.createElement(
                                View,
                                { key: bi, style: styles.li },
                                // Small round dot bullet (matches before:content-[''] rounded-full)
                                React.createElement(
                                    View,
                                    {
                                        style: {
                                            width: 4,
                                            height: 4,
                                            borderRadius: 2,
                                            backgroundColor: TOKEN.mutedForeground,
                                            marginTop: 5,
                                            marginRight: 7,
                                            opacity: 0.5,
                                        }
                                    }
                                ),
                                React.createElement(
                                    Text,
                                    { style: styles.liContent },
                                    // Bold segment: font-medium foreground
                                    React.createElement(Text, { style: { fontWeight: 500, color: TOKEN.foreground } }, bullet.title),
                                    // Em-dash + description: muted
                                    bullet.description
                                        ? React.createElement(Text, { style: { color: TOKEN.mutedForeground } }, ` — ${bullet.description}`)
                                        : null,
                                    // Priority: muted, smaller
                                    bullet.priority
                                        ? React.createElement(Text, { style: { color: TOKEN.mutedForeground, fontSize: 9.5 } }, ` (${bullet.priority})`)
                                        : null
                                )
                            )
                        )
                    )
                );
                break;

            case "h3":
                children.push(
                    React.createElement(
                        View,
                        { key: idx },
                        React.createElement(Text, { style: styles.h3 }, section.content),
                        React.createElement(View, { style: styles.h3Rule })
                    )
                );
                break;

            case "procedural":
                // *Label:* Value  → em (non-italic, medium, foreground) + regular muted
                children.push(
                    React.createElement(
                        View,
                        { key: idx, style: styles.p },
                        React.createElement(
                            Text,
                            { style: styles.p },
                            React.createElement(Text, { style: { fontWeight: 500, color: TOKEN.foreground, fontStyle: "normal" } }, `${section.label}: `),
                            React.createElement(Text, { style: { color: TOKEN.mutedForeground } }, section.value ?? "")
                        )
                    )
                );
                break;
        }
    }

    return React.createElement(
        Document,
        { title: meetingTitle },
        React.createElement(
            Page,
            { size: "LETTER", style: styles.page },
            ...children
        )
    );
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: meeting, error } = await (supabase.from("meetings") as any)
        .select("*, templates(name), profiles(full_name)")
        .eq("id", id)
        .single();

    if (error || !meeting) {
        return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agendaItems } = await (supabase.from("agenda_items") as any)
        .select("*, hymn:hymns(title, hymn_number), child_items")
        .eq("meeting_id", id)
        .order("order_index", { ascending: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvasItems: any[] = (agendaItems ?? []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        order_index: item.order_index,
        category: item.item_type,
        isContainer: ["discussion", "business", "announcement"].includes(item.item_type),
        containerType: ["discussion", "business", "announcement"].includes(item.item_type)
            ? item.item_type
            : undefined,
        childItems: item.child_items || [],
        is_hymn: !!item.hymn_id,
        hymn_number: item.hymn?.hymn_number,
        hymn_title: item.hymn?.title,
        requires_participant: !!item.participant_name,
        participant_name: item.participant_name,
        speaker_name: item.participant_name,
    }));

    const markdown = meeting.markdown_agenda || generateMeetingMarkdown({
        title: meeting.title || "Untitled Meeting",
        date: new Date(meeting.scheduled_date),
        time: new Date(meeting.scheduled_date).toTimeString().slice(0, 5),
        unitName: meeting.unit_name || "",
        presiding: meeting.presiding_name,
        conducting: meeting.conducting_name,
        chorister: meeting.chorister_name,
        pianistOrganist: meeting.organist_name,
        canvasItems,
    });

    const sections = parseMarkdownToSections(markdown);
    const safeTitle = (meeting.title || "agenda")
        .replace(/[^a-z0-9\s-]/gi, "")
        .replace(/\s+/g, "-")
        .toLowerCase();

    try {
        const pdfBuffer = await renderToBuffer(
            buildPdfElement(sections, meeting.title || "Meeting Agenda")
        );

        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (err) {
        console.error("PDF generation error:", err);
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
    }
}
