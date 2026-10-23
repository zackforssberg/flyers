import { NextResponse, type NextRequest } from "next/server";

// The admin UI lives at /admin internally. Users reach it only through the
// secret path ADMIN_PATH_SECRET, which is rewritten to /admin with a marker
// header. Direct requests to /admin get a 404.
const INTERNAL_HEADER = "x-flyers-admin-rewrite";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = process.env.ADMIN_PATH_SECRET;

  if (secret && (pathname === `/${secret}` || pathname.startsWith(`/${secret}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname.slice(secret.length + 1)}`;

    const headers = new Headers(request.headers);
    headers.set(INTERNAL_HEADER, "1");
    return NextResponse.rewrite(url, { request: { headers } });
  }

  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isAdminPath && request.headers.get(INTERNAL_HEADER) !== "1") {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
