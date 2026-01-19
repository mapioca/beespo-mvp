"use client";

import { format } from "date-fns";
import { Database } from "@/types/database";
import { useConductMeetingStore } from "@/stores/conduct-meeting-store";
import type { OutputData } from "@editorjs/editorjs";

type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"];
type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface PrintViewProps {
  meeting: Meeting;
  items: AgendaItem[];
}

export function PrintView({ meeting, items }: PrintViewProps) {
  const { globalNotes, itemNotes } = useConductMeetingStore();

  return (
    <div className="print-view">
      {/* Header */}
      <header className="print-header">
        <h1>{meeting.title}</h1>
        <p>
          {format(new Date(meeting.scheduled_date), "EEEE, MMMM d, yyyy")}
        </p>
      </header>

      {/* Global Notes Section */}
      {globalNotes && globalNotes.blocks.length > 0 && (
        <section>
          <h2>Meeting Notes</h2>
          <div className="prose">
            <EditorDataRenderer data={globalNotes} />
          </div>
        </section>
      )}

      {/* Agenda Items */}
      <section>
        <h2>Agenda</h2>
        <div className="space-y-6">
          {items.map((item, idx) => {
            const notes = itemNotes[item.id];
            const hasNotes = notes && notes.blocks.length > 0;

            return (
              <div key={item.id} className="print-agenda-item">
                <div className="flex items-start gap-3">
                  <span className="text-gray-400">
                    {idx + 1}.
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3>{item.title}</h3>
                      <span className="text-gray-500" style={{ fontSize: '10pt', textTransform: 'uppercase' }}>
                        {item.item_type}
                      </span>
                      {item.is_completed && (
                        <span className="text-green-600" style={{ fontSize: '10pt' }}>[Completed]</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-gray-600" style={{ fontSize: '11pt', marginTop: '0.25rem' }}>
                        {item.description}
                      </p>
                    )}
                    {item.participant_name && (
                      <p className="text-gray-500" style={{ fontSize: '10pt', marginTop: '0.25rem' }}>
                        Assigned to: {item.participant_name}
                      </p>
                    )}
                  </div>
                  {item.duration_minutes && (
                    <span className="text-gray-500" style={{ fontSize: '10pt' }}>
                      {item.duration_minutes} min
                    </span>
                  )}
                </div>

                {/* Item Notes */}
                {hasNotes && (
                  <div className="border-l-2" style={{ marginLeft: '2rem', marginTop: '0.5rem', paddingLeft: '1rem' }}>
                    <div className="prose">
                      <EditorDataRenderer data={notes} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer>
        <p>Generated from Beespo</p>
        <p>{format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</p>
      </footer>
    </div>
  );
}

// Simple renderer for Editor.js data
interface EditorDataRendererProps {
  data: OutputData;
}

function EditorDataRenderer({ data }: EditorDataRendererProps) {
  if (!data || !data.blocks) return null;

  return (
    <>
      {data.blocks.map((block, idx) => (
        <BlockRenderer key={idx} block={block} />
      ))}
    </>
  );
}

interface BlockRendererProps {
  block: OutputData["blocks"][0];
}

function BlockRenderer({ block }: BlockRendererProps) {
  switch (block.type) {
    case "paragraph":
      return (
        <p
          dangerouslySetInnerHTML={{ __html: block.data.text || "" }}
        />
      );

    case "header": {
      const level = block.data.level || 3;
      if (level === 2) return <h2>{block.data.text}</h2>;
      if (level === 3) return <h3>{block.data.text}</h3>;
      return <h4>{block.data.text}</h4>;
    }

    case "list":
      const ListTag = block.data.style === "ordered" ? "ol" : "ul";
      return (
        <ListTag className={ListTag === "ol" ? "list-decimal" : "list-disc"}>
          {block.data.items?.map((item: string, i: number) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ListTag>
      );

    case "checklist":
      return (
        <div>
          {block.data.items?.map((item: { text: string; checked: boolean }, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span>{item.checked ? "☑" : "☐"}</span>
              <span dangerouslySetInnerHTML={{ __html: item.text }} />
            </div>
          ))}
        </div>
      );

    case "quote":
      return (
        <blockquote>
          <p dangerouslySetInnerHTML={{ __html: block.data.text || "" }} />
          {block.data.caption && (
            <cite style={{ fontSize: '10pt', color: '#666' }}>— {block.data.caption}</cite>
          )}
        </blockquote>
      );

    case "code":
      return (
        <pre>
          <code>{block.data.code}</code>
        </pre>
      );

    default:
      return null;
  }
}
