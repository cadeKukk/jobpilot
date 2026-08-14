<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# JobPilot project conventions

## Workflow

- Every completed change or feature gets a git commit with a clear message
  (imperative subject, body explaining the "why"), then push to GitHub.
- Every feature must be documented before committing: update README.md
  (features, stack, env vars, roadmap) and add a CHANGELOG.md entry.
- Never commit `.env` or `.pglite` (local database). `.env.example` documents
  every environment variable with a comment.

## Architecture notes

- Local dev database is embedded PGlite served over the Postgres wire
  protocol on 127.0.0.1:5433 by `scripts/db-server.ts` (started with
  `npm run dev`, or standalone via `npm run db:server`). NEVER open
  `./.pglite` from a second process directly — connect through the socket.
  Production uses Postgres via `DATABASE_URL`.
- Schema lives in `src/db/schema.ts`; apply with `npm run db:push` (the dev
  database must be running). Seeds/scripts can run alongside the dev server.
- Single-user app: there is no auth. `getCurrentUser()` returns the "owner"
  row (auto-created). Server actions in `src/lib/*-actions.ts` still scope
  queries by `user.id`.
- All AI generation goes through `src/lib/cursor-ai.ts` — the Cursor SDK
  (`@cursor/sdk`) running Fable 5 with `CURSOR_API_KEY`. The SDK is listed in
  `serverExternalPackages` in next.config.ts (Turbopack can't bundle it).
  Features must degrade gracefully when `CURSOR_API_KEY` or Adzuna keys are
  missing.
- UI style is editorial monochrome (matching cadekukk.vercel.app): no accent
  colors, square corners, bracketed mono section markers. Shared primitives
  live in `src/components/editorial.tsx` — use them instead of ad-hoc styles.
