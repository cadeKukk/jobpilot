import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const APPLICATION_STATUSES = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const applicationStatus = pgEnum(
  "application_status",
  APPLICATION_STATUSES
);

// Single-user app: one "owner" row, created automatically on first access.
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Phase 2: master resumes uploaded/written by the user, used for tailoring.
export const resumes = pgTable("resumes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isMaster: boolean("is_master").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// What the user is searching for; drives the auto-populated matches page.
export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  desiredRole: text("desired_role"),
  location: text("location"),
  // One search phrase per entry — every provider is queried with each.
  searchQueries: jsonb("search_queries").$type<string[]>(),
  // "Apply with tailored résumé" handoff: the extension autofills with this
  // application's latest tailored documents until the handoff goes stale.
  activeApplicationId: text("active_application_id"),
  activeHandoffAt: timestamp("active_handoff_at", { withTimezone: true }),
  // Default style guide for document output ("classic" | "modern" | ...).
  docStyle: text("doc_style"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Job postings pulled from external APIs (Remotive, Adzuna, Arbeitnow, cv.ee).
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull(), // "remotive" | "adzuna" | "arbeitnow" | "cvee" | "manual"
    externalId: text("external_id"),
    title: text("title").notNull(),
    company: text("company").notNull(),
    location: text("location"),
    url: text("url"),
    description: text("description"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryText: text("salary_text"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    // Fable 5 fit analysis, cached per job (single-user app).
    fitScore: integer("fit_score"),
    fitVerdict: text("fit_verdict"),
    fitStrengths: jsonb("fit_strengths").$type<string[]>(),
    fitGaps: jsonb("fit_gaps").$type<string[]>(),
    fitAnalyzedAt: timestamp("fit_analyzed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("jobs_source_external_id_idx").on(t.source, t.externalId)]
);

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Set when the application came from a matched job posting (phase 3).
  jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
  company: text("company").notNull(),
  jobTitle: text("job_title").notNull(),
  jobUrl: text("job_url"),
  location: text("location"),
  salary: text("salary"),
  jobDescription: text("job_description"),
  status: applicationStatus("status").notNull().default("saved"),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Timeline of everything that happened to an application (status changes, notes).
export const applicationEvents = pgTable("application_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "created" | "status_change" | "note"
  fromStatus: applicationStatus("from_status"),
  toStatus: applicationStatus("to_status"),
  note: text("note"),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role"),
  email: text("email"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Phase 2: LLM-generated tailored resumes and cover letters per application.
export const generatedDocuments = pgTable("generated_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // "resume" | "cover_letter"
  content: text("content").notNull(),
  model: text("model"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Job = typeof jobs.$inferSelect;
export type Resume = typeof resumes.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type ApplicationEvent = typeof applicationEvents.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type User = typeof users.$inferSelect;
