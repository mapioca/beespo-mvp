import React from "react";
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
} from "@react-pdf/renderer";

// ── Inter font from jsDelivr ──────────────────────────────────────────────────
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

// Disable the default hyphenation
Font.registerHyphenationCallback((word) => [word]);

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
        fontSize: 10.5,
        color: TOKEN.foreground,
        backgroundColor: "#ffffff",
        paddingTop: 48,
        paddingBottom: 64,
        paddingHorizontal: 64,
        lineHeight: 1.6,
    },
    h1: {
        fontSize: 15,
        fontWeight: 700,
        color: TOKEN.foreground,
        marginBottom: 3,
        lineHeight: 1.25,
    },
    subtitle: {
        fontSize: 10.5,
        color: TOKEN.mutedForeground,
        marginBottom: 6,
    },
    hr: {
        borderBottomWidth: 1.5,
        borderBottomColor: TOKEN.borderStrong,
        marginTop: 10,
        marginBottom: 10,
    },
    h2: {
        fontSize: 12,
        fontWeight: 600,
        color: TOKEN.foreground,
        marginTop: 16,
        marginBottom: 8,
    },
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
    li: {
        flexDirection: "row",
        marginBottom: 4,
        paddingLeft: 0,
    },
    liContent: {
        flex: 1,
        fontSize: 10.5,
        color: TOKEN.mutedForeground,
        lineHeight: 1.6,
    },
    p: {
        fontSize: 10.5,
        color: TOKEN.mutedForeground,
        marginBottom: 6,
        lineHeight: 1.6,
    },
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

export interface BulletItem {
    title: string;
    description?: string;
    priority?: string;
    notes?: string;
}

export interface Section {
    type: "title" | "subtitle" | "divider" | "h2" | "h3" | "roles" | "procedural";
    content?: string;
    items?: BulletItem[];
    roles?: { label: string; value: string }[];
    label?: string;
    value?: string;
}

/**
 * Shared parser to convert the meeting markdown string into visual sections for PDF/Word
 */
export function parseMarkdownToSections(markdown: string): Section[] {
    const lines = markdown.split("\n");
    const sections: Section[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // 1. Title (# )
        if (line.startsWith("# ")) {
            sections.push({ type: "title", content: line.slice(2).trim() });
            i++;
            continue;
        }

        // 2. Section Header (## )
        if (line.startsWith("## ")) {
            const header = line.slice(3).trim();
            i++;
            const bullets: BulletItem[] = [];
            while (i < lines.length && !lines[i].startsWith("#") && lines[i].trim() !== "---") {
                const bl = lines[i];
                if (bl.startsWith("- ")) {
                    const raw = bl.slice(2);
                    // Match: **Title** (Priority) -> note descriptions are on new indented lines now
                    const bulletMatch = raw.match(/^\*\*(.+?)\*\*(?:\s*\*?\((.+?)\)\*?)?$/);
                    const currentBullet: BulletItem = bulletMatch 
                        ? { 
                            title: bulletMatch[1], 
                            priority: bulletMatch[2]?.trim() 
                          }
                        : { title: raw };
                    
                    bullets.push(currentBullet);
                    
                    // Look ahead for indented descriptions or notes
                    i++;
                    const notes: string[] = [];
                    while (i < lines.length && (lines[i].startsWith("  ") || lines[i].trim() === "")) {
                        const noteLine = lines[i].trim();
                        if (noteLine) notes.push(noteLine);
                        i++;
                    }
                    if (notes.length > 0) {
                        currentBullet.notes = notes.join("\n");
                    }
                    continue; 
                }
                i++;
            }
            sections.push({ type: "h2", content: header, items: bullets });
            continue;
        }

        // 3. Optional Rule (### )
        if (line.startsWith("### ")) {
            sections.push({ type: "h3", content: line.slice(4).trim() });
            i++;
            continue;
        }

        // 4. Divider (---)
        if (line.trim() === "---") {
            sections.push({ type: "divider" });
            i++;
            continue;
        }

        // 5. Roles Grid
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

        // 6. Generic Procedural / Text (Anything else with content)
        if (line.trim()) {
            // Match **Label:** Value or **Label**: Value or *Emphasized*
            const boldMatch = line.match(/^(\*\*.+?\*\*[:]?)\s*(.*)$/);
            const italicMatch = line.match(/^\*(.+?)\*$/);
            
            let label = "";
            let value = line.trim();

            if (boldMatch) {
                label = boldMatch[1].replace(/\*\*/g, "").replace(/:$/, "").trim();
                value = boldMatch[2].trim();
            } else if (italicMatch) {
                // If it's just *No items*, it's an emphasized value
                value = line.trim();
            }

            const currentItem: Section = { type: "procedural", label, value };
            sections.push(currentItem);
            i++;

            // Look ahead for potential notes or script lines
            const notes: string[] = [];
            while (i < lines.length && !lines[i].startsWith("#") && !lines[i].startsWith("-") && !lines[i].startsWith("*") && !lines[i].startsWith(":::") && lines[i].trim() !== "---") {
                const noteLine = lines[i].trim();
                if (noteLine) notes.push(noteLine);
                i++;
            }
            if (notes.length > 0) {
                currentItem.value = currentItem.value 
                    ? `${currentItem.value}\n\n${notes.join("\n")}`
                    : notes.join("\n");
            }
            continue;
        }

        i++;
    }
    return sections;
}

