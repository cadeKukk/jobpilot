import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getMasterResume } from "@/lib/resume";

// Profile payload for the JobPilot Autofill Chrome extension. The extension
// fetches this with the user's session cookie (it has host permission for
// the app, so the request is treated as same-site).
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return Response.json(
      { error: "Not signed in. Open JobPilot and sign in first." },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const [resume, prefs] = await Promise.all([
    getMasterResume(userId),
    db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    }),
  ]);

  const text = resume?.content ?? "";
  const name = session.user.name?.trim() ?? "";
  const nameParts = name.split(/\s+/).filter(Boolean);

  const linkedin = text.match(/linkedin\.com\/in\/[\w%-]+/i)?.[0] ?? null;
  const github = text.match(/github\.com\/[\w-]+/i)?.[0] ?? null;
  const phone =
    text.match(/(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0] ??
    null;
  // First standalone URL that isn't LinkedIn/GitHub — likely a portfolio.
  const website =
    text
      .match(/https?:\/\/[^\s)]+/gi)
      ?.find((u) => !/linkedin\.com|github\.com/i.test(u)) ?? null;

  // A short blurb for "about you" / summary boxes: the first substantial
  // paragraph of the resume.
  const summary =
    text
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .find((p) => p.length > 80)
      ?.slice(0, 600) ?? null;

  return Response.json({
    profile: {
      fullName: name || null,
      firstName: nameParts[0] ?? null,
      lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : null,
      email: session.user.email,
      phone,
      linkedin: linkedin ? `https://${linkedin.replace(/^https?:\/\//, "")}` : null,
      github: github ? `https://${github.replace(/^https?:\/\//, "")}` : null,
      website,
      location: prefs?.location ?? null,
      title: prefs?.desiredRole ?? null,
      summary,
    },
    syncedAt: new Date().toISOString(),
  });
}
