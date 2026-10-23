import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Solo mira si existe la cookie de sesión (no la valida: eso lo hace el API con me()).
// /verify-email, /forgot-password, /reset-password y /magic-link quedan siempre abiertas.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has("akro_session");

  if (!hasSession && (pathname === "/" || pathname === "/check-email")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (hasSession && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Lista explícita: no toca /api, /_next, /serwist, /~offline, íconos, manifest ni estáticos.
export const config = {
  matcher: ["/", "/check-email", "/login", "/signup"],
};
