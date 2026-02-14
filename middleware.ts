import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

import { AUTH_COOKIE_NAME } from "@/lib/auth";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/volunteer-login"];
const DASHBOARD_PATHS = ["/dashboard"];
const ADMIN_PATHS = ["/admin"];

type Payload = {
  id: string;
  email: string;
  role: string;
  counterName: string | null;
};

async function verifyTokenEdge(token: string): Promise<Payload | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "fallback-secret-change-me");
    const { payload } = await jwtVerify(token, secret);
    return {
      id: payload.id as string,
      email: payload.email as string,
      role: (payload.role as string) ?? "VOLUNTEER",
      counterName: (payload.counterName as string) ?? null,
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  const payload = token ? await verifyTokenEdge(token) : null;

  // Admin routes: ADMIN only
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (!payload) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (payload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Dashboard: ADMIN + VOLUNTEER
  if (DASHBOARD_PATHS.some((p) => pathname.startsWith(p))) {
    if (!payload) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Public auth pages: redirect to dashboard if already logged in
  if (
    ["/login", "/signup", "/volunteer-login"].includes(pathname) &&
    payload
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
