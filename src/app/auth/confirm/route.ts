import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Handles email confirmation callbacks from Supabase.
 * When a user clicks the confirmation link in their email,
 * Supabase redirects them here with a token_hash and type.
 */
export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const token_hash = requestUrl.searchParams.get('token_hash')
    const type = requestUrl.searchParams.get('type') as EmailOtpType | null
    const next = requestUrl.searchParams.get('next') || '/onboarding'
    const origin = requestUrl.origin

    if (token_hash && type) {
        const supabase = await createClient()

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })

        if (!error) {
            // Get the user to check profile status
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                // Check if user already has a profile with a workspace
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: profile } = await (supabase as any)
                    .from('profiles')
                    .select('id, workspace_id')
                    .eq('id', user.id)
                    .single() as { data: { id: string; workspace_id: string | null } | null }

                if (profile && profile.workspace_id) {
                    // Existing user with complete profile — go to dashboard
                    return NextResponse.redirect(`${origin}/dashboard`)
                }
            }

            // New user or incomplete profile — go to onboarding
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // If verification failed, redirect to login with an error message
    return NextResponse.redirect(
        `${origin}/login?error=confirmation_failed&message=Email+confirmation+failed.+Please+try+signing+up+again.`
    )
}
