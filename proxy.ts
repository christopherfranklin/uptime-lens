import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/dashboard", "/settings"];
const authRoutes = ["/login"];

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const sessionCookie = getSessionCookie(request);

  // Redirect unauthenticated users to login
  if (
    protectedRoutes.some((route) => path.startsWith(route)) &&
    !sessionCookie
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (authRoutes.some((route) => path.startsWith(route)) && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.png$).*)"],
};
