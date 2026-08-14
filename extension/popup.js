// JobPilot Autofill popup: syncs the profile from the app and triggers
// autofill on the active tab.
const APP_URL = "http://localhost:3000";

const app = document.getElementById("app");
document.getElementById("open-app").href = APP_URL;

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

function initials(name) {
  return (
    (name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?"
  );
}

function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Send a message to the content script, injecting it first if needed.
async function messageTab(tabId, msg) {
  try {
    return await chrome.tabs.sendMessage(tabId, msg);
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    return chrome.tabs.sendMessage(tabId, msg);
  }
}

// Latest "apply with tailored résumé" handoff, if any (null when stale).
async function fetchActive() {
  try {
    const res = await fetch(`${APP_URL}/api/extension/active`);
    if (!res.ok) return null;
    return (await res.json()).active ?? null;
  } catch {
    return null;
  }
}

async function syncProfile() {
  const res = await fetch(`${APP_URL}/api/extension/profile`, {
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Sync failed (${res.status})`);
  }
  const { profile, syncedAt } = await res.json();
  await chrome.storage.local.set({ profile, syncedAt });
  return { profile, syncedAt };
}

function renderSignedOut(message) {
  app.replaceChildren(
    el(`<div class="card notice">${message}</div>`),
    el(`<button class="secondary" id="retry">Try again</button>`)
  );
  document.getElementById("retry").addEventListener("click", init);
}

function renderReady(profile, syncedAt, fieldCount, active) {
  const filledKeys = Object.values(profile).filter(Boolean).length;
  app.replaceChildren(
    el(`
      <div class="card profile">
        <span class="avatar">${initials(profile.fullName)}</span>
        <div>
          <div class="name">${profile.fullName || "Your profile"}</div>
          <div class="sub">${profile.email || ""}</div>
        </div>
      </div>`),
    ...(active
      ? [
          el(`
            <div class="card tailored">
              <div class="k">[ TAILORED DOCS ARMED ]</div>
              <div class="job">${active.jobTitle} — ${active.company}</div>
              <div class="sub">handed off ${timeAgo(active.handedOffAt)} · autofill uses this résumé + cover letter</div>
            </div>`),
        ]
      : []),
    el(`
      <div class="card status">
        <span class="dot ${fieldCount > 0 ? "on" : ""}"></span>
        <span>${
          fieldCount === null
            ? "Can't scan this page — try a job application page."
            : fieldCount > 0
              ? `<strong>${fieldCount}</strong>&nbsp;fillable field${fieldCount === 1 ? "" : "s"} detected on this page.`
              : "No application fields detected on this page."
        }</span>
      </div>`),
    el(
      `<button class="primary" id="fill" ${fieldCount ? "" : "disabled"}>Autofill this page</button>`
    ),
    el(`<button class="secondary" id="capture">Save this job to JobPilot</button>`),
    el(`<div class="result" id="result"></div>`),
    el(`<button class="secondary" id="sync">Re-sync profile</button>`),
    el(
      `<p class="muted" style="text-align:center">${filledKeys} profile fields · synced ${timeAgo(syncedAt)}</p>`
    )
  );

  document.getElementById("fill").addEventListener("click", async () => {
    const tab = await getActiveTab();
    const result = document.getElementById("result");
    const merged = active
      ? { ...profile, coverLetter: active.coverLetter, resumeText: active.resume }
      : profile;
    try {
      const res = await messageTab(tab.id, { type: "FILL", profile: merged });
      result.textContent =
        res.filled > 0
          ? `Filled ${res.filled} field${res.filled === 1 ? "" : "s"} ✓`
          : "No empty matching fields found.";
    } catch {
      result.textContent = "Couldn't autofill this page.";
    }
  });

  document.getElementById("capture").addEventListener("click", async (e) => {
    const btn = e.target;
    const result = document.getElementById("result");
    btn.textContent = "Reading page…";
    btn.disabled = true;
    try {
      const tab = await getActiveTab();
      const { job } = await messageTab(tab.id, { type: "EXTRACT_JOB" });
      if (!job?.title || !job?.company) {
        throw new Error("Couldn't read a job posting from this page.");
      }
      const res = await fetch(`${APP_URL}/api/extension/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`);
      result.replaceChildren(
        el(
          `<a class="capture-link" href="${APP_URL}/jobs/${data.jobId}" target="_blank" rel="noopener">${
            data.existed ? "Already in JobPilot" : "Saved"
          } — ${job.title.slice(0, 40)} · open →</a>`
        )
      );
      btn.textContent = data.existed ? "Already saved ✓" : "Saved to JobPilot ✓";
    } catch (err) {
      result.textContent = err.message;
      btn.textContent = "Save this job to JobPilot";
      btn.disabled = false;
    }
  });

  document.getElementById("sync").addEventListener("click", async (e) => {
    e.target.textContent = "Syncing…";
    try {
      await syncProfile();
      init();
    } catch (err) {
      renderSignedOut(err.message);
    }
  });
}

async function init() {
  let { profile, syncedAt } = await chrome.storage.local.get([
    "profile",
    "syncedAt",
  ]);

  if (!profile) {
    try {
      ({ profile, syncedAt } = await syncProfile());
    } catch (err) {
      renderSignedOut(
        `${err.message} <br /><br />Make sure JobPilot is running (npm run dev), then reopen this popup.`
      );
      return;
    }
  }

  let fieldCount = null;
  let active = null;
  try {
    const tab = await getActiveTab();
    const [scanRes, activeRes] = await Promise.all([
      tab?.id && /^https?:/.test(tab.url || "")
        ? messageTab(tab.id, { type: "SCAN" }).catch(() => null)
        : null,
      fetchActive(),
    ]);
    fieldCount = scanRes?.count ?? null;
    active = activeRes;
  } catch {
    fieldCount = null;
  }

  renderReady(profile, syncedAt, fieldCount, active);
}

init();
