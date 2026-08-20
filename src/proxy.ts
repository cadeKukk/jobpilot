import { NextResponse, type NextRequest } from "next/server";

// Optional access gate for the public deployment. JobPilot has no login (it's
// a single-user build), but the live site runs real AI actions on the owner's
// Cursor API key — so when SITE_PASSWORD is set, visitors need the key once:
//
//   https://<site>/?key=<SITE_PASSWORD>
//
// That sets a long-lived cookie and redirects to the clean URL, so a shared
// link "just works" for whoever receives it. Unset SITE_PASSWORD to make the
// site fully public. Local dev (no env var) is unaffected.
export function proxy(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();

  if (request.cookies.get("jp_access")?.value === password) {
    return NextResponse.next();
  }

  const supplied = request.nextUrl.searchParams.get("key");
  if (supplied === password) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("key");
    const response = NextResponse.redirect(clean);
    response.cookies.set("jp_access", password, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  }

  return new NextResponse(
    "JOBPILOT — PRIVATE BUILD\n\nThis is a personal deployment. Ask Cade for an access link.",
    { status: 401, headers: { "Content-Type": "text/plain" } }
  );
}

export const config = {
  // Gate everything except Next.js internals and static assets.
  matcher: ["/((?!_next/|favicon\\.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
