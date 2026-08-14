# JobPilot

Cade Kukk's personal job-search copilot: multi-source job discovery (US +
remote + Estonia), Fable 5 fit analysis and tailored documents via the Cursor
SDK, and an application tracker — all in a monochrome editorial UI matching
[cadekukk.vercel.app](https://cadekukk.vercel.app/).

Single-user by design: no accounts, no login. The app boots straight into
the owner's workspace.

## Features

- **Multi-source job discovery** — every search phrase is run against
  Remotive (remote, keyless), **cv.ee** (Estonia, keyless), **Arbeitnow**
  (EU, keyless), and Adzuna (US on-site, free keys). Deduped, stored, and
  filterable by Remote / Estonia / Past week
- **Fable 5 fit analysis** — the model reads the base résumé and each
  posting, then returns an *absolute* 0–100 fit score, a blunt one-line
  verdict, strengths, and gaps. Cached per job, batch-analyzed on demand
- **Tailoring workspace** — APPLY on a job auto-drafts a tailored résumé +
  cover letter, then lets you iterate: freeform instructions to Fable
  ("rephrase this bullet", "cut that section"), direct manual editing, live
  keyword coverage against the posting, and full version history — strict
  no-fabrication throughout, with print-to-PDF and the company site one
  click away
- **Pilot copilot** — chat grounded in the résumé and (optionally) a specific
  posting: interview prep, gap advice, Estonia relocation strategy
- **Application tracker** — saved → applied → interviewing → offer pipeline
  with activity log, notes, and contacts
- **Chrome extension** — [JobPilot Autofill](extension/README.md) fills
  application forms on Greenhouse, Lever, Workday, Ashby, and more from the
  base résumé
- **Editorial monochrome UI** — bracketed section markers, uppercase mono
  metadata, numbered lists, hairline rules; black on paper, no accent colors

## Stack

| Layer | Tech |
| --- | --- |
| Framework | Next.js (App Router) + TypeScript + Tailwind CSS |
| Database | Postgres + Drizzle ORM (embedded PGlite locally, hosted Postgres via `DATABASE_URL`) |
| AI | Cursor SDK (`@cursor/sdk`) running Anthropic **Fable 5** — fit analysis, tailoring, Pilot |
| Parsing | unpdf for résumé PDF text extraction |
| Job sources | Remotive · cv.ee · Arbeitnow · Adzuna (optional keys) |

## Getting started

```bash
npm install
cp .env.example .env   # then paste your CURSOR_API_KEY
npm run db:push        # create tables (dev database must be running)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the owner user is
created automatically. Add your base résumé at `/onboarding`, set search
phrases on `/profile`, and matches populate on `/jobs`.

No database setup is required locally: `npm run dev` starts an embedded
Postgres (PGlite) behind the Postgres wire protocol on `127.0.0.1:5433`,
persisted to `./.pglite`.

## AI setup (Cursor key + Fable 5)

All generation runs through the **Cursor SDK** with your own Cursor
subscription:

1. Create an API key at [cursor.com/dashboard → Integrations](https://cursor.com/dashboard/integrations)
2. Put it in `.env` as `CURSOR_API_KEY=cursor_...`

The app queries your account's model list at runtime and picks the Fable 5
model automatically (override with `CURSOR_MODEL` if you want a specific ID).
Agent runs count against your Cursor usage.

Without the key the app still works: retrieval and keyword overlap keep
running; fit analysis, tailoring, and Pilot show setup instructions instead.

### Other optional keys (in `.env`)

| Key | Unlocks |
| --- | --- |
| `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` | US on-site/hybrid jobs (free at developer.adzuna.com) |
| `OWNER_NAME` / `OWNER_EMAIL` | Owner identity (defaults to Cade Kukk) |

## How matching works

1. **Retrieval** — each search phrase (Profile page, one per line) is run
   against all sources; results are deduped and stored.
2. **Ranking** — analyzed jobs sort by their absolute Fable 5 fit score;
   unanalyzed ones by keyword overlap with the résumé.
3. **Analysis** — "Run fit analysis" sends the best unanalyzed candidates to
   Fable 5 in batches of 5. Scores are absolute (85+ apply now, <40 skip),
   judged on seniority, hard requirements, and transferable strengths —
   results are cached on the job row forever.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (+ local database) |
| `npm run db:push` | Apply the Drizzle schema to the database |
| `npm run db:seed` | Create the owner user |
| `npm run db:studio` | Browse the database in Drizzle Studio |

## Roadmap

- [x] Application tracker (CRUD, status pipeline, timeline, contacts)
- [x] Base résumé onboarding (PDF upload/parse, LinkedIn paste)
- [x] Multi-source matching engine (Remotive/cv.ee/Arbeitnow/Adzuna + Fable 5 fit analysis)
- [x] Résumé & cover letter tailoring (Cursor SDK, print-to-PDF)
- [x] Pilot copilot, Chrome autofill extension
- [x] Single-user personal build, editorial monochrome redesign
- [ ] Email assistant (draft-only follow-ups, auto status detection)
