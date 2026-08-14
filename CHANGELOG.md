# Changelog

All notable changes to JobPilot are documented here.

## Unreleased

### Fixed — Job capture on cv.ee (extension v0.3.1)

- cv.ee publishes JSON-LD `JobPosting` with an **empty description** — the
  extractor now falls back to the visible posting text when the structured
  description is missing or trivially short. Since cv.ee has no `main`/
  `article` landmarks, the fallback climbs up from the `h1` (job title)
  until it finds the posting card, skipping nav/footer chrome. Company
  name also falls back to JSON-LD `identifier.name` (cv.ee's location for
  it). Verified against a live cv.ee posting: clean 3.8k-char description.
- "Cannot destructure property 'job'" popup error fixed: it happened when
  a tab still ran an older injected content script without the capture
  handler. The content script is now version-guarded (a newer injection
  takes over) and the popup shows "refresh the page and try again" instead
  of crashing. cv.ee and Arbeitnow added to auto-inject domains.

### Added — Capture jobs from any page via the extension

- Extension v0.3.0: a **Save this job to JobPilot** button in the popup
  reads the posting from the current page and adds it to the Find Jobs
  feed. Extraction prefers JSON-LD `JobPosting` structured data (title,
  company, location, salary, posted date, full description — most ATS
  pages embed it), falling back to og: meta tags, the page's h1/title
  split, and visible text (shadow-DOM aware).
- New `POST /api/extension/capture` stores the job with source
  "extension", strips description HTML server-side, and dedupes by URL —
  re-saving the same posting returns the existing job.
- After saving, the popup links straight to the job in JobPilot, where the
  usual Fable fit analysis and APPLY → tailoring workspace flow applies.
- Verified end-to-end with headless Chrome running the real content script
  against JSON-LD and fallback-only fixture pages: extraction, capture,
  dedupe, and job-page render all pass.

### Fixed — Autofill on SmartRecruiters (shadow DOM support)

- SmartRecruiters (and other Angular/web-component ATSes) render form
  fields inside multi-layered shadow DOM, invisible to
  `document.querySelectorAll` — so the scanner found 0 fields and neither
  the floating button nor the popup offered autofill.
- The content script now walks every open shadow root recursively, looks
  labels up in the field's own root, reads Angular `formcontrolname` from
  both inputs and their wrapper components (climbing up to 5 shadow
  boundaries), and polls briefly after load since shadow-root mutations
  don't reach the top-level MutationObserver.
