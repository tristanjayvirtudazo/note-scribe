import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { buildContentSecurityPolicy, cspHeaderName } from '@/lib/security-headers';

const PROTECTED_PREFIXES = ['/notes', '/subjects', '/settings'];
const GUEST_ONLY_PATHS = ['/login', '/signup', '/forgot-password'];

export async function proxy(request: NextRequest) {
  // A fresh nonce per request; Next.js reads it from the CSP header on the request and puts it
  // on every script it renders, so the page must be rendered dynamically (see the root layout).
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set(cspHeaderName, csp);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });
  supabaseResponse.headers.set(cspHeaderName, csp);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          supabaseResponse.headers.set(cspHeaderName, csp);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes an expired session and verifies the token. This is only an optimistic check
  // for redirects; pages and Server Actions verify the user again through src/lib/dal.ts.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !isSignedIn) return redirectTo(request, supabaseResponse, '/login');
  if (GUEST_ONLY_PATHS.includes(pathname) && isSignedIn) return redirectTo(request, supabaseResponse, '/notes');

  return supabaseResponse;
}

// Carries over any refreshed session cookies so they are not lost on the redirect.
function redirectTo(request: NextRequest, supabaseResponse: NextResponse, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  const response = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

export const config = {
  matcher: [
    // Pages only: static assets and the CSP report endpoint need neither session nor nonce.
    '/((?!_next/static|_next/image|api/csp-report|calendar/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