interface MeetingPDFDocumentProps {
    sections: Section[];
    meetingTitle: string;
}

export function MeetingPDFDocument({ sections, meetingTitle }: MeetingPDFDocumentProps) {
    const children: React.ReactElement[] = [];

    for (let idx = 0; idx < sections.length; idx++) {
        const section = sections[idx];

        switch (section.type) {
            case "title":
                children.push(
                    <Text key={idx} style={styles.h1}>{section.content}</Text>
                );
                break;

            case "subtitle":
                children.push(
                    <Text key={idx} style={styles.subtitle}>{section.content}</Text>
                );
                break;

            case "divider":
                children.push(
                    <View key={idx} style={styles.hr} />
                );
                break;

            case "roles":
                children.push(
                    <View key={idx} style={styles.rolesGrid}>
                        {(section.roles ?? []).map((r, ri) => (
                            <View key={ri} style={styles.rolesColumn}>
                                <Text style={styles.roleText}>
                                    <Text style={styles.roleLabel}>{r.label}: </Text>
                                    {r.value}
                                </Text>
                            </View>
                        ))}
                    </View>
                );
                break;

            case "h2":
                children.push(
                    <View key={idx} style={{ marginBottom: 12 }}>
                        <Text style={styles.h2}>{section.content}</Text>
                        {(section.items ?? []).map((bullet, bi) => (
                            <View key={bi} style={{ marginBottom: 6 }}>
                                <View style={styles.li}>
                                    <View
                                        style={{
                                            width: 4,
                                            height: 4,
                                            borderRadius: 2,
                                            backgroundColor: TOKEN.mutedForeground,
                                            marginTop: 5,
                                            marginRight: 7,
                                            opacity: 0.5,
                                        }}
                                    />
                                    <Text style={styles.liContent}>
                                        <Text style={{ fontWeight: 500, color: TOKEN.foreground }}>{bullet.title}</Text>
                                        {bullet.description && <Text style={{ color: TOKEN.mutedForeground }}> — {bullet.description}</Text>}
                                        {bullet.priority && <Text style={{ color: TOKEN.mutedForeground, fontSize: 9.5 }}> ({bullet.priority})</Text>}
                                    </Text>
                                </View>
                                {bullet.notes && (
                                    <View style={{ marginLeft: 11, marginTop: -2, marginBottom: 4 }}>
                                        <Text style={{ fontSize: 9, color: TOKEN.mutedForeground, lineHeight: 1.4 }}>
                                            {bullet.notes}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                );
                break;

            case "h3":
                children.push(
                    <View key={idx}>
                        <Text style={styles.h3}>{section.content}</Text>
                        <View style={styles.h3Rule} />
                    </View>
                );
                break;

            case "procedural":
                children.push(
                    <View key={idx} style={{ marginBottom: 8 }}>
                        <Text style={styles.p}>
                            <Text style={{ fontWeight: 500, color: TOKEN.foreground }}>{section.label}{section.value ? ": " : ""}</Text>
                            <Text style={{ color: TOKEN.mutedForeground }}>{section.value ?? ""}</Text>
                        </Text>
                    </View>
                );
                break;
        }
    }

    return (
        <Document title={meetingTitle}>
            <Page size="LETTER" style={styles.page}>
                {children}
            </Page>
        </Document>
    );
}
