import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Domain routing configuration
const DOMAINS = {
  PUBLIC: ['subflos.com', 'www.subflos.com', 'localhost:3000'],
  APP: ['app.subflos.com', 'localhost:3001'],
  ADMIN: ['admin.subflos.com', 'localhost:3002'],
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const hostname = req.headers.get('host') || ''
  const pathname = req.nextUrl.pathname
  
  // Create Supabase client for auth checks
  const supabase = createMiddlewareClient({ req, res })

  // Handle tracked link routes (public, no auth) - these take priority
  // subflos.com/go/* and subflos.com/r/*
  if (pathname.startsWith('/go/') || pathname.startsWith('/r/')) {
    // Rewrite to /(links) route group
    const url = req.nextUrl.clone()
    url.pathname = `/_links${pathname}`
    return NextResponse.rewrite(url)
  }

  // Determine which domain we're on
  const isPublicDomain = DOMAINS.PUBLIC.some(d => hostname.includes(d.split(':')[0]))
  const isAppDomain = DOMAINS.APP.some(d => hostname.includes(d.split(':')[0]))
  const isAdminDomain = DOMAINS.ADMIN.some(d => hostname.includes(d.split(':')[0]))

  // PUBLIC DOMAIN: subflos.com (no auth required)
  if (isPublicDomain && !isAppDomain && !isAdminDomain) {
    // Allow all public routes
    return res
  }

  // APP DOMAIN: app.subflos.com (auth required)
  if (isAppDomain) {
    const { data: { session } } = await supabase.auth.getSession()
    
    // Allow login/signup pages without auth
    if (pathname === '/login' || pathname === '/signup' || pathname.startsWith('/auth/')) {
      if (session) {
        // Already logged in, redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      return res
    }

    // Require auth for all other app routes
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    return res
  }

  // ADMIN DOMAIN: admin.subflos.com (platform admin auth required)
  if (isAdminDomain) {
    const { data: { session } } = await supabase.auth.getSession()

    // Allow login page
    if (pathname === '/login') {
      if (session) {
        // Check if user is platform admin
        const { data: admin } = await supabase
          .from('platform_admins')
          .select('id, role, is_active')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .single()

        if (admin) {
          return NextResponse.redirect(new URL('/dashboard', req.url))
        }
      }
      return res
    }

    // Require auth
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Check platform_admins table
    const { data: admin } = await supabase
      .from('platform_admins')
      .select('id, role, is_active')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!admin) {
      // Not a platform admin - return 403
      return new NextResponse('Forbidden: Not a platform admin', { status: 403 })
    }

    // Attach admin role to request headers for use in pages
    const response = NextResponse.next()
    response.headers.set('x-admin-role', admin.role)
    return response
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}
