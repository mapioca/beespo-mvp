"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import callingsCatalog from "@/data/callings.json";
import type {
    CallingCandidateStatus,
    CallingProcessStage,
    CallingProcessStatus,
    CallingStageStatus,
    CallingStageStatuses,
    CallingHistoryAction
} from "@/types/database";
import {
    getAllStages,
    resolveStageStatuses,
    highestCompletedStageIndex,
} from "@/lib/calling-utils";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function getCallingProfile(
    supabase: SupabaseServerClient,
    requireEditor = false
) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("workspace_id, role")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) return { error: "Profile not found" };
    if (requireEditor && !['admin', 'leader'].includes(profile.role)) {
        return { error: "Insufficient permissions" };
    }

    return {
        user,
        profile: profile as { workspace_id: string; role: string },
    };
}

async function ensureCandidateName(
    supabase: SupabaseServerClient,
    workspaceId: string,
    userId: string,
    name: string
) {
    const trimmedName = name.trim();
    const { data: existing } = await (supabase
        .from("candidate_names") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("id, name")
        .eq("workspace_id", workspaceId)
        .ilike("name", trimmedName)
        .maybeSingle();

    if (existing) return { candidate: existing };

    const { data: candidate, error } = await (supabase
        .from("candidate_names") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            workspace_id: workspaceId,
            name: trimmedName,
            created_by: userId,
        })
        .select("id, name")
        .single();

    if (error) return { error: error.message };
    return { candidate };
}

