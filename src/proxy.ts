import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

const intlMiddleware = createMiddleware({
    locales,
    defaultLocale,
    localePrefix: 'as-needed'
});

/**
 * Check if the request carries a Supabase auth cookie.
 * Supabase SSR stores the session in cookies whose name contains '-auth-token'.
 * If none exist, the user is definitely unauthenticated — no network call needed.
 */
function hasSessionCookie(request: NextRequest): boolean {
    return request.cookies.getAll().some(
        c => c.name.includes('-auth-token') && c.value
    );
}

export async function proxy(request: NextRequest) {
    const intlResponse = intlMiddleware(request);

    const pathname = request.nextUrl.pathname;
    const logicalPath = pathname.replace(/^\/(en|ar)/, '') || '/';

    const protectedPrefixes = [
        '/admin', '/client', '/team-leader', '/account-manager',
        '/creator', '/editor', '/photographer', '/videographer',
        '/accountant', '/moderator', '/profile', '/account', '/settings',
    ];
    const isProtectedRoute = protectedPrefixes.some(prefix => logicalPath.startsWith(prefix));

    // Early return for public routes — skip Supabase client creation entirely
    if (!isProtectedRoute) {
        setPathnameHeader(intlResponse, pathname);
        return intlResponse;
    }

    const locale = pathname.match(/^\/(en|ar)/)?.[1] ?? defaultLocale

    // Fast-path: no auth cookie → redirect immediately (zero network calls)
    if (!hasSessionCookie(request)) {
        return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }

    // Cookie exists — create Supabase client and read session from cookie
    // Uses getSession() which decodes the JWT locally (no network call)
    // instead of getUser() which makes a ~120ms round-trip to Supabase Auth.
    // Actual auth verification happens in server components & RLS policies.
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        intlResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Read session from cookie — zero network calls for valid tokens.
    // If the access token is expired, Supabase SSR will auto-refresh
    // using the refresh token (single network call, only when needed).
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }

    setPathnameHeader(intlResponse, pathname);

    return intlResponse;
}

/**
 * Properly forward x-pathname to server components via the
 * x-middleware-override-headers mechanism.  Simply calling
 * `response.headers.set('x-pathname', v)` only sets a RESPONSE header
 * which is invisible to `headers()` in server components.
 */
function setPathnameHeader(response: NextResponse, pathname: string) {
    const key = 'x-pathname';
    const overrides = response.headers.get('x-middleware-override-headers') || '';
    const updated = overrides ? `${overrides},${key}` : key;
    response.headers.set('x-middleware-override-headers', updated);
    response.headers.set(`x-middleware-request-${key}`, pathname);
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}