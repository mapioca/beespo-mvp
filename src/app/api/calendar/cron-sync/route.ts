import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncCalendarSubscription } from '@/lib/calendar-sync-service';

export const maxDuration = 300; // Allow sufficient time for cron job since multiple feeds might take long

export async function GET(request: Request) {
  // Check authorization (Vercel Cron automatically attaches CRON_SECRET as a Bearer token)
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use service role key since this is a background job the user didn't explicitly trigger
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase database URL or service role key' },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Fetch all enabled calendar subscriptions across all workspaces
    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from('calendar_subscriptions')
      .select('id, name, workspace_id')
      .eq('is_enabled', true);

    if (subsError) {
      throw new Error(`Failed to fetch subscriptions: ${subsError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No enabled subscriptions found' });
    }

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // 2. Iterate and sync each subscription using our shared service logic
    for (const sub of subscriptions) {
      try {
        const result = await syncCalendarSubscription(supabaseAdmin, sub.id);
        results.push({
          subscriptionId: sub.id,
          name: sub.name,
          workspaceId: sub.workspace_id,
          status: 'success',
          details: result,
        });
        successCount++;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Failed to sync subscription ${sub.id} (${sub.name}):`, err);
        results.push({
          subscriptionId: sub.id,
          name: sub.name,
          workspaceId: sub.workspace_id,
          status: 'error',
          error: errorMessage,
        });
        failureCount++;
      }
    }

    // 3. Return summary
    return NextResponse.json({
      success: true,
      message: `Cron sync complete. ${successCount} succeeded, ${failureCount} failed.`,
      results,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cron sync failed:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
