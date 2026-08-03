"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  APPLICATION_STATUSES,
  applicationEvents,
  applications,
  contacts,
  type ApplicationStatus,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/user";

function field(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function createApplication(formData: FormData) {
  const user = await getCurrentUser();

  const company = field(formData, "company");
  const jobTitle = field(formData, "jobTitle");
  if (!company || !jobTitle) {
    throw new Error("Company and job title are required");
  }

  const status = (field(formData, "status") ?? "saved") as ApplicationStatus;
  if (!APPLICATION_STATUSES.includes(status)) {
    throw new Error("Invalid status");
  }

  const [app] = await db
    .insert(applications)
    .values({
      userId: user.id,
      company,
      jobTitle,
      jobUrl: field(formData, "jobUrl"),
      location: field(formData, "location"),
      salary: field(formData, "salary"),
      jobDescription: field(formData, "jobDescription"),
      notes: field(formData, "notes"),
      status,
      appliedAt: status === "saved" ? null : new Date(),
    })
    .returning();

  await db.insert(applicationEvents).values({
    applicationId: app.id,
    type: "created",
    note: `Added ${jobTitle} at ${company}`,
  });

  revalidatePath("/");
  redirect(`/applications/${app.id}`);
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
) {
  if (!APPLICATION_STATUSES.includes(status)) {
    throw new Error("Invalid status");
  }

  const user = await getCurrentUser();
  const app = await db.query.applications.findFirst({
    where: and(
      eq(applications.id, applicationId),
      eq(applications.userId, user.id)
    ),
  });
  if (!app) throw new Error("Application not found");
  if (app.status === status) return;

  await db
    .update(applications)
    .set({
      status,
      updatedAt: new Date(),
      // First move out of "saved" marks the application as submitted.
      appliedAt: app.appliedAt ?? (status === "saved" ? null : new Date()),
    })
    .where(eq(applications.id, applicationId));

  await db.insert(applicationEvents).values({
    applicationId,
    type: "status_change",
    fromStatus: app.status,
    toStatus: status,
  });

  revalidatePath("/");
  revalidatePath(`/applications/${applicationId}`);
}

export async function addNote(applicationId: string, formData: FormData) {
  const note = field(formData, "note");
  if (!note) return;

  const user = await getCurrentUser();
  const app = await db.query.applications.findFirst({
    where: and(
      eq(applications.id, applicationId),
      eq(applications.userId, user.id)
    ),
  });
  if (!app) throw new Error("Application not found");

  await db.insert(applicationEvents).values({
    applicationId,
    type: "note",
    note,
  });

  revalidatePath(`/applications/${applicationId}`);
}

export async function addContact(applicationId: string, formData: FormData) {
  const name = field(formData, "name");
  if (!name) return;

  const user = await getCurrentUser();
  const app = await db.query.applications.findFirst({
    where: and(
      eq(applications.id, applicationId),
      eq(applications.userId, user.id)
    ),
  });
  if (!app) throw new Error("Application not found");

  await db.insert(contacts).values({
    applicationId,
    name,
    role: field(formData, "role"),
    email: field(formData, "email"),
  });

  revalidatePath(`/applications/${applicationId}`);
}

export async function deleteApplication(applicationId: string) {
  const user = await getCurrentUser();
  await db
    .delete(applications)
    .where(
      and(eq(applications.id, applicationId), eq(applications.userId, user.id))
    );

  revalidatePath("/");
  redirect("/");
}
