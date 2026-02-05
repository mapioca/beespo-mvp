import { createClient } from '@/lib/supabase/server';
import { downloadImage } from '@/lib/canva/canva-client';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/canva/designs/[designId]/save - Download and save exported image to Supabase
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
        return NextResponse.json({ error: 'Only admins and leaders can save designs' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { download_url } = body;

    if (!download_url) {
        return NextResponse.json({ error: 'download_url is required' }, { status: 400 });
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

    try {
        // Download the image from Canva
        const imageBuffer = await downloadImage(download_url);

        // Generate storage path
        const storagePath = `${profile.workspace_id}/${design.event_id}/${design.canva_design_id}.png`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('event-invitations')
            .upload(storagePath, imageBuffer, {
                contentType: 'image/png',
                upsert: true,
            });

        if (uploadError) {
            console.error('Storage upload failed:', uploadError);
            return NextResponse.json({ error: 'Failed to save image' }, { status: 500 });
        }

        // Get the public URL
        const { data: publicUrlData } = supabase.storage
            .from('event-invitations')
            .getPublicUrl(storagePath);

        const publicUrl = publicUrlData.publicUrl;

        // Update design record
        const { data: updatedDesign, error: updateError } = await (supabase
            .from('event_designs') as ReturnType<typeof supabase.from>)
            .update({
                export_status: 'completed',
                storage_path: storagePath,
                public_url: publicUrl,
            })
            .eq('id', designId)
            .select()
            .single();

        if (updateError) {
            console.error('Failed to update design record:', updateError);
            return NextResponse.json({ error: 'Failed to update design' }, { status: 500 });
        }

        return NextResponse.json({
            design: updatedDesign,
            public_url: publicUrl,
        });
    } catch (error) {
        console.error('Failed to save design:', error);

        // Update design status to failed
        await (supabase
            .from('event_designs') as ReturnType<typeof supabase.from>)
            .update({ export_status: 'failed' })
            .eq('id', designId);

        return NextResponse.json({
            error: 'Failed to download and save image',
        }, { status: 500 });
    }
}
