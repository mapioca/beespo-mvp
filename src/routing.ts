import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
    locales: ['en', 'es'],
    defaultLocale: 'en',

    // By default, next-intl uses the accept-language header
    // If NEXT_LOCALE cookie is present, it uses that instead.
});

// Lightweight wrappers around Next.js navigation APIs
// that will automatically handle the locale prefix
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
