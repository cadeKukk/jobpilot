import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, generatedDocuments, userPreferences } from "@/db/schema";
import { getCurrentUser } from "@/lib/user";

// Handoffs older than this are considered stale — the extension falls back
// to the generic profile so an old cover letter never lands in the wrong form.
const HANDOFF_TTL_MS = 12 * 60 * 60 * 1000;

// Active "apply with tailored résumé" handoff for the Chrome extension:
// the latest tailored résumé + cover letter for the application the user
// just clicked APPLY on in the tailoring workspace.
export async function GET() {
  const user = await getCurrentUser();

  const prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, user.id),
  });

  const fresh =
    prefs?.activeApplicationId &&
    prefs.activeHandoffAt &&
    Date.now() - prefs.activeHandoffAt.getTime() < HANDOFF_TTL_MS;
  if (!fresh) return Response.json({ active: null });

  const app = await db.query.applications.findFirst({
    where: eq(applications.id, prefs!.activeApplicationId!),
  });
  if (!app || app.userId !== user.id) return Response.json({ active: null });

  const docs = await db.query.generatedDocuments.findMany({
    where: eq(generatedDocuments.applicationId, app.id),
    orderBy: [desc(generatedDocuments.createdAt)],
  });

  return Response.json({
    active: {
      applicationId: app.id,
      jobTitle: app.jobTitle,
      company: app.company,
      jobUrl: app.jobUrl,
      resume: docs.find((d) => d.kind === "resume")?.content ?? null,
      coverLetter: docs.find((d) => d.kind === "cover_letter")?.content ?? null,
      handedOffAt: prefs!.activeHandoffAt!.toISOString(),
    },
  });
}
