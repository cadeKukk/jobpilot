import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { resumes } from "@/db/schema";

export async function getMasterResume(userId: string) {
  return db.query.resumes.findFirst({
    where: and(eq(resumes.userId, userId), eq(resumes.isMaster, true)),
  });
}
