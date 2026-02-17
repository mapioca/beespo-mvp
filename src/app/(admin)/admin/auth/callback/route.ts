import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const type = requestUrl.searchParams.get('type')

  // Construct admin origin (use current host to preserve admin subdomain)
  const host = requestUrl.host
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  if (code) {
    const supabase = await createClient()

    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // For password recovery, go to reset-password
      if (type === 'recovery' || next === '/reset-password') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }

      // Get the user
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Verify user is a sys_admin
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase.from('profiles') as any)
          .select('is_sys_admin')
          .eq('id', user.id)
          .single()

        if (!profile?.is_sys_admin) {
          // Not an admin - sign them out and show error
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/login?error=not_authorized`)
        }

        // Admin verified - check MFA setup
        const { data: factorsData } = await supabase.auth.mfa.listFactors()
        const hasVerifiedTOTP = factorsData?.totp?.some(f => f.status === "verified")

        if (!hasVerifiedTOTP) {
          // Need to set up MFA
          return NextResponse.redirect(`${origin}/mfa/setup`)
        }

        // Check AAL level
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

        if (aalData?.currentLevel !== 'aal2') {
          // Need to verify MFA
          return NextResponse.redirect(`${origin}/mfa/verify`)
        }

        // All checks passed - redirect to dashboard
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // If something went wrong, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
