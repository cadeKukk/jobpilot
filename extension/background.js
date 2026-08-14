// JobPilot Autofill service worker: fetches from the local app on behalf of
// content scripts (which can't reach localhost cross-origin from ATS pages —
// host_permissions only apply here and in the popup).
const APP_URL = "http://localhost:3000";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_ACTIVE") {
    fetch(`${APP_URL}/api/extension/active`)
      .then((res) => (res.ok ? res.json() : { active: null }))
      .then((data) => sendResponse({ active: data.active ?? null }))
      .catch(() => sendResponse({ active: null }));
    return true; // keep the channel open for the async response
  }
  return false;
});
