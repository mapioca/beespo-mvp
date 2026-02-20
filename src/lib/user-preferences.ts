"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { routing } from "@/routing";

export async function setUserLocale(newLocale: "en" | "es") {
    // 1. Verify locale is valid
    if (!routing.locales.includes(newLocale)) {
        throw new Error(`Invalid locale: ${newLocale}`);
    }

    const cookieStore = await cookies();

    // 2. Set the cookie so next-intl respects the preference immediately
    cookieStore.set("NEXT_LOCALE", newLocale, {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
    });

    // 3. Update the Supabase profile (for authenticated users)
    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    },
                },
            }
        );

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (user) {
            const { error } = await supabase
                .from("profiles")
                .update({ locale: newLocale })
                .eq("id", user.id);

            if (error) {
                console.error("Failed to update Supabase profile locale:", error);
                // We do not throw here to allow unauthenticated users (or transient failures)
                // to still benefit from the cookie set in step 2.
            }
        }
    } catch (error) {
        console.error("Error connecting to Supabase in setUserLocale:", error);
    }

    // Next steps:
    // After setting the locale, we typically need to redirect the user to the same path
    // under the new locale prefix. But doing it blindly here is tricky without the current Pathname.
    // The caller (Client Component) can use the `useRouter()` from `next-intl/navigation`
    // to perform the redirect right after this Server Action completes.
}
