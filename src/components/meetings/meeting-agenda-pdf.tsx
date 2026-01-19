"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { Database } from "@/types/database";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
  templates?: { name: string } | null;
};
type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"] & {
  hymn?: { title: string; hymn_number: number } | null;
};

interface MeetingAgendaPDFProps {
  meeting: Meeting;
  agendaItems: AgendaItem[];
}

// Register fonts - using built-in Helvetica
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
    { src: "Helvetica-Oblique", fontStyle: "italic" },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 72, // 1 inch margins (72pt = 1 inch)
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 24,
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
  },
  templateName: {
    fontSize: 10,
    color: "#888888",
    marginTop: 4,
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    marginVertical: 16,
  },
  agendaContainer: {
    marginTop: 8,
  },
  agendaItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eeeeee",
  },
  agendaItemLast: {
    borderBottomWidth: 0,
  },
  agendaLeft: {
    flex: 1,
    paddingRight: 16,
  },
  agendaTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 2,
  },
  agendaDescription: {
    fontSize: 10,
    color: "#666666",
    marginTop: 2,
  },
  agendaRight: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    minWidth: 120,
  },
  participantName: {
    fontSize: 11,
    color: "#333333",
    textAlign: "right",
  },
  hymnInfo: {
    fontSize: 10,
    color: "#555555",
    textAlign: "right",
  },
  duration: {
    fontSize: 9,
    color: "#888888",
    marginTop: 2,
    textAlign: "right",
  },
  sectionHeader: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  sectionHeaderText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#666666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  footer: {
    position: "absolute",
    bottom: 36,
    left: 72,
    right: 72,
    textAlign: "center",
    fontSize: 9,
    color: "#999999",
    borderTopWidth: 0.5,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
});


export function MeetingAgendaPDF({ meeting, agendaItems }: MeetingAgendaPDFProps) {
  const formattedDate = format(
    new Date(meeting.scheduled_date),
    "EEEE, MMMM d, yyyy • h:mm a"
  );

  // Render items in order (not grouped)
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>{meeting.title}</Text>
          <Text style={styles.subtitle}>{formattedDate}</Text>
          {meeting.templates?.name && (
            <Text style={styles.templateName}>
              Based on: {meeting.templates.name}
            </Text>
          )}
        </View>

        <View style={styles.separator} />

        {/* Agenda Items */}
        <View style={styles.agendaContainer}>
          {agendaItems.map((item, index) => (
            <View
              key={item.id}
              style={
                index === agendaItems.length - 1
                  ? [styles.agendaItem, styles.agendaItemLast]
                  : styles.agendaItem
              }
            >
              <View style={styles.agendaLeft}>
                <Text style={styles.agendaTitle}>{item.title}</Text>
                {item.description && (
                  <Text style={styles.agendaDescription}>
                    {item.description}
                  </Text>
                )}
              </View>

              <View style={styles.agendaRight}>
                {/* Show participant name for speakers/prayers */}
                {item.participant_name && (
                  <Text style={styles.participantName}>
                    {item.participant_name}
                  </Text>
                )}

                {/* Show hymn info if available */}
                {item.hymn && (
                  <View>
                    <Text style={styles.participantName}>
                      {item.hymn.title}
                    </Text>
                    <Text style={styles.hymnInfo}>
                      Hymn #{item.hymn.hymn_number}
                    </Text>
                  </View>
                )}

                {/* Show duration if available */}
                {item.duration_minutes && (
                  <Text style={styles.duration}>
                    {item.duration_minutes} min
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            Generated from Beespo • {format(new Date(), "MMM d, yyyy")}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// Export filename generator
export function getMeetingPDFFilename(meeting: Meeting): string {
  const dateStr = format(new Date(meeting.scheduled_date), "yyyy-MM-dd");
  return `Agenda-${dateStr}.pdf`;
}
