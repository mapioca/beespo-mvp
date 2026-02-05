import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken } from '@/lib/canva/token-manager';
import { CanvaClient } from '@/lib/canva/canva-client';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/canva/designs/[designId]/export - Start export job for a design
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ designId: string }> }
) {
    const { designId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profile } = await (supabase
        .from('profiles') as ReturnType<typeof supabase.from>)
        .select('workspace_id, role')
        .eq('id', user.id)
        .single();

    if (!profile?.workspace_id) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    if (!['admin', 'leader'].includes(profile.role)) {
        return NextResponse.json({ error: 'Only admins and leaders can export designs' }, { status: 403 });
    }

    // Get the design from database
    const { data: design } = await (supabase
        .from('event_designs') as ReturnType<typeof supabase.from>)
        .select('*')
        .eq('id', designId)
        .eq('workspace_id', profile.workspace_id)
        .single();

    if (!design) {
        return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    }

    // Get a valid Canva access token
    const accessToken = await getValidAccessToken(user.id, profile.workspace_id);
    if (!accessToken) {
        return NextResponse.json({
            error: 'Canva is not connected or token expired',
            needsAuth: true,
        }, { status: 401 });
    }

    // Start export job
    const canvaClient = new CanvaClient(accessToken);

    try {
        const exportResponse = await canvaClient.startExport(design.canva_design_id, 'png');

        // Update design with export job info
        await (supabase
            .from('event_designs') as ReturnType<typeof supabase.from>)
            .update({
                export_status: 'processing',
                export_job_id: exportResponse.job.id,
            })
            .eq('id', designId);

        return NextResponse.json({
            job_id: exportResponse.job.id,
            status: exportResponse.job.status,
        });
    } catch (exportError) {
        console.error('Failed to start export:', exportError);

        // Update design status to failed
        await (supabase
            .from('event_designs') as ReturnType<typeof supabase.from>)
            .update({ export_status: 'failed' })
            .eq('id', designId);

        return NextResponse.json({
            error: 'Failed to start export job',
        }, { status: 500 });
    }
}
