import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Define route patterns
const PUBLIC_ROUTES = [
  "/",
  "/events",
  "/events/[slug]",
  "/auth/login",
  "/auth/register",
  "/auth/verify-request",
  "/auth/error",
  "/auth/reset-password",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
];

const AUTH_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/auth/verify-request",
  "/auth/error",
  "/auth/reset-password",
];

const PROTECTED_ROUTES = ["/dashboard", "/profile-settings", "/my-events", "/tickets", "/favorites"];

const ORGANIZER_ROUTES = [
  "/organizer",
  "/events/create",
  "/events/[slug]/edit",
  "/events/[slug]/analytics",
];

const ADMIN_ROUTES = ["/admin"];

// API routes that need protection
const PROTECTED_API_ROUTES = [
  "/api/events/create",
  "/api/events/[id]/edit",
  "/api/events/[id]/delete",
  "/api/tickets",
  "/api/favorites",
  "/api/profile",
  "/api/profile/password",
  "/api/my-bookings",
  "/api/my-events",
];

const ORGANIZER_API_ROUTES = [
  "/api/events/create",
  "/api/events/[id]/edit",
  "/api/events/[id]/delete",
  "/api/events/[id]/analytics",
];

const ADMIN_API_ROUTES = ["/api/admin", "/api/users"];

function matchesPattern(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    // Convert pattern to regex
    const regex = new RegExp("^" + pattern.replace(/\[.*?\]/g, "[^/]+") + "$");
    return regex.test(pathname);
  });
}

function isPublicRoute(pathname: string): boolean {
  return matchesPattern(pathname, PUBLIC_ROUTES);
}

function isAuthRoute(pathname: string): boolean {
  return matchesPattern(pathname, AUTH_ROUTES);
}

function isProtectedRoute(pathname: string): boolean {
  return matchesPattern(pathname, PROTECTED_ROUTES);
}

function isOrganizerRoute(pathname: string): boolean {
  return matchesPattern(pathname, ORGANIZER_ROUTES);
}

function isAdminRoute(pathname: string): boolean {
  return matchesPattern(pathname, ADMIN_ROUTES);
}

function isProtectedApiRoute(pathname: string): boolean {
  return matchesPattern(pathname, PROTECTED_API_ROUTES);
}

function isOrganizerApiRoute(pathname: string): boolean {
  return matchesPattern(pathname, ORGANIZER_API_ROUTES);
}

function isAdminApiRoute(pathname: string): boolean {
  return matchesPattern(pathname, ADMIN_API_ROUTES);
}

type AuthToken = {
  role?: string;
  email?: string;
  emailVerified?: boolean;
  // add other properties as needed
};

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token as AuthToken | null;

    // Allow public routes
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }

    // Handle auth routes - redirect authenticated users
    if (isAuthRoute(pathname)) {
      if (token) {
        // Redirect authenticated users away from auth pages
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // From here, user must be authenticated
    if (!token) {
      // Redirect to login for protected routes
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check email verification for protected routes
    if (
      !token.emailVerified &&
      (isProtectedRoute(pathname) || isProtectedApiRoute(pathname))
    ) {
      const verifyUrl = new URL("/auth/verify-request", req.url);
      verifyUrl.searchParams.set("email", token.email || "");
      return NextResponse.redirect(verifyUrl);
    }

    // Role-based access control
    const userRole = token.role as string;

    // Admin routes - only ADMIN role
    if (isAdminRoute(pathname) || isAdminApiRoute(pathname)) {
      if (userRole !== "ADMIN") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    // Organizer routes - ORGANIZER or ADMIN roles
    if (isOrganizerRoute(pathname) || isOrganizerApiRoute(pathname)) {
      if (!["ORGANIZER", "ADMIN"].includes(userRole)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    // API route responses for unauthorized access
    if (pathname.startsWith("/api/")) {
      // Check specific API route permissions
      if (isAdminApiRoute(pathname) && userRole !== "ADMIN") {
        return new NextResponse(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { "content-type": "application/json" } }
        );
      }

      if (
        isOrganizerApiRoute(pathname) &&
        !["ORGANIZER", "ADMIN"].includes(userRole)
      ) {
        return new NextResponse(
          JSON.stringify({ error: "Organizer access required" }),
          { status: 403, headers: { "content-type": "application/json" } }
        );
      }

      if (isProtectedApiRoute(pathname) && !token.emailVerified) {
        return new NextResponse(
          JSON.stringify({ error: "Email verification required" }),
          { status: 401, headers: { "content-type": "application/json" } }
        );
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Always allow access to public routes
        if (isPublicRoute(pathname)) {
          return true;
        }

        // Allow access to auth routes regardless of token
        if (isAuthRoute(pathname)) {
          return true;
        }

        // For all other routes, require a token
        return !!token;
      },
    },
    pages: {
      signIn: "/auth/login",
      error: "/auth/error",
    },
  }
);

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
