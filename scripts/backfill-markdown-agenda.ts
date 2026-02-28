import { createClient } from "@supabase/supabase-js";
import { generateMeetingMarkdown, MeetingMarkdownData } from "@/lib/generate-meeting-markdown";
import type { CanvasItem } from "@/components/meetings/builder";
import { format } from "date-fns";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function backfill() {
    console.log("Fetching legacy meetings with null markdown_agenda...");

    // Select all meetings where markdown_agenda is null
    const { data: meetings, error } = await supabase
        .from("meetings")
        .select(`
            *,
            templates (name),
            profiles (full_name),
            workspaces!inner(slug, unit_name),
            agenda_items (
                id, item_type, title, description, order_index, duration_minutes,
                participant_name, hymn:hymns(title, hymn_number), child_items
            )
        `)
        .is("markdown_agenda", null);

    if (error) {
        console.error("Failed to fetch meetings:", error);
        process.exit(1);
    }

    if (!meetings || meetings.length === 0) {
        console.log("No legacy meetings found. Process complete.");
        return;
    }

    console.log(`Found ${meetings.length} legacy meeting(s) to process.`);

    let updatedCount = 0;

    for (const meeting of meetings) {
        if (!meeting.agenda_items || meeting.agenda_items.length === 0) {
            console.log(`Skipping meeting ${meeting.id} - no built agenda items.`);
            continue;
        }

        const rawRoles = meeting.roles || {};
        const roles: Record<string, any> = typeof rawRoles === "string" ? JSON.parse(rawRoles) : rawRoles;

        // We do a "best effort" mapping to convert DB AgendaItem specs back to the CanvasItem structures used in generateMeetingMarkdown
        const canvasItems: CanvasItem[] = meeting.agenda_items.map((item: any) => {
            // Supabase one-to-one returns object, one-to-many returns array. Assuming object here based on earlier schema assumptions.
            const hymnObj = Array.isArray(item.hymn) ? item.hymn[0] : item.hymn;

            return {
                id: item.id,
                category: item.item_type as any,
                title: item.title,
                description: item.description,
                duration_minutes: item.duration_minutes || 0,
                order_index: item.order_index,
                is_hymn: item.item_type === "hymn",
                hymn_title: hymnObj?.title,
                hymn_number: hymnObj?.hymn_number,
                requires_participant: ["prayer", "speaker"].includes(item.item_type),
                participant_name: item.participant_name || undefined,
                speaker_name: item.participant_name || undefined,
                isContainer: ["discussion", "business", "announcement"].includes(item.item_type),
                containerType: item.item_type as any,
                childItems: item.child_items || [],
                structural_type: item.item_type === "structural"
                    ? (item.title === "Divider" ? "divider" : "section_header")
                    : undefined,
            };
        });

        const scheduledDate = new Date(meeting.scheduled_date);
        const time = format(scheduledDate, "HH:mm");

        const data: MeetingMarkdownData = {
            title: meeting.title,
            date: scheduledDate,
            time: time,
            unitName: Array.isArray(meeting.workspaces) ? meeting.workspaces[0]?.unit_name || "" : meeting.workspaces?.unit_name || "",
            presiding: roles.presiding?.name,
            conducting: roles.conducting?.name,
            chorister: roles.chorister?.name,
            pianistOrganist: roles.organist?.name,
            canvasItems,
        };

        try {
            const generatedMd = generateMeetingMarkdown(data);

            const { error: updateError } = await supabase
                .from("meetings")
                .update({ markdown_agenda: generatedMd })
                .eq("id", meeting.id);

            if (updateError) {
                console.error(`Error updating meeting ${meeting.id}:`, updateError);
            } else {
                console.log(`Successfully backfilled markdown_agenda for meeting: ${meeting.title}`);
                updatedCount++;
            }
        } catch (e) {
            console.error(`Failed generation sequence for meeting ${meeting.id}:`, e);
        }
    }

    console.log(`Backfill Job Finished. Successfully updated ${updatedCount} meetings.`);
}

backfill();
