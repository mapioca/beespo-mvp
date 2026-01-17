import { createClient } from "@/lib/supabase/client";
import type { OutputData } from "@editorjs/editorjs";
import { debounce } from "lodash";

const DEBOUNCE_DELAY = 2000; // 2 seconds

/**
 * Service for managing meeting and agenda item notes
 */
class NotesService {
  private pendingUpdates: Map<string, OutputData> = new Map();

  /**
   * Save global meeting notes (debounced)
   */
  private _saveGlobalNotes = async (meetingId: string, notes: OutputData) => {
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("meetings") as any)
        .update({ notes })
        .eq("id", meetingId);

      if (error) {
        console.error("Failed to save global notes:", error);
      } else {
        console.log("Global notes saved successfully");
        this.pendingUpdates.delete(`global-${meetingId}`);
      }
    } catch (err) {
      console.error("Error saving global notes:", err);
    }
  };

  /**
   * Save agenda item notes (debounced)
   */
  private _saveItemNotes = async (itemId: string, notes: OutputData) => {
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("agenda_items") as any)
        .update({ notes })
        .eq("id", itemId);

      if (error) {
        console.error("Failed to save item notes:", error);
      } else {
        console.log("Item notes saved successfully");
        this.pendingUpdates.delete(`item-${itemId}`);
      }
    } catch (err) {
      console.error("Error saving item notes:", err);
    }
  };

  // Debounced versions
  saveGlobalNotes = debounce(this._saveGlobalNotes, DEBOUNCE_DELAY);
  saveItemNotes = debounce(this._saveItemNotes, DEBOUNCE_DELAY);

  /**
   * Queue notes for saving (will be debounced)
   */
  queueGlobalNotes(meetingId: string, notes: OutputData) {
    this.pendingUpdates.set(`global-${meetingId}`, notes);
    this.saveGlobalNotes(meetingId, notes);
  }

  /**
   * Queue item notes for saving (will be debounced)
   */
  queueItemNotes(itemId: string, notes: OutputData) {
    this.pendingUpdates.set(`item-${itemId}`, notes);
    this.saveItemNotes(itemId, notes);
  }

  /**
   * Force immediate save of all pending notes
   */
  async flushAll() {
    // Cancel debounced calls and save immediately
    this.saveGlobalNotes.cancel();
    this.saveItemNotes.cancel();

    const promises: Promise<void>[] = [];

    for (const [key, notes] of this.pendingUpdates.entries()) {
      if (key.startsWith("global-")) {
        const meetingId = key.replace("global-", "");
        promises.push(this._saveGlobalNotes(meetingId, notes));
      } else if (key.startsWith("item-")) {
        const itemId = key.replace("item-", "");
        promises.push(this._saveItemNotes(itemId, notes));
      }
    }

    await Promise.all(promises);
  }

  /**
   * Check if there are pending unsaved changes
   */
  hasPendingChanges(): boolean {
    return this.pendingUpdates.size > 0;
  }

  /**
   * Load global meeting notes
   */
  async loadGlobalNotes(meetingId: string): Promise<OutputData | null> {
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("meetings") as any)
        .select("notes")
        .eq("id", meetingId)
        .single();

      if (error) {
        console.error("Failed to load global notes:", error);
        return null;
      }

      return data?.notes || null;
    } catch (err) {
      console.error("Error loading global notes:", err);
      return null;
    }
  }

  /**
   * Load agenda item notes
   */
  async loadItemNotes(itemId: string): Promise<OutputData | null> {
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("agenda_items") as any)
        .select("notes")
        .eq("id", itemId)
        .single();

      if (error) {
        console.error("Failed to load item notes:", error);
        return null;
      }

      return data?.notes || null;
    } catch (err) {
      console.error("Error loading item notes:", err);
      return null;
    }
  }
}

// Singleton instance
export const notesService = new NotesService();

// Default empty notes structure
export const defaultEditorData: OutputData = {
  time: Date.now(),
  blocks: [],
  version: "2.31.0",
};

/**
 * Create a timestamp block for Editor.js
 */
export function createTimestampBlock(elapsedSeconds: number): OutputData["blocks"][0] {
  const hours = Math.floor(elapsedSeconds / 3600);
  const mins = Math.floor((elapsedSeconds % 3600) / 60);
  const secs = elapsedSeconds % 60;

  const timestamp = hours > 0
    ? `[${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}]`
    : `[${mins}:${secs.toString().padStart(2, "0")}]`;

  return {
    type: "paragraph",
    data: {
      text: `<mark class="cdx-marker">${timestamp}</mark> `,
    },
  };
}
