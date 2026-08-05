# Changelog

All notable changes to JobPilot are documented here.

## Unreleased

### Added — Free AI provider support & job detail pages

- Provider-agnostic AI layer (`AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` /
  `AI_EMBEDDING_MODEL`): works with OpenAI, Google Gemini's free tier
  (recommended for demos — no credit card), Groq, OpenRouter, or local
  Ollama. Structured-output requests fall back gracefully on providers
  without `json_schema` support; embedding dimensions are guarded when
  switching providers.
- Every found job now has its own detail page: full formatted description,
  "at a glance" panel (salary, location, posted date, source), the skills
  it shares with your resume, save-to-tracker, and a link to the original
  posting. Ingested descriptions now preserve paragraphs and bullets.
- Clearer navigation: Dashboard / Find jobs / Profile links with active
  states in the header.

### Added — AI document tailoring (phase 2)

- "Tailor documents" on each application: generates a tailored resume and
  cover letter from the master resume + job description using OpenAI
  (`gpt-5-mini`, structured JSON output). Requires `OPENAI_API_KEY`; the UI
  explains setup when the key is missing.
- Generated documents are stored per application (`generated_documents`),
  with history, copy-to-clipboard, and a print-friendly view for saving
  as PDF.
- Generation is logged to the application's activity timeline.

## 2026-08-03

### Added — Job matching engine (phase 3)

- Find jobs page: live postings ingested from Remotive (no key required)
  and Adzuna (optional free keys), deduplicated into the `jobs` table.
- Match ranking against the master resume: OpenAI embedding similarity when
  `OPENAI_API_KEY` is set, keyword-overlap fallback otherwise.
- One-click "Save" moves a posting into the tracker with its description.
- Onboarding captures desired role + location; the matches page
  auto-populates from remembered preferences.

### Added — Accounts & onboarding

- Email/password auth with Better Auth (sessions, hashed credentials).
- Onboarding: resume PDF upload (unpdf extraction) or paste, optional
  LinkedIn experience import; stored as the user's master resume.
- Profile page for editing the master resume; all data scoped per user.

## 2026-08-02

### Added — Application tracker (phase 1)

- Dashboard with pipeline stats, status filters, and responsive list.
- Application detail: status changes with automatic activity timeline,
  quick notes, contacts, delete.
- Postgres schema via Drizzle ORM; embedded PGlite for zero-setup local
  development, `DATABASE_URL` for hosted Postgres.
