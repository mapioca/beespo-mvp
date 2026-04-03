import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const type = requestUrl.searchParams.get('type')

  if (code) {
    const supabase = await createClient()

    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // For password recovery, skip profile check and go directly to reset-password
      // The user may be recovering access to their account
      if (type === 'recovery' || next === '/reset-password') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }

      // Get the user
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Check if profile exists and has completed onboarding (has workspace_id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('id, workspace_id, is_deleted')
          .eq('id', user.id)
          .single() as { data: { id: string; workspace_id: string | null } | null }

        if (profile && 'is_deleted' in profile && profile.is_deleted) {
          await supabase.auth.signOut({ scope: 'local' })
          return NextResponse.redirect(`${origin}/signup?message=account_deleted`)
        }

        // If no profile or no workspace_id, redirect to onboarding
        if (!profile || !profile.workspace_id) {
          return NextResponse.redirect(`${origin}/onboarding`)
        }

        // Check if user has MFA enrolled and needs verification
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
          return NextResponse.redirect(`${origin}/mfa/verify`)
        }

        // Profile exists with workspace, redirect to next or dashboard
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // If something went wrong, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
