import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken } from '@/lib/canva/token-manager';
import { CanvaClient } from '@/lib/canva/canva-client';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/canva/exports/[exportId] - Poll export job status
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ exportId: string }> }
) {
    const { exportId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's workspace
    const { data: profile } = await (supabase
        .from('profiles') as ReturnType<typeof supabase.from>)
        .select('workspace_id')
        .eq('id', user.id)
        .single();

    if (!profile?.workspace_id) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    // Get a valid Canva access token
    const accessToken = await getValidAccessToken(user.id, profile.workspace_id);
    if (!accessToken) {
        return NextResponse.json({
            error: 'Canva is not connected or token expired',
            needsAuth: true,
        }, { status: 401 });
    }

    // Get export status from Canva
    const canvaClient = new CanvaClient(accessToken);

    try {
        const exportStatus = await canvaClient.getExportStatus(exportId);

        const response: {
            job_id: string;
            status: 'in_progress' | 'success' | 'failed';
            download_url?: string;
            error?: string;
        } = {
            job_id: exportStatus.job.id,
            status: exportStatus.job.status,
        };

        if (exportStatus.job.status === 'success' && exportStatus.job.result) {
            response.download_url = exportStatus.job.result.urls[0];
        }

        if (exportStatus.job.status === 'failed' && exportStatus.job.error) {
            response.error = exportStatus.job.error.message;
        }

        return NextResponse.json(response);
    } catch (error) {
        console.error('Failed to get export status:', error);
        return NextResponse.json({
            error: 'Failed to get export status',
        }, { status: 500 });
    }
}
