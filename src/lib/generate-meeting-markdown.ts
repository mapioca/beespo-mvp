import { format } from "date-fns";
import type { CanvasItem } from "@/components/meetings/builder/types";

export interface MeetingMarkdownData {
  title: string;
  date: Date;
  time: string; // "HH:mm"
  unitName?: string;
  presiding?: string;
  conducting?: string;
  chorister?: string;
  pianistOrganist?: string;
  meetingNotes?: string | null;
  canvasItems: CanvasItem[];
}

const CONTAINER_HEADERS: Record<string, string> = {
  discussion: "Discussions",
  business: "Ward Business",
  announcement: "Announcements",
};

/**
 * Converts Tiptap HTML output to markdown-compatible text.
 * Handles: <strong>, <em>, <s>, <p>, <ul>/<ol>/<li>, <br>.
 * Falls back to stripping all remaining tags for unknown elements.
 */
function htmlToMarkdown(html: string | null | undefined): string {
  if (!html) return "";

  let md = html
    // Inline formatting
    .replace(/<strong>(.*?)<\/strong>/gis, "**$1**")
    .replace(/<em>(.*?)<\/em>/gis, "_$1_")
    .replace(/<s>(.*?)<\/s>/gis, "~~$1~~")
    // Line break
    .replace(/<br\s*\/?>/gi, "\n")
    // Paragraphs → content + newline
    .replace(/<p>(.*?)<\/p>/gis, (_, inner) => inner.trim() + "\n")
    // Unordered list items
    .replace(/<li>(.*?)<\/li>/gis, (_, inner) => `- ${inner.trim()}\n`)
    // Ordered list: track index manually
    .replace(/<ol>(.*?)<\/ol>/gis, (_, body) => {
      let i = 0;
      return body.replace(/^- /gm, () => `${++i}. `);
    })
    // Strip remaining tags (<ul>, <ol>, etc.)
    .replace(/<[^>]+>/g, "")
    // Decode HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Collapse more than 2 consecutive newlines
  md = md.replace(/\n{3,}/g, "\n\n").trim();
  return md;
}

function formatTime12h(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}


export function generateMeetingMarkdown(data: MeetingMarkdownData): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${data.title}`);

  // Date & Time
  const dateStr = format(data.date, "EEEE, MMMM d, yyyy");
  const timeStr = formatTime12h(data.time);
  lines.push(`${dateStr} at ${timeStr}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Roles
  const roles = [
    { label: "Presiding", value: data.presiding },
    { label: "Conducting", value: data.conducting },
    { label: "Chorister", value: data.chorister },
    { label: "Pianist/Organist", value: data.pianistOrganist },
  ];

  const hasAnyRole = roles.some((r) => r.value?.trim());
  if (hasAnyRole) {
    lines.push(":::roles-grid");
    lines.push("");
    lines.push(":::roles-column");
    if (data.presiding?.trim()) {
      lines.push(`**Presiding:** ${data.presiding.trim()}`);
      lines.push("");
    }
    if (data.conducting?.trim()) {
      lines.push(`**Conducting:** ${data.conducting.trim()}`);
      lines.push("");
    }
    lines.push(":::");
    lines.push("");
    lines.push(":::roles-column");
    if (data.chorister?.trim()) {
      lines.push(`**Chorister:** ${data.chorister.trim()}`);
      lines.push("");
    }
    if (data.pianistOrganist?.trim()) {
      lines.push(`**Pianist/Organist:** ${data.pianistOrganist.trim()}`);
      lines.push("");
    }
    lines.push(":::");
    lines.push("");
    lines.push(":::end-grid");
    lines.push("");
  }


  // Agenda Items
  const sorted = [...data.canvasItems].sort(
    (a, b) => a.order_index - b.order_index
  );

  for (const item of sorted) {
    // Container items
    if (item.isContainer && item.containerType) {
      // Use the user-set title first; fall back to the generic container header
      const header = item.title?.trim() || CONTAINER_HEADERS[item.containerType] || item.containerType;
      lines.push(`## ${header}`);
      lines.push("");

      const children = item.childItems || [];
      if (children.length === 0) {
        lines.push("*No items*");
        lines.push("");
      } else {
        for (const child of children) {
          let titleLine = `- **${child.title}**`;
          if (child.priority && child.priority !== "normal") {
            titleLine += ` *(${child.priority} priority)*`;
          }
          // Add a line break indicator to the title line
          lines.push(titleLine + "  ");

          if (child.item_notes) {
            // Convert HTML from the RichTextEditor to plain markdown text
            const notesMd = htmlToMarkdown(child.item_notes);
            if (notesMd) {
              lines.push("  ");
              notesMd.split("\n").forEach((dLine) => {
                lines.push(`  ${dLine}`);
              });
            }
          }
        }
        lines.push("");
      }
      lines.push(""); // Extra space after section
      continue;
    }

    // Structural items
    if (item.category === "structural") {
      if (item.structural_type === "section_header") {
        lines.push(`## ${item.title}`);
        lines.push("");
      } else if (item.structural_type === "divider") {
        lines.push("---");
        lines.push("");
      }
      continue;
    }

    // Hymn items
    if (item.is_hymn) {
      if (item.hymn_number && item.hymn_title) {
        lines.push(
          `**${item.title}:** #${item.hymn_number} — ${item.hymn_title}`
        );
      } else {
        lines.push(`**${item.title}:** TBD`);
      }
      if (item.item_notes) {
        lines.push("");
        lines.push(htmlToMarkdown(item.item_notes));
      }
      lines.push("");
      continue;
    }

    // Speaker items — must be checked before participant items because
    // speaker items may also have requires_participant=true when loaded
    // from an existing meeting (speaker_id is present).
    if (item.category === "speaker") {
      // Use the item's title as the label (supports renamed speaker items)
      const speakerLabel = item.title?.trim() || "Speaker";
      if (item.speaker_name) {
        lines.push(`**${speakerLabel}:** ${item.speaker_name}`);
      } else {
        lines.push(`**${speakerLabel}:** TBD`);
      }
      if (item.item_notes) {
        lines.push("");
        lines.push(htmlToMarkdown(item.item_notes));
      }
      lines.push("");
      continue;
    }

    // Participant items (prayers, etc.)
    if (item.requires_participant) {
      if (item.participant_name) {
        lines.push(`**${item.title}:** ${item.participant_name}`);
      } else {
        lines.push(`**${item.title}:** TBD`);
      }
      if (item.item_notes) {
        lines.push("");
        lines.push(htmlToMarkdown(item.item_notes));
      }
      lines.push("");
      continue;
    }

    // Other procedural items
    lines.push(`**${item.title}**`);
    if (item.item_notes) {
      lines.push("");
      lines.push(htmlToMarkdown(item.item_notes));
    }
    lines.push("");
  }

  // Meeting Notes (added at the end)
  if (data.meetingNotes) {
    if (lines[lines.length - 1] !== "") lines.push("");
    lines.push("---");
    lines.push("");
    lines.push("## Meeting Notes");
    lines.push("");
    lines.push(htmlToMarkdown(data.meetingNotes));
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}
