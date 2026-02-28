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
  canvasItems: CanvasItem[];
}

const CONTAINER_HEADERS: Record<string, string> = {
  discussion: "Discussions",
  business: "Ward Business",
  announcement: "Announcements",
};

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
      const header = CONTAINER_HEADERS[item.containerType] || item.title;
      lines.push(`## ${header}`);
      lines.push("");

      const children = item.childItems || [];
      if (children.length === 0) {
        lines.push("*No items*");
        lines.push("");
      } else {
        for (const child of children) {
          let bullet = `- **${child.title}**`;
          if (child.description) {
            bullet += ` — ${child.description}`;
          }
          if (child.priority && child.priority !== "normal") {
            bullet += ` *(${child.priority} priority)*`;
          }
          lines.push(bullet);
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
          `*${item.title}:* #${item.hymn_number} — ${item.hymn_title}`
        );
      } else {
        lines.push(`*${item.title}:* TBD`);
      }
      lines.push("");
      continue;
    }

    // Participant items (prayers, etc.)
    if (item.requires_participant) {
      if (item.participant_name) {
        lines.push(`*${item.title}:* ${item.participant_name}`);
      } else {
        lines.push(`*${item.title}:* TBD`);
      }
      lines.push("");
      continue;
    }

    // Speaker items
    if (item.category === "speaker") {
      if (item.speaker_name) {
        lines.push(`*Speaker:* ${item.speaker_name}`);
      } else {
        lines.push(`*Speaker:* TBD`);
      }
      if (item.title && item.title !== "Speaker") {
        lines.push(`  Topic: ${item.title}`);
      }
      lines.push("");
      continue;
    }

    // Other procedural items
    lines.push(`*${item.title}*`);
    if (item.description) {
      lines.push(`${item.description}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}
