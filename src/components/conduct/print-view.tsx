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
    <div className="print-view hidden print:block">
      {/* Header */}
      <header className="print-header mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold">{meeting.title}</h1>
        <p className="text-sm text-gray-600">
          {format(new Date(meeting.scheduled_date), "EEEE, MMMM d, yyyy")}
        </p>
      </header>

      {/* Global Notes Section */}
      {globalNotes && globalNotes.blocks.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 border-b pb-1">Meeting Notes</h2>
          <div className="prose prose-sm max-w-none">
            <EditorDataRenderer data={globalNotes} />
          </div>
        </section>
      )}

      {/* Agenda Items */}
      <section>
        <h2 className="text-lg font-semibold mb-4 border-b pb-1">Agenda</h2>
        <div className="space-y-6">
          {items.map((item, idx) => {
            const notes = itemNotes[item.id];
            const hasNotes = notes && notes.blocks.length > 0;

            return (
              <div key={item.id} className="print-agenda-item">
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-lg font-bold text-gray-400">
                    {idx + 1}.
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{item.title}</h3>
                      <span className="text-xs text-gray-500 uppercase">
                        {item.item_type}
                      </span>
                      {item.is_completed && (
                        <span className="text-xs text-green-600">[Completed]</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {item.description}
                      </p>
                    )}
                    {item.participant_name && (
                      <p className="text-sm text-gray-500 mt-1">
                        Assigned to: {item.participant_name}
                      </p>
                    )}
                  </div>
                  {item.duration_minutes && (
                    <span className="text-sm text-gray-500">
                      {item.duration_minutes} min
                    </span>
                  )}
                </div>

                {/* Item Notes */}
                {hasNotes && (
                  <div className="ml-8 mt-2 pl-4 border-l-2 border-gray-200">
                    <div className="prose prose-sm max-w-none">
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
      <footer className="mt-12 pt-4 border-t text-xs text-gray-500 text-center">
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
          className="mb-2"
          dangerouslySetInnerHTML={{ __html: block.data.text || "" }}
        />
      );

    case "header": {
      const level = block.data.level || 3;
      if (level === 2) return <h2 className="font-semibold mb-2">{block.data.text}</h2>;
      if (level === 3) return <h3 className="font-semibold mb-2">{block.data.text}</h3>;
      return <h4 className="font-semibold mb-2">{block.data.text}</h4>;
    }

    case "list":
      const ListTag = block.data.style === "ordered" ? "ol" : "ul";
      return (
        <ListTag className={ListTag === "ol" ? "list-decimal" : "list-disc"} style={{ paddingLeft: "1.5rem" }}>
          {block.data.items?.map((item: string, i: number) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ListTag>
      );

    case "checklist":
      return (
        <div className="space-y-1">
          {block.data.items?.map((item: { text: string; checked: boolean }, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <span>{item.checked ? "☑" : "☐"}</span>
              <span dangerouslySetInnerHTML={{ __html: item.text }} />
            </div>
          ))}
        </div>
      );

    case "quote":
      return (
        <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2">
          <p dangerouslySetInnerHTML={{ __html: block.data.text || "" }} />
          {block.data.caption && (
            <cite className="text-sm text-gray-500">— {block.data.caption}</cite>
          )}
        </blockquote>
      );

    case "code":
      return (
        <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto my-2">
          <code>{block.data.code}</code>
        </pre>
      );

    default:
      return null;
  }
}
