import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const authRole = request.cookies.get('auth_role')?.value;
    const authSite = request.cookies.get('auth_site')?.value;
    const path = request.nextUrl.pathname;

    // Protected Routes
    if (path.startsWith('/dashboard') || path.startsWith('/insights') || path.startsWith('/admin')) {
        // If not authenticated at all, redirect to login
        if (!authRole) {
            return NextResponse.redirect(new URL('/', request.url));
        }

        // Admin can access everything
        if (authRole === 'admin') {
            return NextResponse.next();
        }

        // User Access Rules
        // Users can ONLY access /dashboard/sites
        // Redirect them away from /dashboard (root), /insights, and /admin
        // User Access Rules
        // Users can ONLY access /dashboard/sites and /insights
        // Redirect them away from /dashboard (root) and /admin
        if (path === '/dashboard' || path.startsWith('/admin')) {
            const targetUrl = new URL('/dashboard/sites', request.url);
            if (authSite) {
                targetUrl.searchParams.set('site', authSite);
            }
            return NextResponse.redirect(targetUrl);
        }

        // Default allow for allowed user paths (e.g. /dashboard/sites, /insights)
        if (path.startsWith('/dashboard/sites') || path.startsWith('/insights')) {
            return NextResponse.next();
        }

        // Fallback for any other dashboard path restricted to users
        if (!path.startsWith('/dashboard/sites') && !path.startsWith('/insights')) {
            const targetUrl = new URL('/dashboard/sites', request.url);
            if (authSite) targetUrl.searchParams.set('site', authSite);
            return NextResponse.redirect(targetUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images (public images if any)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
