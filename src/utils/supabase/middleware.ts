import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that restaurant staff ARE allowed to access
const RESTAURANT_ALLOWED = ['/restaurant', '/qr-order', '/auth', '/login', '/_next', '/api', '/print-pos-bill', '/print-kot', '/help'];

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return request.cookies.getAll(); },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    const pathname = request.nextUrl.pathname;

    // Allow Puppeteer (PDF generation) to access /print-bill without auth
    // by verifying a secret internal token passed as a query parameter
    if (pathname.startsWith('/print-bill') || pathname.startsWith('/print-receipts') || pathname.startsWith('/print-insights') || pathname.startsWith('/api/migrate-settlement')) {
        const token = request.nextUrl.searchParams.get('_token');
        const expectedToken = process.env.INTERNAL_PDF_TOKEN || '__geny_pms_internal_pdf_2026__';
        if (token === expectedToken) {
            return supabaseResponse; // Allow through without auth
        }
    }

    // Redirect unauthenticated users to login
    const isPublicRoute = pathname.startsWith('/login') || pathname.startsWith('/auth') || pathname.startsWith('/qr-order') || pathname.startsWith('/security-protocols') || pathname.startsWith('/data-policy');

    if (!user && !isPublicRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // For authenticated users, enforce role-based route access
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const role = profile?.role;

        // ── MASTER ROLE: redirect to master control ──
        if (role === 'master' && pathname === '/') {
            const url = request.nextUrl.clone();
            url.pathname = '/master-control';
            return NextResponse.redirect(url);
        }

        // ── RESTAURANT STAFF: can ONLY access /restaurant/* routes ──
        if (role === 'restaurant_staff') {
            const isAllowed = RESTAURANT_ALLOWED.some(prefix => pathname.startsWith(prefix));
            if (!isAllowed) {
                const url = request.nextUrl.clone();
                url.pathname = '/restaurant/pos';
                return NextResponse.redirect(url);
            }
        }
    }

    return supabaseResponse;
}
