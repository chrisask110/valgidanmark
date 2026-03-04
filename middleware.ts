import { NextRequest, NextResponse } from "next/server";

/**
 * Protect /admin/* with HTTP Basic Auth.
 * Set ADMIN_USERNAME and ADMIN_PASSWORD in your Vercel environment variables.
 * Default username: admin  Default password: changeme
 */
export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const [scheme, credentials] = authHeader.split(" ");
    if (scheme === "Basic" && credentials) {
      const [user, pass] = Buffer.from(credentials, "base64").toString().split(":");
      const expectedUser = process.env.ADMIN_USERNAME ?? "admin";
      const expectedPass = process.env.ADMIN_PASSWORD ?? "changeme";
      if (user === expectedUser && pass === expectedPass) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Valg i Danmark Admin", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: "/admin/:path*",
};
