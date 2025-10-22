import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hostname = request.nextUrl.hostname;

  // Check if this is referrer subdomain (ss.localhost or ss.itmilanblr.co.in)
  const isReferrerSubdomain = hostname.startsWith('ss.');
  
  // Protected admin routes
  const adminProtectedRoutes = ['/api/admin/users'];
  
  // Protected referrer routes
  const referrerProtectedRoutes = ['/api/referrer', '/referrer'];
  
  // Protected user routes
  const protectedRoutes = ['/api/auth/change-password'];

  // Check if route is protected
  const isAdminProtected = adminProtectedRoutes.some(route => path.startsWith(route));
  const isReferrerProtected = referrerProtectedRoutes.some(route => path.startsWith(route));
  const isProtected = protectedRoutes.includes(path) || isAdminProtected || isReferrerProtected;

  // 🔥 BLOCK REFERRER ROUTES ON MAIN DOMAIN/LOCALHOST
  if (isReferrerProtected && !isReferrerSubdomain) {
    // If trying to access referrer routes from main domain/localhost
    if (hostname === 'localhost' || hostname === 'udyog-jagat.itmilanblr.co.in') {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized - Access referrer portal at ss.itmilanblr.co.in' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  if (isProtected) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized - No token provided' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
        role: string;
        isReferrer?: boolean;
        referralCode?: string;
      };

      // For admin protected routes, verify admin role
      if (isAdminProtected && decoded.role !== 'admin') {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized - Admin access required' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // For referrer protected routes, verify referrer role
      if (isReferrerProtected && decoded.role !== 'job_referrer') {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized - Referrer access required' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 🔥 ENFORCE SUBDOMAIN RULES: If on referrer subdomain, user MUST be referrer
      if (isReferrerSubdomain && decoded.role !== 'job_referrer') {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized - This portal is for referrers only' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 🔥 ENFORCE MAIN DOMAIN RULES: If on main domain, BLOCK referrers from accessing non-referrer content
      if (!isReferrerSubdomain && decoded.role === 'job_referrer' && !isReferrerProtected) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized - Referrers must use the referrer portal at ss.itmilanblr.co.in' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Add user info to request headers for downstream use
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', decoded.id);
      requestHeaders.set('x-user-role', decoded.role);
      
      // Add referrer-specific headers if user is a referrer
      if (decoded.role === 'job_referrer') {
        requestHeaders.set('x-user-is-referrer', 'true');
        if (decoded.referralCode) {
          requestHeaders.set('x-referral-code', decoded.referralCode);
        }
      }

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/admin/:path*',
    '/api/auth/:path*',
    '/api/referrer/:path*',
    '/referrer/:path*',
    '/login',
    '/dashboard/:path*'
  ],
};