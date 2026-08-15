"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import { isDocStyle } from "@/components/document-render";
import { getCurrentUser } from "@/lib/user";

// Remember the chosen document style guide as the default for all future
// previews and PDF downloads.
export async function saveDocStyle(style: string): Promise<void> {
  if (!isDocStyle(style)) return;
  const user = await getCurrentUser();
  await db
    .insert(userPreferences)
    .values({ userId: user.id, docStyle: style })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { docStyle: style, updatedAt: new Date() },
    });
  revalidatePath("/documents", "layout");
}
