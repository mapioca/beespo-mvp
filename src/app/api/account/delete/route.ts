import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/account/delete - Delete (anonymize) user account
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { confirmation } = body;

  // Verify confirmation text
  if (confirmation !== 'DELETE') {
    return NextResponse.json({
      error: 'Invalid confirmation. Please type DELETE to confirm.'
    }, { status: 400 });
  }

  try {
    // Step 1: Anonymize the user's profile and data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: anonymizeResult, error: anonymizeError } = await (supabase as any)
      .rpc('anonymize_user_account', { target_user_id: user.id }) as {
        data: {
          success: boolean;
          error?: string;
          user_id?: string;
          old_email?: string;
          anonymized_email?: string;
          unassigned_tasks?: number;
          deleted_at?: string;
        } | null;
        error: Error | null;
      };

    if (anonymizeError) {
      console.error('Anonymization error:', anonymizeError);
      return NextResponse.json({
        error: 'Failed to anonymize account data'
      }, { status: 500 });
    }

    // Check if anonymization was successful
    if (!anonymizeResult?.success) {
      return NextResponse.json({
        error: anonymizeResult?.error || 'Failed to anonymize account'
      }, { status: 500 });
    }

    // Step 2: Sign out the user from all sessions
    await supabase.auth.signOut({ scope: 'global' });

    // Step 3: Delete the user from auth.users using Admin API
    // This requires the service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase admin credentials');
      // Account is already anonymized, but we couldn't delete auth record
      // This is still acceptable - the email is freed via anonymization
      return NextResponse.json({
        success: true,
        warning: 'Account anonymized but auth record could not be fully removed',
        details: anonymizeResult
      }, { status: 200 });
    }

    // Create admin client with service role
    const adminClient = createAdminClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Delete user from auth.users
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteAuthError) {
      console.error('Auth deletion error:', deleteAuthError);
      // Account is already anonymized, which is the important part
      return NextResponse.json({
        success: true,
        warning: 'Account anonymized but auth cleanup had issues',
        details: anonymizeResult
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      message: 'Your account has been permanently deleted',
      details: {
        unassigned_tasks: anonymizeResult.unassigned_tasks,
        deleted_at: anonymizeResult.deleted_at
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json({
      error: 'An unexpected error occurred during account deletion'
    }, { status: 500 });
  }
}
