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

Resume file uploads can't be automated by extensions — download your
tailored resume from JobPilot and attach it manually.

## Pointing at production

Update `APP_URL` in `popup.js` and the `host_permissions` entry in
`manifest.json` to your deployed app URL.
