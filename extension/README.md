# JobPilot Autofill — Chrome extension

Autofills job application forms (Greenhouse, Lever, Workday, Ashby, and
more) with your JobPilot profile: name, email, phone, LinkedIn, GitHub,
portfolio, location, desired role, and a summary blurb pulled from your
master resume.

## Install (developer mode)

1. Start the JobPilot app (`npm run dev`) — no sign-in needed, it's a
   single-user app.
2. Open `chrome://extensions`, enable **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Pin "JobPilot Autofill" and click it — your profile syncs automatically
   from the running app.

## How it works

- **Popup** — shows your synced profile, how many fillable fields were
  detected on the current page, and an **Autofill this page** button that
  works on any site.
- **Floating button** — on known ATS job application pages, a green
  "Autofill with JobPilot" button appears in the corner when a form is
  detected; one click fills every empty matching field.
- **Field matching** — labels, names, placeholders, and autocomplete
  attributes are matched against rules for each profile field. Values are
  set with React-compatible events, existing answers are never
  overwritten, and filled fields flash green.
- **Profile source** — `GET /api/extension/profile` in the app returns
  your contact details (phone/LinkedIn/GitHub/website are extracted from
  your master resume) using your existing session cookie.
- **Save this job** — the popup's **Save this job to JobPilot** button
  reads the posting off the current page (JSON-LD `JobPosting` structured
  data first — most ATS pages embed it — falling back to meta tags,
  headings, and visible text) and `POST`s it to `/api/extension/capture`.
  The job lands in the Find Jobs feed (source "extension", deduped by URL)
  with the full analyze → apply → tailor flow available.
- **Tailored handoff** — clicking **APPLY WITH TAILORED RÉSUMÉ** in a
  tailoring workspace snapshots the current drafts, marks that application
  as the active handoff, and opens the apply page. For the next 12 hours,
  autofill uses those exact documents: cover-letter boxes get the tailored
  cover letter, "paste your résumé" boxes get the tailored résumé, the
  floating button reads "Autofill — tailored for {company}", and the popup
  shows which job is armed. The background worker fetches the handoff from
  `GET /api/extension/active` (content scripts can't reach localhost).

Resume file uploads can't be automated by extensions — use **PRINT / PDF**
in the workspace to save the tailored resume and attach it manually.

## Pointing at production

Update `APP_URL` in `popup.js` and `background.js`, and the
`host_permissions` entry in `manifest.json`, to your deployed app URL.
