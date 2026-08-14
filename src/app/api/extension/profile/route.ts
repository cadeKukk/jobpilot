import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import { getMasterResume } from "@/lib/resume";
import { getCurrentUser } from "@/lib/user";

// Profile payload for the JobPilot Autofill Chrome extension. Single-user
// app running locally — no auth, the owner profile is returned directly.
export async function GET() {
  const user = await getCurrentUser();
  const [resume, prefs] = await Promise.all([
    getMasterResume(user.id),
    db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, user.id),
    }),
  ]);

  const text = resume?.content ?? "";
  const name = user.name.trim();
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
      email: user.email,
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
