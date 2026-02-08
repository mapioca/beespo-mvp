import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendInviteEmail } from '@/lib/email/send-invite-email';
import { onboardingFormSchema } from '@/lib/onboarding/validation';
import {
  getFeatureTier,
  getRoleTitle,
  generateWorkspaceName,
  getDbOrganizationType,
} from '@/lib/onboarding/filters';
import type { OrganizationKey, RoleKey } from '@/types/onboarding';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user already has a profile
  const { data: existingProfile } = await (supabase
    .from('profiles') as ReturnType<typeof supabase.from>)
    .select('id')
    .eq('id', user.id)
    .single();

  if (existingProfile) {
    return NextResponse.json(
      { error: 'Profile already exists. Redirecting to dashboard.' },
      { status: 400 }
    );
  }

  // Parse and validate request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const validation = onboardingFormSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues },
      { status: 400 }
    );
  }

  const formData = validation.data;
  const organization = formData.organization as OrganizationKey;
  const role = formData.role as RoleKey;

  // Determine feature tier from role
  const featureTier = getFeatureTier(role);

  // Generate role title
  const roleTitle = getRoleTitle(role, organization);

  // Generate workspace name
  const workspaceName = generateWorkspaceName(
    formData.unitName,
    organization,
    formData.unitType
  );

  // Get database organization type
  const dbOrgType = getDbOrganizationType(organization);

  // Create workspace
  const { data: workspace, error: workspaceError } = await (supabase
    .from('workspaces') as ReturnType<typeof supabase.from>)
    .insert({
      name: workspaceName,
      type: formData.unitType,
      organization_type: dbOrgType,
      unit_name: formData.unitName,
    })
    .select()
    .single();

  if (workspaceError || !workspace) {
    console.error('Workspace creation error:', workspaceError);
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaceId = (workspace as any).id;

  // Create profile for user as admin (owner)
  const { error: profileError } = await (supabase
    .from('profiles') as ReturnType<typeof supabase.from>)
    .insert({
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      workspace_id: workspaceId,
      role: 'admin',
      role_title: roleTitle,
      feature_interests: formData.featureInterests,
      feature_tier: featureTier,
    });

  if (profileError) {
    console.error('Profile creation error:', profileError);
    // Try to cleanup workspace
    await supabase.from('workspaces').delete().eq('id', workspaceId);
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    );
  }

  // Get user's full name for invitations
  const inviterName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Your colleague';

  // Create invitations for teammates
  const invitationResults: { email: string; success: boolean; error?: string }[] = [];

  for (const email of formData.teammateEmails) {
    // Check if there's already a pending invitation
    const { data: existingInvite } = await (supabase
      .from('workspace_invitations') as ReturnType<typeof supabase.from>)
      .select('id')
      .eq('email', email)
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      invitationResults.push({ email, success: false, error: 'Already invited' });
      continue;
    }

    // Create invitation
    const { data: invitation, error: inviteError } = await (supabase
      .from('workspace_invitations') as ReturnType<typeof supabase.from>)
      .insert({
        workspace_id: workspaceId,
        email,
        role: 'leader', // Default role for teammates
        invited_by: user.id,
      })
      .select()
      .single();

    if (inviteError || !invitation) {
      invitationResults.push({ email, success: false, error: 'Failed to create invitation' });
      continue;
    }

    // Send invitation email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inviteLink = `${baseUrl}/accept-invite?token=${(invitation as any).token}`;

    const emailResult = await sendInviteEmail({
      toEmail: email,
      inviterName,
      workspaceName,
      role: 'Leader',
      inviteLink,
    });

    invitationResults.push({ email, success: emailResult.success, error: emailResult.error });
  }

  return NextResponse.json({
    success: true,
    workspaceId,
    workspaceName,
    invitations: invitationResults,
  }, { status: 201 });
}
