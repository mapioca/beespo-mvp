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
        // Check if profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        // If no profile, redirect to onboarding
        if (!profile) {
          return NextResponse.redirect(`${origin}/onboarding`)
        }

        // Profile exists, redirect to next or dashboard
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // If something went wrong, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}

