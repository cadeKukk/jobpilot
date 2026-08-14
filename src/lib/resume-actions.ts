"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { extractText } from "unpdf";
import { db } from "@/db";
import { resumes, userPreferences } from "@/db/schema";
import { getCurrentUser } from "@/lib/user";

async function extractPdfText(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { text } = await extractText(bytes, { mergePages: true });
  return text.trim();
}

export async function saveMasterResume(formData: FormData) {
  const user = await getCurrentUser();

  const file = formData.get("resumeFile");
  const pastedText = formData.get("resumeText");
  const linkedinText = formData.get("linkedinText");

  let resumeText = "";
  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf") {
      throw new Error("Please upload a PDF file");
    }
    resumeText = await extractPdfText(file);
  } else if (typeof pastedText === "string") {
    resumeText = pastedText.trim();
  }

  const linkedin =
    typeof linkedinText === "string" ? linkedinText.trim() : "";

  if (!resumeText && !linkedin) {
    throw new Error("Add a resume file, resume text, or LinkedIn experience");
  }

  const sections = [resumeText];
  if (linkedin) {
    sections.push(`--- LinkedIn profile (imported) ---\n${linkedin}`);
  }

  // Keep a single master resume per user; older ones stay for history.
  await db
    .update(resumes)
    .set({ isMaster: false })
    .where(and(eq(resumes.userId, user.id), eq(resumes.isMaster, true)));

  await db.insert(resumes).values({
    userId: user.id,
    title: "Master resume",
    content: sections.filter(Boolean).join("\n\n"),
    isMaster: true,
  });

  const desiredRole = formData.get("desiredRole");
  const location = formData.get("location");
  if (typeof desiredRole === "string" && desiredRole.trim()) {
    const role = desiredRole.trim();
    // Seed the multi-query search list; refine it later on the Profile page.
    const queries = [...new Set([role, "software engineer", "AI engineer"])];
    await db
      .insert(userPreferences)
      .values({
        userId: user.id,
        desiredRole: role,
        location: typeof location === "string" ? location.trim() || null : null,
        searchQueries: queries,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          desiredRole: role,
          location:
            typeof location === "string" ? location.trim() || null : null,
          searchQueries: queries,
          updatedAt: new Date(),
        },
      });
  }

  revalidatePath("/");
  revalidatePath("/profile");
  redirect("/jobs");
}

export async function updateMasterResume(formData: FormData) {
  const user = await getCurrentUser();
  const content = formData.get("content");
  if (typeof content !== "string" || !content.trim()) return;

  const master = await db.query.resumes.findFirst({
    where: and(eq(resumes.userId, user.id), eq(resumes.isMaster, true)),
  });
  if (!master) return;

  await db
    .update(resumes)
    .set({ content: content.trim() })
    .where(eq(resumes.id, master.id));

  revalidatePath("/profile");
}