async function ensureCalling(
    supabase: SupabaseServerClient,
    workspaceId: string,
    userId: string,
    input: { title: string; organization?: string | null }
) {
    const title = input.title.trim();
    const organization = input.organization?.trim() || null;
    let query = (supabase
        .from("callings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("id, title, organization, created_at")
        .eq("workspace_id", workspaceId)
        .eq("title", title);

    query = organization ? query.eq("organization", organization) : query.is("organization", null);

    const { data: existing } = await query.maybeSingle();
    if (existing) return { calling: existing };

    const { data: calling, error } = await (supabase
        .from("callings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            workspace_id: workspaceId,
            title,
            organization,
            created_by: userId,
        })
        .select("id, title, organization, created_at")
        .single();

    if (error) return { error: error.message };
    return { calling };
}

async function ensureCallingCandidate(
    supabase: SupabaseServerClient,
    userId: string,
    callingId: string,
    candidateNameId: string,
    notes?: string | null
) {
    const { data: existing } = await (supabase
        .from("calling_candidates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("id, calling_id, candidate_name_id, status, notes")
        .eq("calling_id", callingId)
        .eq("candidate_name_id", candidateNameId)
        .maybeSingle();

    if (existing) {
        const updateData: Record<string, string | null> = {
            status: existing.status === 'archived' ? 'proposed' : existing.status,
            updated_at: new Date().toISOString(),
        };
        if (notes !== undefined) updateData.notes = notes || null;

        const { data: updated, error } = await (supabase
            .from("calling_candidates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .update(updateData)
            .eq("id", existing.id)
            .select("id, calling_id, candidate_name_id, status, notes")
            .single();

        if (error) return { error: error.message };
        return { callingCandidate: updated };
    }

    const { data: callingCandidate, error } = await (supabase
        .from("calling_candidates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            calling_id: callingId,
            candidate_name_id: candidateNameId,
            status: 'proposed' as CallingCandidateStatus,
            notes: notes || null,
            created_by: userId,
        })
        .select("id, calling_id, candidate_name_id, status, notes")
        .single();

    if (error) return { error: error.message };
    return { callingCandidate };
}

// =====================================================
// CALLINGS BOARD (Vacancies + Member Considerations)
// =====================================================

export async function getCallingBoardData() {
    const supabase = await createClient();
    const auth = await getCallingProfile(supabase);
    if ("error" in auth) return { error: auth.error };

    const workspaceId = auth.profile.workspace_id;

    // Round 1: fetch independent top-level data in parallel
    const [
        { data: dbCallings, error: callingsError },
        { data: vacancyRows, error: vacanciesError },
        { data: considerationRows, error: considerationsError },
        { data: processRows, error: processesError },
    ] = await Promise.all([
        (supabase.from("callings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .select("id, title, organization")
            .eq("workspace_id", workspaceId)
            .order("title", { ascending: true }),
        (supabase.from("calling_vacancies") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .select(`
                id,
                notes,
                created_at,
                calling:callings(id, title, organization)
            `)
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: false }),
        (supabase.from("calling_considerations") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .select("id, directory_id, candidate_name_id, member_name, notes, created_at")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: false }),
        (supabase.from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .select(`
                id,
                current_stage,
                status,
                stage_statuses,
                dropped_reason,
                created_at,
                updated_at,
                candidate:candidate_names(id, name),
                calling:callings!calling_processes_calling_id_fkey(id, title, organization, workspace_id)
            `)
            .eq("calling.workspace_id", workspaceId)
            .order("updated_at", { ascending: false }),
    ]);

    const callingOptionsByKey = new Map<string, {
        id: string;
        callingId: string | null;
        title: string;
        organization: string;
    }>();

    for (const calling of callingsError ? [] : dbCallings || []) {
        const organization = calling.organization || "";
        callingOptionsByKey.set(`${calling.title}::${organization}`, {
            id: calling.id,
            callingId: calling.id,
            title: calling.title,
            organization,
        });
    }

    for (const catalogCalling of callingsCatalog.filter((calling) => calling.active)) {
        const title = catalogCalling.labels.en;
        const organization = formatCatalogOrganization(catalogCalling.organization);
        const key = `${title}::${organization}`;

        if (!callingOptionsByKey.has(key)) {
            callingOptionsByKey.set(key, {
                id: `catalog:${catalogCalling.id}`,
                callingId: null,
                title,
                organization,
            });
        }
    }

    const callingOptions = Array.from(callingOptionsByKey.values()).sort((a, b) =>
        a.title.localeCompare(b.title)
    );

    const warnings: string[] = [];
    if (vacanciesError) warnings.push(vacanciesError.message);
    if (considerationsError) warnings.push(considerationsError.message);
    if (processesError) warnings.push(processesError.message);

    const pipelineProcesses = (processRows || [])
        .filter((p: any) => p.calling !== null) // eslint-disable-line @typescript-eslint/no-explicit-any
        .map((p: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
            id: p.id,
            currentStage: p.current_stage,
            status: p.status,
            stageStatuses: resolveStageStatuses(p.stage_statuses as CallingStageStatuses | null, p.current_stage),
            droppedReason: p.dropped_reason,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
            candidateName: p.candidate?.name || "Unknown member",
            callingId: p.calling.id,
            callingTitle: p.calling.title,
            organization: p.calling.organization || "",
        }));

    // Round 2: fetch dependent child data in parallel
    const vacancyCallingIds = (vacancyRows || [])
        .map((row: any) => row.calling?.id) // eslint-disable-line @typescript-eslint/no-explicit-any
        .filter(Boolean);

    const considerationIds = (considerationRows || []).map((row: any) => row.id); // eslint-disable-line @typescript-eslint/no-explicit-any

    const [
        { data: vacancyCandidates },
        { data: vacancyProcesses },
        { data: considerationLinks },
    ] = await Promise.all([
        vacancyCallingIds.length > 0
            ? (supabase.from("calling_candidates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .select(`
                    id,
                    calling_id,
                    candidate_name_id,
                    notes,
                    status,
                    candidate:candidate_names(id, name)
                `)
                .in("calling_id", vacancyCallingIds)
                .neq("status", "archived")
                .order("created_at", { ascending: true })
            : Promise.resolve({ data: [] }),
        vacancyCallingIds.length > 0
            ? (supabase.from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .select(`
                    calling_id,
                    candidate_name_id,
                    candidate:candidate_names(id, name)
                `)
                .in("calling_id", vacancyCallingIds)
                .eq("status", "active")
                .order("created_at", { ascending: true })
            : Promise.resolve({ data: [] }),
        considerationIds.length > 0
            ? (supabase.from("calling_consideration_options") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .select(`
                    id,
                    consideration_id,
                    status,
                    calling_candidate:calling_candidates(id, calling_id)
                `)
                .in("consideration_id", considerationIds)
            : Promise.resolve({ data: [] }),
    ]);

    const activeCandidateKeys = new Set(
        (vacancyProcesses || []).map((process: any) => `${process.calling_id}:${process.candidate_name_id}`) // eslint-disable-line @typescript-eslint/no-explicit-any
    );

    const vacancies = (vacancyRows || []).map((row: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const callingId = row.calling?.id;
        return {
            id: row.id,
            callingId,
            callingTitle: row.calling?.title || "Unknown calling",
            organization: row.calling?.organization || "",
            notes: row.notes || "",
            createdAt: row.created_at,
            candidates: (vacancyCandidates || [])
                .filter((candidate: any) => candidate.calling_id === callingId) // eslint-disable-line @typescript-eslint/no-explicit-any
                .filter((candidate: any) => !activeCandidateKeys.has(`${candidate.calling_id}:${candidate.candidate_name_id}`)) // eslint-disable-line @typescript-eslint/no-explicit-any
                .map((candidate: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
                    id: candidate.id,
                    memberId: candidate.candidate_name_id,
                    name: candidate.candidate?.name || "Unknown member",
                    notes: candidate.notes || "",
                })),
            inPipelineNames: (vacancyProcesses || [])
                .filter((process: any) => process.calling_id === callingId) // eslint-disable-line @typescript-eslint/no-explicit-any
                .map((process: any) => process.candidate?.name || "Unknown member"), // eslint-disable-line @typescript-eslint/no-explicit-any
        };
    });

    const considerations = (considerationRows || []).map((row: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const links = (considerationLinks || []).filter(
            (link: any) => link.consideration_id === row.id // eslint-disable-line @typescript-eslint/no-explicit-any
        );

        return {
            id: row.id,
            memberId: row.directory_id || row.candidate_name_id,
            memberName: row.member_name,
            notes: row.notes || "",
            createdAt: row.created_at,
            candidateCallingIds: links
                .filter((link: any) => link.status === "possible") // eslint-disable-line @typescript-eslint/no-explicit-any
                .map((link: any) => link.calling_candidate?.calling_id) // eslint-disable-line @typescript-eslint/no-explicit-any
                .filter(Boolean),
            pipelineCallingIds: links
                .filter((link: any) => link.status === "in_pipeline") // eslint-disable-line @typescript-eslint/no-explicit-any
                .map((link: any) => link.calling_candidate?.calling_id) // eslint-disable-line @typescript-eslint/no-explicit-any
                .filter(Boolean),
        };
    });

    return {
        success: true,
        callingOptions,
        vacancies,
        considerations,
        pipelineProcesses,
        warning: warnings.length > 0 ? warnings.join("; ") : undefined,
    };
}

function formatCatalogOrganization(org: string): string {
    return org
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export async function createCallingVacancyCard(input: {
    title: string;
    organization?: string | null;
    notes?: string | null;
}) {
    const supabase = await createClient();
    const auth = await getCallingProfile(supabase, true);
    if ("error" in auth) return { error: auth.error };

    const callingResult = await ensureCalling(
        supabase,
        auth.profile.workspace_id,
        auth.user.id,
        input
    );
    if ("error" in callingResult) return { error: callingResult.error };

    const { error } = await (supabase
        .from("calling_vacancies") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .upsert({
            workspace_id: auth.profile.workspace_id,
            calling_id: callingResult.calling.id,
            notes: input.notes || null,
            created_by: auth.user.id,
            updated_at: new Date().toISOString(),
        }, { onConflict: "workspace_id,calling_id" });

    if (error) return { error: error.message };
    revalidatePath("/callings");
    return { success: true };
}

export async function updateCallingVacancyNotes(vacancyId: string, notes: string) {
    const supabase = await createClient();
    const auth = await getCallingProfile(supabase, true);
    if ("error" in auth) return { error: auth.error };

    const { error } = await (supabase
        .from("calling_vacancies") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update({ notes: notes || null, updated_at: new Date().toISOString() })
        .eq("id", vacancyId)
        .eq("workspace_id", auth.profile.workspace_id);

    if (error) return { error: error.message };
    revalidatePath("/callings");
    return { success: true };
}

export async function deleteCallingVacancyCard(vacancyId: string) {
    const supabase = await createClient();
    const auth = await getCallingProfile(supabase, true);
    if ("error" in auth) return { error: auth.error };

    const { error } = await (supabase
        .from("calling_vacancies") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .delete()
        .eq("id", vacancyId)
        .eq("workspace_id", auth.profile.workspace_id);

    if (error) return { error: error.message };
    revalidatePath("/callings");
    return { success: true };
}

export async function addVacancyCandidate(vacancyId: string, memberName: string, notes?: string) {
    const supabase = await createClient();
    const auth = await getCallingProfile(supabase, true);
    if ("error" in auth) return { error: auth.error };

    const { data: vacancy } = await (supabase
        .from("calling_vacancies") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("calling_id")
        .eq("id", vacancyId)
        .eq("workspace_id", auth.profile.workspace_id)
        .single();

    if (!vacancy?.calling_id) return { error: "Vacancy not found" };

    const candidateResult = await ensureCandidateName(
        supabase,
        auth.profile.workspace_id,
        auth.user.id,
        memberName
    );
    if ("error" in candidateResult) return { error: candidateResult.error };

    const callingCandidateResult = await ensureCallingCandidate(
        supabase,
        auth.user.id,
        vacancy.calling_id,
        candidateResult.candidate.id,
        notes || null
    );
    if ("error" in callingCandidateResult) return { error: callingCandidateResult.error };

    revalidatePath("/callings");
    return { success: true };
}

export async function updateVacancyCandidateNotes(callingCandidateId: string, notes: string) {
    return updateCallingCandidate(callingCandidateId, { notes: notes || null });
}

export async function startVacancyCandidatePipeline(callingCandidateId: string) {
    const supabase = await createClient();
    const auth = await getCallingProfile(supabase, true);
    if ("error" in auth) return { error: auth.error };

    const { data: candidate } = await (supabase
        .from("calling_candidates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("id, calling_id, candidate_name_id")
        .eq("id", callingCandidateId)
        .single();

    if (!candidate) return { error: "Candidate not found" };

    const { data: existingProcess } = await (supabase
        .from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("id")
        .eq("calling_id", candidate.calling_id)
        .eq("candidate_name_id", candidate.candidate_name_id)
        .eq("status", "active")
        .maybeSingle();

    if (!existingProcess) {
        const { error: processError } = await (supabase
            .from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .insert({
                calling_id: candidate.calling_id,
                candidate_name_id: candidate.candidate_name_id,
                calling_candidate_id: candidate.id,
                current_stage: 'defined' as CallingProcessStage,
                status: 'active' as CallingProcessStatus,
                created_by: auth.user.id,
            });

        if (processError) return { error: processError.message };
    }

    await updateCallingCandidate(callingCandidateId, { status: 'selected' as CallingCandidateStatus });
    revalidatePath("/callings");
    return { success: true };
}

export async function createMemberConsideration(input: {
    directoryId: string;
    memberName: string;
}) {
    const supabase = await createClient();
    const auth = await getCallingProfile(supabase, true);
    if ("error" in auth) return { error: auth.error };

    const candidateResult = await ensureCandidateName(
        supabase,
        auth.profile.workspace_id,
        auth.user.id,
        input.memberName
    );
    if ("error" in candidateResult) return { error: candidateResult.error };

    const { error } = await (supabase
        .from("calling_considerations") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .upsert({
            workspace_id: auth.profile.workspace_id,
            directory_id: input.directoryId,
            candidate_name_id: candidateResult.candidate.id,
            member_name: input.memberName,
            created_by: auth.user.id,
            updated_at: new Date().toISOString(),
        }, { onConflict: "workspace_id,candidate_name_id" });

    if (error) return { error: error.message };
    revalidatePath("/callings");
    return { success: true };
}

export async function updateMemberConsiderationNotes(considerationId: string, notes: string) {
    const supabase = await createClient();
    const auth = await getCallingProfile(supabase, true);
    if ("error" in auth) return { error: auth.error };

    const { error } = await (supabase
        .from("calling_considerations") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update({ notes: notes || null, updated_at: new Date().toISOString() })
        .eq("id", considerationId)
        .eq("workspace_id", auth.profile.workspace_id);

    if (error) return { error: error.message };
    revalidatePath("/callings");
    return { success: true };
}

export async function deleteMemberConsideration(considerationId: string) {
    const supabase = await createClient();
    const auth = await getCallingProfile(supabase, true);
    if ("error" in auth) return { error: auth.error };

    const { error } = await (supabase
        .from("calling_considerations") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .delete()
        .eq("id", considerationId)
        .eq("workspace_id", auth.profile.workspace_id);

    if (error) return { error: error.message };
    revalidatePath("/callings");
    return { success: true };
}

export async function addCallingToMemberConsideration(considerationId: string, input: {
    title: string;
    organization?: string | null;
}) {
    const supabase = await createClient();
    const auth = await getCallingProfile(supabase, true);
    if ("error" in auth) return { error: auth.error };

    const { data: consideration } = await (supabase
        .from("calling_considerations") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("id, candidate_name_id")
        .eq("id", considerationId)
        .eq("workspace_id", auth.profile.workspace_id)
        .single();

    if (!consideration) return { error: "Consideration not found" };

    const callingResult = await ensureCalling(
        supabase,
        auth.profile.workspace_id,
        auth.user.id,
        input
    );
    if ("error" in callingResult) return { error: callingResult.error };

    const candidateResult = await ensureCallingCandidate(
        supabase,
        auth.user.id,
        callingResult.calling.id,
        consideration.candidate_name_id
    );
    if ("error" in candidateResult) return { error: candidateResult.error };

    const { error } = await (supabase
        .from("calling_consideration_options") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .upsert({
            consideration_id: consideration.id,
            calling_candidate_id: candidateResult.callingCandidate.id,
            status: 'possible',
            updated_at: new Date().toISOString(),
        }, { onConflict: "consideration_id,calling_candidate_id" });

    if (error) return { error: error.message };
    revalidatePath("/callings");
    return { success: true };
}

export async function removeCallingFromMemberConsideration(considerationId: string, callingId: string) {
    const supabase = await createClient();
    const auth = await getCallingProfile(supabase, true);
    if ("error" in auth) return { error: auth.error };

    const { data: links } = await (supabase
        .from("calling_consideration_options") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            id,
            status,
            calling_candidate:calling_candidates(id, calling_id)
        `)
        .eq("consideration_id", considerationId)
        .order("created_at", { ascending: true });

    const link = (links || []).find(
        (item: any) => item.calling_candidate?.calling_id === callingId // eslint-disable-line @typescript-eslint/no-explicit-any
    );

    if (!link) return { success: true };

    const { error } = await (supabase
        .from("calling_consideration_options") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .delete()
        .eq("id", link.id);

    if (error) return { error: error.message };

    if (link.status === "possible" && link.calling_candidate?.id) {
        await removeCallingCandidate(link.calling_candidate.id);
    }

    revalidatePath("/callings");
    return { success: true };
}

export async function startMemberConsiderationPipeline(considerationId: string, callingId: string) {
    const supabase = await createClient();
    const auth = await getCallingProfile(supabase, true);
    if ("error" in auth) return { error: auth.error };

    const { data: links } = await (supabase
        .from("calling_consideration_options") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            id,
            calling_candidate:calling_candidates(id, calling_id, candidate_name_id)
        `)
        .eq("consideration_id", considerationId)
        .order("created_at", { ascending: true });

    const link = (links || []).find(
        (item: any) => item.calling_candidate?.calling_id === callingId // eslint-disable-line @typescript-eslint/no-explicit-any
    );

    if (!link?.calling_candidate) return { error: "Calling is not attached to this consideration" };

    const { data: existingProcess } = await (supabase
        .from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("id")
        .eq("calling_id", link.calling_candidate.calling_id)
        .eq("candidate_name_id", link.calling_candidate.candidate_name_id)
        .eq("status", "active")
        .maybeSingle();

    let processId = existingProcess?.id;
    if (!processId) {
        const { data: process, error: processError } = await (supabase
            .from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .insert({
                calling_id: link.calling_candidate.calling_id,
                candidate_name_id: link.calling_candidate.candidate_name_id,
                calling_candidate_id: link.calling_candidate.id,
                current_stage: 'defined' as CallingProcessStage,
                status: 'active' as CallingProcessStatus,
                created_by: auth.user.id,
            })
            .select("id")
            .single();

        if (processError) return { error: processError.message };
        processId = process.id;
    }

    const { error } = await (supabase
        .from("calling_consideration_options") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update({
            status: 'in_pipeline',
            calling_process_id: processId,
            updated_at: new Date().toISOString(),
        })
        .eq("id", link.id);

    if (error) return { error: error.message };

    await updateCallingCandidate(link.calling_candidate.id, { status: 'selected' as CallingCandidateStatus });
    revalidatePath("/callings");
    return { success: true };
}

// =====================================================
// CANDIDATE NAMES (Autocomplete Pool)
// =====================================================

export async function searchCandidateNames(query: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("workspace_id")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) return { error: "Profile not found" };

    const { data, error } = await (supabase
        .from("candidate_names") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("id, name")
        .eq("workspace_id", profile.workspace_id)
        .ilike("name", `%${query}%`)
        .order("name")
        .limit(10);

    if (error) {
        console.error("Search candidate names error:", error);
        return { error: error.message };
    }

    return { success: true, candidates: data || [] };
}

export async function createCandidateName(name: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("workspace_id, role")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) return { error: "Profile not found" };
    if (!['admin', 'leader'].includes(profile.role)) return { error: "Insufficient permissions" };

    // Check for existing name first
    const { data: existing } = await (supabase
        .from("candidate_names") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("id, name")
        .eq("workspace_id", profile.workspace_id)
        .ilike("name", name)
        .single();

    if (existing) {
        return { success: true, candidate: existing, existed: true };
    }

    const { data, error } = await (supabase
        .from("candidate_names") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            workspace_id: profile.workspace_id,
            name: name.trim(),
            created_by: user.id
        })
        .select()
        .single();

    if (error) {
        console.error("Create candidate name error:", error);
        return { error: error.message };
    }

    return { success: true, candidate: data, existed: false };
}

export async function getOrCreateCandidateName(name: string) {
    return createCandidateName(name);
}

// Get all active calling processes for pipeline view
export async function getActiveProcesses() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("workspace_id")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) return { error: "Profile not found" };

    const { data, error } = await (supabase
        .from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            id,
            current_stage,
            status,
            created_at,
            updated_at,
            candidate:candidate_names(id, name),
            calling:callings!calling_processes_calling_id_fkey(
                id,
                title,
                organization,
                workspace_id
            )
        `)
        .eq("calling.workspace_id", profile.workspace_id)
        .order("updated_at", { ascending: false });

    if (error) {
        console.error("Get active processes error:", error);
        return { error: error.message };
    }

    // Filter to only processes belonging to user's workspace
    const filteredData = (data || []).filter((p: any) => p.calling !== null); // eslint-disable-line @typescript-eslint/no-explicit-any

    return { success: true, processes: filteredData };
}

// =====================================================
// CALLINGS (The Roles)
// =====================================================

export async function getCallings() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("workspace_id")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) return { error: "Profile not found" };

    const { data, error } = await (supabase
        .from("callings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            *,
            filled_by_name:candidate_names!callings_filled_by_fkey(id, name),
            candidates:calling_candidates(
                id,
                status,
                notes,
                candidate:candidate_names(id, name)
            ),
            processes:calling_processes(
                id,
                current_stage,
                status,
                candidate:candidate_names(id, name)
            )
        `)
        .eq("workspace_id", profile.workspace_id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Get callings error:", error);
        return { error: error.message };
    }

    return { success: true, callings: data || [] };
}

export async function getCalling(callingId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data, error } = await (supabase
        .from("callings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            *,
            filled_by_name:candidate_names!callings_filled_by_fkey(id, name),
            candidates:calling_candidates(
                id,
                status,
                notes,
                created_at,
                candidate:candidate_names(id, name)
            ),
            processes:calling_processes(
                id,
                current_stage,
                status,
                dropped_reason,
                created_at,
                candidate:candidate_names(id, name)
            )
        `)
        .eq("id", callingId)
        .single();

    if (error) {
        console.error("Get calling error:", error);
        return { error: error.message };
    }

    return { success: true, calling: data };
}

export async function createCalling(data: {
    title: string;
    organization?: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("workspace_id, role")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) return { error: "Profile not found" };
    if (!['admin', 'leader'].includes(profile.role)) return { error: "Insufficient permissions" };

    const { data: calling, error } = await (supabase
        .from("callings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            workspace_id: profile.workspace_id,
            title: data.title,
            organization: data.organization || null,
            created_by: user.id
        })
        .select()
        .single();

    if (error) {
        console.error("Create calling error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true, calling };
}

export async function updateCalling(callingId: string, data: {
    title?: string;
    organization?: string | null;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const updateData: Record<string, string | null> = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.organization !== undefined) updateData.organization = data.organization;

    const { error } = await (supabase
        .from("callings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update(updateData)
        .eq("id", callingId);

    if (error) {
        console.error("Update calling error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true };
}

export async function deleteCalling(callingId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await (supabase
        .from("callings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .delete()
        .eq("id", callingId);

    if (error) {
        console.error("Delete calling error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true };
}

// =====================================================
// CALLING CANDIDATES (Brainstorming Layer)
// =====================================================

export async function addCandidateToCalling(callingId: string, candidateNameId: string, notes?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data, error } = await (supabase
        .from("calling_candidates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            calling_id: callingId,
            candidate_name_id: candidateNameId,
            status: 'proposed' as CallingCandidateStatus,
            notes: notes || null,
            created_by: user.id
        })
        .select(`
            *,
            candidate:candidate_names(id, name)
        `)
        .single();

    if (error) {
        console.error("Add candidate to calling error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true, callingCandidate: data };
}

export async function updateCallingCandidate(callingCandidateId: string, data: {
    status?: CallingCandidateStatus;
    notes?: string | null;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const updateData: Record<string, string | null> = { updated_at: new Date().toISOString() };
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { error } = await (supabase
        .from("calling_candidates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update(updateData)
        .eq("id", callingCandidateId);

    if (error) {
        console.error("Update calling candidate error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true };
}

export async function removeCallingCandidate(callingCandidateId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await (supabase
        .from("calling_candidates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .delete()
        .eq("id", callingCandidateId);

    if (error) {
        console.error("Remove calling candidate error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true };
}

// =====================================================
// CALLING PROCESSES (The Lifecycle Tracker)
// =====================================================

export async function startCallingProcess(callingId: string, candidateNameId: string, callingCandidateId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    // Start transaction-like operation
    // 1. Create the process
    const { data: process, error: processError } = await (supabase
        .from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            calling_id: callingId,
            candidate_name_id: candidateNameId,
            calling_candidate_id: callingCandidateId || null,
            current_stage: 'defined' as CallingProcessStage,
            status: 'active' as CallingProcessStatus,
            created_by: user.id
        })
        .select(`
            *,
            candidate:candidate_names(id, name)
        `)
        .single();

    if (processError) {
        console.error("Start calling process error:", processError);
        return { error: processError.message };
    }

    // 2. Update candidate status to 'selected' if linked
    if (callingCandidateId) {
        await (supabase
            .from("calling_candidates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .update({ status: 'selected' as CallingCandidateStatus })
            .eq("id", callingCandidateId);
    }

    revalidatePath("/callings");
    return { success: true, process };
}

export async function advanceProcessStage(processId: string, newStage: CallingProcessStage) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    // Get current process to validate stage transition
    const { data: currentProcess } = await (supabase
        .from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("current_stage, status, calling_id, candidate_name_id")
        .eq("id", processId)
        .single();

    if (!currentProcess) return { error: "Process not found" };
    if (currentProcess.status !== 'active') return { error: "Process is not active" };

    // Stage order validation
    const stageOrder = getAllStages();
    const currentIndex = stageOrder.indexOf(currentProcess.current_stage);
    const newIndex = stageOrder.indexOf(newStage);

    if (newIndex <= currentIndex) {
        return { error: "Can only advance to a later stage" };
    }

    // Update the process (trigger will log history)
    const updateData: Record<string, string> = {
        current_stage: newStage,
        updated_at: new Date().toISOString()
    };

    // If reaching final stage, mark as completed and update calling
    if (newStage === 'recorded_lcr') {
        updateData.status = 'completed' as CallingProcessStatus;

        // Mark the calling as filled
        await (supabase
            .from("callings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .update({
                is_filled: true,
                filled_by: currentProcess.candidate_name_id,
                filled_at: new Date().toISOString()
            })
            .eq("id", currentProcess.calling_id);
    }

    const { error } = await (supabase
        .from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update(updateData)
        .eq("id", processId);

    if (error) {
        console.error("Advance process stage error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true };
}

export async function dropProcess(processId: string, reason?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await (supabase
        .from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update({
            status: 'dropped' as CallingProcessStatus,
            dropped_reason: reason || null,
            updated_at: new Date().toISOString()
        })
        .eq("id", processId);

    if (error) {
        console.error("Drop process error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true };
}

export async function getProcessDetails(processId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: process, error } = await (supabase
        .from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            *,
            candidate:candidate_names(id, name),
            calling:callings(id, title, organization)
        `)
        .eq("id", processId)
        .single();

    if (error) {
        console.error("Get process details error:", error);
        return { error: error.message };
    }

    const resolved = resolveStageStatuses(
        process.stage_statuses as CallingStageStatuses | null,
        process.current_stage as CallingProcessStage
    );

    return {
        success: true,
        process: {
            ...process,
            stage_statuses: resolved,
        },
    };
}

// Create a sacrament-meeting business item (sustaining / setting_apart / release)
// from a calling process, pre-populating person + calling.
export async function createCallingBusinessItem(
    processId: string,
    input: {
        category: "sustaining" | "release" | "setting_apart" | "confirmation" | "ordination" | "other";
        personName?: string;
        positionCalling?: string;
        actionDate?: string;
        notes?: string;
    }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("workspace_id, role")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) return { error: "Profile not found" };
    if (!["admin", "leader"].includes(profile.role)) {
        return { error: "Insufficient permissions" };
    }

    const { data: process } = await (supabase
        .from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            id,
            calling:callings!calling_processes_calling_id_fkey(id, title, workspace_id),
            candidate:candidate_names(id, name)
        `)
        .eq("id", processId)
        .single();

    if (!process || process.calling?.workspace_id !== profile.workspace_id) {
        return { error: "Process not found" };
    }

    const personName = input.personName?.trim() || process.candidate?.name || "";
    if (!personName) return { error: "Person name is required" };

    const positionCalling = input.positionCalling?.trim()
        || process.calling?.title
        || null;

    const { data: businessItem, error } = await (supabase
        .from("business_items") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            workspace_id: profile.workspace_id,
            person_name: personName,
            position_calling: positionCalling,
            category: input.category,
            status: "pending",
            action_date: input.actionDate || null,
            notes: input.notes?.trim() || null,
            details: null,
            created_by: user.id,
        })
        .select("id")
        .single();

    if (error) {
        console.error("Create calling business item error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    revalidatePath(`/callings/${processId}`);
    revalidatePath("/meetings/sacrament/business");
    return { success: true, businessItemId: businessItem.id };
}

// Fetch workspace members who can be assigned tasks (admins + leaders).
export async function getWorkspaceAssignees() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("workspace_id")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) return { error: "Profile not found" };

    const { data, error } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("id, full_name, email, role")
        .eq("workspace_id", profile.workspace_id)
        .in("role", ["admin", "leader"])
        .order("full_name", { ascending: true });

    if (error) {
        console.error("Get workspace assignees error:", error);
        return { error: error.message };
    }

    return { success: true, assignees: data || [] };
}

export async function setProcessStageStatus(
    processId: string,
    stage: CallingProcessStage,
    status: CallingStageStatus,
    opts?: { reason?: string }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: currentProcess } = await (supabase
        .from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("id, current_stage, status, stage_statuses, dropped_reason, calling_id, candidate_name_id")
        .eq("id", processId)
        .single();

    if (!currentProcess) return { error: "Process not found" };
    if (currentProcess.status === "dropped") {
        return { error: "Process has been dropped" };
    }

    const resolved = resolveStageStatuses(
        currentProcess.stage_statuses as CallingStageStatuses | null,
        currentProcess.current_stage as CallingProcessStage
    );
    const stages = getAllStages();
    const targetIdx = stages.indexOf(stage);

    // Build the new per-stage map:
    //   - status='declined': cascades forward — the process ends at this stage,
    //     so every later stage is implicitly declined too.
    //   - status='complete' | 'pending': strictly single-stage. Marking undone
    //     does not cascade, even when unmarking a stage that was part of an
    //     earlier decline cascade.
    const newStatuses = { ...resolved };
    if (status === "declined") {
        for (let i = targetIdx; i < stages.length; i++) {
            newStatuses[stages[i]] = "declined";
        }
    } else {
        newStatuses[stage] = status;
    }

    const highestIdx = highestCompletedStageIndex(newStatuses);
    const newCurrentStage: CallingProcessStage = highestIdx >= 0 ? stages[highestIdx] : "defined";

    // Derive process-level status from the full stage map (single source of truth).
    const hasDeclined = stages.some((s) => newStatuses[s] === "declined");
    const recordedLcrComplete = newStatuses.recorded_lcr === "complete";
    const newProcessStatus: CallingProcessStatus = recordedLcrComplete
        ? "completed"
        : hasDeclined
            ? "declined"
            : "active";

    const wasCompleted = currentProcess.status === "completed";
    const wasDeclined = currentProcess.status === "declined";
    const willBeCompleted = newProcessStatus === "completed";

    const updateData: Record<string, unknown> = {
        stage_statuses: newStatuses,
        current_stage: newCurrentStage,
        updated_at: new Date().toISOString(),
        status: newProcessStatus,
    };
    if (newProcessStatus === "declined" && !wasDeclined) {
        updateData.dropped_reason = opts?.reason?.trim() || null;
    } else if (newProcessStatus !== "declined" && wasDeclined) {
        updateData.dropped_reason = null;
    }

    const { error } = await (supabase
        .from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update(updateData)
        .eq("id", processId);

    if (error) {
        console.error("Set process stage status error:", error);
        return { error: error.message };
    }

    if (willBeCompleted && !wasCompleted) {
        await (supabase.from("callings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .update({
                is_filled: true,
                filled_by: currentProcess.candidate_name_id,
                filled_at: new Date().toISOString(),
            })
            .eq("id", currentProcess.calling_id);
    } else if (!willBeCompleted && wasCompleted) {
        await (supabase.from("callings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .update({
                is_filled: false,
                filled_by: null,
                filled_at: null,
            })
            .eq("id", currentProcess.calling_id);
    }

    revalidatePath("/callings");
    revalidatePath(`/callings/${processId}`);
    return { success: true };
}

// =====================================================
// HISTORY & TIMELINE
// =====================================================

export async function getProcessTimeline(processId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    // Get history log entries
    const { data: history, error: historyError } = await (supabase
        .from("calling_history_log") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            *,
            created_by_user:profiles!calling_history_log_created_by_fkey(full_name)
        `)
        .eq("calling_process_id", processId)
        .order("created_at", { ascending: true });

    if (historyError) {
        console.error("Get process history error:", historyError);
        return { error: historyError.message };
    }

    // Get comments
    const { data: comments, error: commentsError } = await (supabase
        .from("calling_comments") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            *,
            created_by_user:profiles!calling_comments_created_by_fkey(full_name)
        `)
        .eq("calling_process_id", processId)
        .order("created_at", { ascending: true });

    if (commentsError) {
        console.error("Get process comments error:", commentsError);
        return { error: commentsError.message };
    }

    // Get associated tasks
    const { data: tasks, error: tasksError } = await (supabase
        .from("tasks") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            id,
            title,
            status,
            due_date,
            workspace_task_id,
            assignee:profiles!tasks_assigned_to_fkey(full_name)
        `)
        .eq("calling_process_id", processId)
        .order("created_at", { ascending: true });

    if (tasksError) {
        console.error("Get process tasks error:", tasksError);
    }

    // Merge and sort all timeline items
    const timeline = [
        ...(history || []).map((h: any) => ({ ...h, type: 'history' as const })), // eslint-disable-line @typescript-eslint/no-explicit-any
        ...(comments || []).map((c: any) => ({ ...c, type: 'comment' as const })), // eslint-disable-line @typescript-eslint/no-explicit-any
        ...(tasks || []).map((t: any) => ({ ...t, type: 'task' as const, created_at: t.created_at || new Date().toISOString() })) // eslint-disable-line @typescript-eslint/no-explicit-any
    ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return {
        success: true,
        timeline,
        history: history || [],
        comments: comments || [],
        tasks: tasks || []
    };
}

// =====================================================
// COMMENTS
// =====================================================

export async function addCallingComment(processId: string, content: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data, error } = await (supabase
        .from("calling_comments") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            calling_process_id: processId,
            content,
            created_by: user.id
        })
        .select(`
            *,
            created_by_user:profiles!calling_comments_created_by_fkey(full_name)
        `)
        .single();

    if (error) {
        console.error("Add calling comment error:", error);
        return { error: error.message };
    }

    // Log to history
    await (supabase
        .from("calling_history_log") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            calling_process_id: processId,
            action: 'comment_added' as CallingHistoryAction,
            notes: content.substring(0, 100),
            created_by: user.id
        });

    revalidatePath("/callings");
    return { success: true, comment: data };
}

export async function updateCallingComment(commentId: string, content: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await (supabase
        .from("calling_comments") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update({
            content,
            updated_at: new Date().toISOString()
        })
        .eq("id", commentId)
        .eq("created_by", user.id); // Only creator can update

    if (error) {
        console.error("Update calling comment error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true };
}

export async function deleteCallingComment(commentId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await (supabase
        .from("calling_comments") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .delete()
        .eq("id", commentId);

    if (error) {
        console.error("Delete calling comment error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true };
}

// =====================================================
// TASK INTEGRATION
// =====================================================

export async function createCallingTask(processId: string, data: {
    title: string;
    description?: string;
    assigned_to?: string;
    due_date?: string;
    priority?: 'low' | 'medium' | 'high';
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("workspace_id")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) return { error: "Profile not found" };

    const { data: task, error } = await (supabase
        .from("tasks") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            workspace_id: profile.workspace_id,
            calling_process_id: processId,
            title: data.title,
            description: data.description || null,
            assigned_to: data.assigned_to || null,
            due_date: data.due_date || null,
            priority: data.priority || 'medium',
            status: 'pending',
            created_by: user.id
        })
        .select(`
            *,
            assignee:profiles!tasks_assigned_to_fkey(full_name, email)
        `)
        .single();

    if (error) {
        console.error("Create calling task error:", error);
        return { error: error.message };
    }

    // Log to history
    await (supabase
        .from("calling_history_log") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            calling_process_id: processId,
            action: 'task_created' as CallingHistoryAction,
            notes: data.title,
            created_by: user.id
        });

    revalidatePath("/callings");
    revalidatePath("/tasks");
    return { success: true, task };
}
