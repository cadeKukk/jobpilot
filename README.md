# JobPilot

An AI job-search copilot: track applications, generate tailored resumes and
cover letters, and discover matching jobs with semantic search — with a human
approving every send.

## Features

- **Accounts & onboarding** — email/password auth (Better Auth), then an
  onboarding flow that builds your profile from an uploaded resume PDF,
  pasted text, and/or LinkedIn experience
- **Application tracker** — pipeline from saved → applied → interviewing →
  offer, with an activity timeline, notes, and contacts per application
- **Resume & cover letter tailoring** *(phase 2)* — LLM-generated documents
  tailored to each job description
- **Job matching** — live postings pulled from job APIs (Remotive out of the
  box, Adzuna with free keys), ranked against your resume — semantic
  embedding scores with an OpenAI key, keyword scoring without — and saved
  to the tracker in one click
- **Email assistant** *(phase 4)* — drafts follow-ups and detects status
  changes from recruiter emails, with one-click approval

## Stack

| Layer | Tech |
| --- | --- |
| Framework | Next.js (App Router) + TypeScript + Tailwind CSS |
| Auth | Better Auth (email/password, session cookies) |
| Database | Postgres + Drizzle ORM (embedded PGlite locally, Supabase/Neon in production) |
| Parsing | unpdf for resume PDF text extraction |
| AI | OpenAI (`gpt-5-mini` for generation, `text-embedding-3-small` + pgvector for matching) |

## Getting started

```bash
npm install
cp .env.example .env   # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
npm run db:push        # create tables
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and
follow the onboarding flow. To add sample applications to your account, run
`npm run db:seed` after signing up. No database setup is required locally —
without a `DATABASE_URL`, the app uses an embedded Postgres (PGlite)
persisted to `./.pglite`.

To use a hosted Postgres instead, copy `.env.example` to `.env` and set
`DATABASE_URL`, then re-run `npm run db:push`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run db:push` | Apply the Drizzle schema to the database |
| `npm run db:seed` | Seed sample applications |
| `npm run db:studio` | Browse the database in Drizzle Studio |

## Roadmap

- [x] Phase 1 — Application tracker (CRUD, status pipeline, timeline, contacts)
- [x] Auth & onboarding (accounts, resume upload/parse, LinkedIn import)
- [x] Phase 3 — Job matching engine (Remotive/Adzuna ingestion, embedding or keyword ranking, save-to-tracker)
- [ ] Phase 2 — Resume & cover letter tailoring (OpenAI structured outputs, PDF export)
- [ ] Phase 4 — Email assistant (Gmail API, draft-only replies, auto status detection)