- Verified with a headless-Chrome regression test
  (`scripts/test-shadow-fixture.mjs`) replicating SmartRecruiters'
  structure: 6/6 fields detected and filled through two shadow layers.
  (SmartRecruiters serves a DataDome CAPTCHA to automated browsers, so the
  live page can't be tested headlessly — real Chrome sessions are fine.)

### Added — Apply with tailored résumé → Chrome extension handoff

- The tailoring workspace's apply button is now **APPLY WITH TAILORED
  RÉSUMÉ ↗**: it snapshots the current drafts (unsaved edits are saved as
  versions), records the application as the active extension handoff, logs
  it in the activity feed, and opens the real apply link in a new tab.
- New `GET /api/extension/active` returns the handed-off job's latest
  tailored résumé + cover letter; handoffs expire after 12 hours so a stale
  cover letter never lands in the wrong form.
- Extension v0.2.0: a background service worker fetches the handoff (ATS
  pages block localhost from content scripts); autofill then fills
  cover-letter boxes with the tailored cover letter and "paste your résumé"
  boxes with the tailored résumé. The floating button reads
  "Autofill — tailored for {company}" and the popup shows which job is
  armed. With no handoff, everything falls back to the generic profile.
- Schema: `user_preferences.active_application_id` + `active_handoff_at`.

### Added — Keyword maximization at the tailor stage

- Initial tailoring now feeds the posting's extracted keywords into the
  Fable prompt with an explicit rule: work EVERY keyword the candidate can
  honestly claim into the résumé, mirroring the posting's exact
  terminology. Fabrication guardrails unchanged — keywords with no honest
  support in the base résumé are skipped.
- Freeform revisions get the same keyword list and preserve/extend
  coverage unless instructed otherwise.
- Measured on a live posting: coverage rose from 14/24 to 19/24 keywords
  (the 5 skipped had no honest basis, e.g. the employer's own name).

### Changed — Compact, professional PDF output

- On screen the document header shows the title and date (e.g.
  "COVER LETTER — DATA ENGINEER AT PLAYTECH · AUG 14, 2026"); the
  "GENERATED" label is gone. In the printed PDF only the date appears.
- Tighter print typography (11px / 1.35 line height), collapsed extra blank
  lines and trailing whitespace, standard 0.6–0.7in page margins, and no
  app padding on the printed page.

### Added — Tailoring workspace: APPLY → draft → iterate → apply

- **New APPLY flow**: on a job page, APPLY now saves the job to the tracker
  and opens `/applications/[id]/tailor` — the tailoring workspace — where
  Fable 5 auto-drafts a tailored résumé and cover letter before you apply
  on the company site (button stays one click away).
- **Freeform revisions**: an instruction bar sends plain-language edits
  ("emphasize the AI ambassador work", "remove the Wooster section") to
  Fable, which may add, remove, or rephrase — but only from what's really
  in the base résumé. The draft is also directly editable by hand.
- **Live keyword coverage**: the posting's key terms
  (`extractPostingKeywords`) are checked against the current draft as you
  type, with a covered/missing list and progress rule.
- **Version history**: every Fable revision and manual save is stored in
  `generated_documents`; any version can be reloaded into the editor.
  Résumé and cover letter share the workspace as tabs.
- The application page links to the workspace; the job page keeps a ghost
  "VIEW POSTING ↗" link next to the new APPLY button.

### Changed — Dark inversion + universal hover-invert

- **Inverted palette**: the editorial theme is now near-white ink on
  `#0a0a0a` paper across every page, the extension popup, and text
  selection. Generated documents keep a white "paper" card so they read as
  artifacts on the dark UI and print black-on-white.
- **Universal hover treatment**: all interactive text (nav, titles, filter
  chips, ghost links, Pilot suggestions, inline links) now uses one
  `.hover-invert` utility — a full highlight-and-invert, like a text
  selection — replacing the mixed underline/color-shift hovers.
- Fable model resolution now matches `claude-fable-5`-style IDs; verified
  live against the owner's Cursor account.

### Changed — Personal single-user build: Cursor SDK AI, Estonia sources, editorial redesign

- **Single-user mode**: removed Better Auth entirely (login/signup pages,
  sessions/accounts/verifications tables, auth API routes). `getCurrentUser()`
  now returns an auto-created "owner" row (`OWNER_NAME`/`OWNER_EMAIL` env
  overrides). The extension profile API no longer requires a session.
- **Cursor SDK AI layer** (`src/lib/cursor-ai.ts`): all generation — fit
  analysis, résumé/cover-letter tailoring, Pilot chat — now runs one-shot
  local Cursor agents on Anthropic **Fable 5** with `CURSOR_API_KEY`. The
  model ID is resolved from the account's model list at runtime
  (`CURSOR_MODEL` override). Replaced the OpenAI-compatible layer and
  embeddings entirely; `@cursor/sdk` is in `serverExternalPackages`.
- **Matching overhaul**: multi-query retrieval (search phrases editable on
  the Profile page, every source queried with each) across Remotive, **cv.ee
  (Estonia — keyless)**, **Arbeitnow (EU — keyless)**, and Adzuna. New
  **Fable 5 fit analysis**: absolute 0–100 score, one-line verdict,
  strengths, and gaps per job, batch-analyzed (5 per prompt) on demand and
  cached on the job row (`fit_*` columns). Ranking: analyzed jobs by fit
  score, the rest by keyword overlap. New Estonia feed filter.
- **Editorial monochrome redesign** matching cadekukk.vercel.app: bracketed
  section markers (`[ SEC. 01 — JOB MATCHES ]`), uppercase mono metadata
  rows (`LOC — TALLINN · FIT — 84/100`), numbered list entries, hairline
  rules, square corners, black-on-paper palette. Removed match rings,
  company avatars, sidebar/bottom-tab shell (now a single editorial top
  nav), and all emerald/slate accents. Shared primitives in
  `src/components/editorial.tsx`; extension popup restyled to match.
- Seed script now just creates the owner; removed the demo account and the
  `test-matching` script.

### Added — Pilot copilot, match breakdown, insider connections, feed tabs

- **Pilot** (`/pilot`): an Orion-style 24/7 AI career-coach chat grounded
  in the user's resume and preferences. Opened from a job page ("Ask
  Pilot"), the posting is added to context with job-specific suggestion
  chips (fit analysis, interview prep, gap closing, recruiter outreach).
  Uses the provider-agnostic AI layer via a new `chatText` helper;
  degrades gracefully without an AI key.
- **Match breakdown on job pages**: an absolute match ring
  (`scoreSingleJob`), shared skills, and a new "in the posting, not on
  your resume" section (`missingKeywords`) highlighting gaps to address.
- **Insider connections**: each job page links to LinkedIn people
  searches for recruiters, hiring managers, and peers at the company.
- **Jobs feed tabs & filters**: Recommended / In-tracker tabs plus
  remote-only and past-week toggles that preserve the current search.

### Added — JobPilot Autofill Chrome extension

- New Manifest V3 extension in `extension/`: autofills job application
  forms with the user's JobPilot profile (name, email, phone, LinkedIn,
  GitHub, website, location, desired role, resume summary).
- Popup shows the synced profile, the number of fillable fields detected
  on the current page, and an "Autofill this page" action that works on
  any site; known ATS pages (Greenhouse, Lever, Workday, Ashby, Workable,
  SmartRecruiters, and more) get a floating "Autofill with JobPilot"
  button. Filled fields flash green; existing answers are never
  overwritten.
- New app endpoint `GET /api/extension/profile` returns the profile using
  the existing session cookie; phone/LinkedIn/GitHub/website and a summary
  blurb are extracted from the master resume.
- Extension icons are generated programmatically by
  `scripts/make-extension-icons.ts` (no image dependencies).

### Changed — Jobright-style UI redesign

- New app shell: fixed left sidebar navigation on desktop, bottom tab bar
  on mobile (Jobs / Tracker / Profile / Add), with the signed-in user and
  sign-out anchored at the bottom of the sidebar.
- Job matches redesigned as rich cards: company initial avatars, circular
  match-score rings with tier labels (STRONG/GOOD/FAIR/LOW MATCH),
  metadata chips (location, remote, salary, source, posted), and inline
  "Apply now" / Save actions.
- Job detail page: header card with company avatar and a prominent green
  "Apply now" button; "Why you match" skills section.
- Tracker rows now show company avatars; consistent emerald accent across
  all primary buttons, tabs, and focus states.

### Fixed — Job auto-population and local database stability

- The matches page now auto-populates even without a saved search: the
  desired role is inferred from the master resume (e.g. "product designer")
  and remembered as the user's preference.
- Local dev database re-architected: PGlite now runs in a single dedicated
  process behind the Postgres wire protocol (`scripts/db-server.ts`,
  port 5433, multiplexed connections), fixing the corruption and
  "Aborted()" crashes caused by multiple Next.js processes opening the
  data directory directly. `npm run dev` starts both processes; migrations
  and seeds now run any time, no server shutdown required.

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
