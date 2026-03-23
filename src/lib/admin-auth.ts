/**
 * Admin authentication utilities for MFA enforcement
 */

// No imports needed currently, using passed in supabase client


/**
 * Check if user has completed MFA (AAL2 level)
 * Throws error if MFA is not verified
 */
export async function verifyAdminMFA(supabase: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Not authenticated');
  }

  try {
    // Check AAL level
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalData?.currentLevel !== 'aal2') {
      throw new Error('MFA_NOT_VERIFIED');
    }

    return user;
  } catch (error) {
    if (error instanceof Error && error.message === 'MFA_NOT_VERIFIED') {
      throw error;
    }
    // If we can't verify AAL level, treat as not verified
    throw new Error('MFA_NOT_VERIFIED');
  }
}

/**
 * Check if user is sys_admin
 */
export async function verifyAdminRole(supabase: any, userId: string) { // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from('profiles') as any)
      .select('is_sys_admin')
      .eq('id', userId)
      .single();

    if (!profile?.is_sys_admin) {
      throw new Error('NOT_ADMIN');
    }

    return profile;
  } catch {
    throw new Error('NOT_ADMIN');
  }
}

/**
 * Full admin verification: user + sys_admin + MFA
 */
export async function verifyFullAdminAccess(supabase: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const user = await verifyAdminMFA(supabase);
  await verifyAdminRole(supabase, user.id);
  return user;
}
