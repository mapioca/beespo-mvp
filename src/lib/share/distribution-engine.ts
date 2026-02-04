/**
 * Distribution Engine for generating meeting exports
 * Supports Markdown, HTML (inline styles), and ICS formats
 */

import type { PublicMeetingData, PublicAgendaItem, ExportResult } from "@/types/share";

/**
 * Format a date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a date for ICS (YYYYMMDDTHHMMSSZ format)
 */
function formatIcsDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Calculate total duration from agenda items in minutes
 */
function calculateTotalDuration(items: PublicAgendaItem[]): number {
  return items.reduce((total, item) => total + (item.duration_minutes || 0), 0);
}

/**
 * Escape special characters for ICS format
 */
function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Generate Markdown export for Slack/WhatsApp
 */
export function generateMarkdownExport(
  meeting: PublicMeetingData,
  items: PublicAgendaItem[],
  publicUrl?: string
): ExportResult {
  const sortedItems = [...items].sort((a, b) => a.order_index - b.order_index);
  const totalDuration = calculateTotalDuration(sortedItems);

  let content = `# ${meeting.title}\n\n`;
  content += `**Date:** ${formatDate(meeting.scheduled_date)}\n`;

  if (meeting.description) {
    content += `**Description:** ${meeting.description}\n`;
  }

  if (totalDuration > 0) {
    content += `**Estimated Duration:** ${totalDuration} minutes\n`;
  }

  content += `\n## Agenda\n\n`;

  sortedItems.forEach((item, index) => {
    const duration = item.duration_minutes ? ` (${item.duration_minutes} min)` : "";
    const presenter = item.participant_name ? ` - ${item.participant_name}` : "";
    const status = item.is_completed ? " [Completed]" : "";

    content += `${index + 1}. **${item.title}**${duration}${presenter}${status}\n`;

    if (item.description) {
      content += `   ${item.description}\n`;
    }
    content += "\n";
  });

  if (publicUrl) {
    content += `---\n\n[View full meeting details](${publicUrl})\n`;
  }

  return {
    content,
    filename: `${meeting.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-agenda.md`,
    mimeType: "text/markdown",
  };
}

/**
 * Generate HTML export with inline styles for email client compatibility
 */
export function generateHtmlExport(
  meeting: PublicMeetingData,
  items: PublicAgendaItem[],
  publicUrl?: string
): ExportResult {
  const sortedItems = [...items].sort((a, b) => a.order_index - b.order_index);
  const totalDuration = calculateTotalDuration(sortedItems);

  let content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(meeting.title)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">${escapeHtml(meeting.title)}</h1>
  </div>

  <div style="background: #f8f9fa; padding: 16px; border-left: 1px solid #e9ecef; border-right: 1px solid #e9ecef;">
    <p style="margin: 0 0 8px 0; color: #666;">
      <strong style="color: #333;">Date:</strong> ${formatDate(meeting.scheduled_date)}
    </p>`;

  if (meeting.description) {
    content += `
    <p style="margin: 0 0 8px 0; color: #666;">
      <strong style="color: #333;">Description:</strong> ${escapeHtml(meeting.description)}
    </p>`;
  }

  if (totalDuration > 0) {
    content += `
    <p style="margin: 0; color: #666;">
      <strong style="color: #333;">Estimated Duration:</strong> ${totalDuration} minutes
    </p>`;
  }

  content += `
  </div>

  <div style="background: white; padding: 24px; border: 1px solid #e9ecef; border-top: none;">
    <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 8px;">Agenda</h2>
    <ol style="margin: 0; padding-left: 20px;">`;

  sortedItems.forEach((item) => {
    const duration = item.duration_minutes ? ` <span style="color: #888; font-size: 14px;">(${item.duration_minutes} min)</span>` : "";
    const presenter = item.participant_name ? ` <span style="color: #667eea; font-size: 14px;">- ${escapeHtml(item.participant_name)}</span>` : "";
    const statusStyle = item.is_completed ? "text-decoration: line-through; color: #888;" : "";
    const completedBadge = item.is_completed ? ` <span style="background: #28a745; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; margin-left: 8px;">Completed</span>` : "";

    content += `
      <li style="margin-bottom: 16px; ${statusStyle}">
        <strong style="color: #333;">${escapeHtml(item.title)}</strong>${duration}${presenter}${completedBadge}`;

    if (item.description) {
      content += `
        <p style="margin: 4px 0 0 0; color: #666; font-size: 14px;">${escapeHtml(item.description)}</p>`;
    }

    content += `
      </li>`;
  });

  content += `
    </ol>
  </div>`;

  if (publicUrl) {
    content += `
  <div style="background: #f8f9fa; padding: 16px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 8px 8px; text-align: center;">
    <a href="${escapeHtml(publicUrl)}" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 500;">View Full Meeting Details</a>
  </div>`;
  }

  content += `

  <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e9ecef; text-align: center;">
    <p style="margin: 0; color: #888; font-size: 12px;">Powered by Beespo</p>
  </div>
</body>
</html>`;

  return {
    content,
    filename: `${meeting.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-agenda.html`,
    mimeType: "text/html",
  };
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generate ICS calendar export
 */
export function generateIcsExport(
  meeting: PublicMeetingData,
  items: PublicAgendaItem[],
  publicUrl?: string
): ExportResult {
  const sortedItems = [...items].sort((a, b) => a.order_index - b.order_index);
  const totalDuration = calculateTotalDuration(sortedItems);

  const startDate = new Date(meeting.scheduled_date);
  const endDate = new Date(startDate.getTime() + (totalDuration || 60) * 60 * 1000);

  // Build agenda summary for description
  let agendaSummary = "AGENDA:\\n\\n";
  sortedItems.forEach((item, index) => {
    const duration = item.duration_minutes ? ` (${item.duration_minutes} min)` : "";
    const presenter = item.participant_name ? ` - ${item.participant_name}` : "";
    agendaSummary += `${index + 1}. ${item.title}${duration}${presenter}\\n`;
  });

  if (publicUrl) {
    agendaSummary += `\\n---\\nView details: ${publicUrl}`;
  }

  const uid = `${meeting.id}@beespo.app`;
  const dtstamp = formatIcsDate(new Date().toISOString());
  const dtstart = formatIcsDate(startDate.toISOString());
  const dtend = formatIcsDate(endDate.toISOString());

  const content = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Beespo//Meeting Agenda//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${escapeIcs(meeting.title)}
DESCRIPTION:${escapeIcs(agendaSummary)}${publicUrl ? `\\nURL: ${publicUrl}` : ""}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;

  return {
    content,
    filename: `${meeting.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.ics`,
    mimeType: "text/calendar",
  };
}

/**
 * Generate export based on format
 */
export function generateExport(
  format: "markdown" | "html" | "ics",
  meeting: PublicMeetingData,
  items: PublicAgendaItem[],
  publicUrl?: string
): ExportResult {
  switch (format) {
    case "markdown":
      return generateMarkdownExport(meeting, items, publicUrl);
    case "html":
      return generateHtmlExport(meeting, items, publicUrl);
    case "ics":
      return generateIcsExport(meeting, items, publicUrl);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
