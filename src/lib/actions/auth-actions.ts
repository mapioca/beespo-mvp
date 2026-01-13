"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend } from "@/lib/email/resend";
import { getResetPasswordEmailHtml } from "@/lib/email/templates";
import { redirect } from "next/navigation";

export async function signOutAction() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
}

export async function forgotPasswordAction(email: string) {
    const supabaseAdmin = createAdminClient();
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Generate recovery link - Supabase will redirect to reset-password with tokens in hash
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
            redirectTo: `${origin}/reset-password`,
        },
    });

    if (error) {
        console.error('Error generating recovery link:', error);
        return { error: 'Failed to generate recovery link' };
    }

    if (!data.properties?.action_link) {
        console.error('No action link returned');
        return { error: 'Failed to generate recovery link' };
    }

    // Send email using Resend
    if (resend) {
        try {
            await resend.emails.send({
                from: 'Beespo <onboarding@resend.dev>', // Update this to verified domain when ready, e.g. team@beespo.com
                to: email,
                subject: 'Reset your password',
                html: getResetPasswordEmailHtml(data.properties.action_link, email),
            });
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            return { error: 'Failed to send email' };
        }
    } else {
        console.warn('Resend client not initialized. Recovery email not sent.');
    }

    return { success: true };
}
