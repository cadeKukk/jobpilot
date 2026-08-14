// JobPilot Autofill content script: detects application-form fields and
// fills them from the synced JobPilot profile. Injected automatically on
// known ATS sites, or on demand from the popup on any other page.
(() => {
  if (window.__jobpilotAutofill) return;
  window.__jobpilotAutofill = true;

  const EMERALD = "#059669";

  // Order matters: more specific rules first. `match` runs against a
  // field's combined label/name/id/placeholder/aria text.
  const RULES = [
    { key: "firstName", match: /first[\s_-]*name|given[\s_-]*name|fname/i },
    {
      key: "lastName",
      match: /last[\s_-]*name|family[\s_-]*name|surname|lname/i,
    },
    { key: "fullName", match: /full[\s_-]*name|legal name|your name|^name\b/i },
    { key: "email", match: /e-?mail/i },
    { key: "phone", match: /phone|mobile|cell/i },
    { key: "linkedin", match: /linked[\s_-]*in/i },
    { key: "github", match: /git[\s_-]*hub/i },
    { key: "website", match: /website|portfolio|personal site|blog|other url/i },
    {
      key: "location",
      match: /location|city|address|where (are you|do you) (based|live)/i,
    },
    {
      key: "title",
      match: /current (title|role|position)|job title|desired (role|position)|headline/i,
    },
    {
      // Filled with the tailored cover letter when a handoff is active,
      // falling back to the generic summary.
      key: "coverLetter",
      textareaOnly: true,
      match: /cover letter|why .{0,40}(join|interested|apply|excited|company|role)/i,
    },
    {
      // "Paste your résumé" boxes get the tailored résumé text.
      key: "resumeText",
      textareaOnly: true,
      match: /(paste|copy|enter|type).{0,24}(resume|résumé|cv)\b|(resume|résumé|cv).{0,10}(text|body)/i,
    },
    {
      key: "summary",
      textareaOnly: true,
      match: /about (you|yourself)|summary|additional information|anything else/i,
    },
  ];

  // Latest "apply with tailored résumé" handoff from the JobPilot app,
  // fetched via the background worker (content scripts can't hit localhost).
  function requestActive() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: "GET_ACTIVE" }, (res) => {
          if (chrome.runtime.lastError) return resolve(null);
          resolve(res?.active ?? null);
        });
      } catch {
        resolve(null);
      }
    });
  }

  function mergeTailored(profile, active) {
    if (!active) return profile;
    return {
      ...profile,
      coverLetter: active.coverLetter || null,
      resumeText: active.resume || null,
    };
  }

  // Walk the document plus every open shadow root (SmartRecruiters and other
  // Angular/web-component ATSes nest form fields several shadow roots deep,
  // where document.querySelectorAll can't see them).
  function collectRoots(root, out) {
    out.push(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node) {
      if (node.shadowRoot) collectRoots(node.shadowRoot, out);
      node = walker.nextNode();
    }
    return out;
  }

  function deepQueryAll(selector) {
    const found = [];
    for (const root of collectRoots(document, [])) {
      found.push(...root.querySelectorAll(selector));
    }
    return found;
  }

  function fieldText(el) {
    const parts = [
      el.name,
      el.id,
      el.placeholder,
      el.getAttribute("aria-label"),
      el.getAttribute("autocomplete"),
      el.getAttribute("formcontrolname"),
      el.getAttribute("data-test"),
    ];
    // Look labels up in the element's own root — inside a shadow tree,
    // document.querySelector can't find them.
    const rootNode = el.getRootNode();
    if (el.id && rootNode.querySelector) {
      const label = rootNode.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (label) parts.push(label.textContent);
    }
    const wrapping = el.closest("label");
    if (wrapping) parts.push(wrapping.textContent);
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy && rootNode.getElementById) {
      labelledBy.split(/\s+/).forEach((id) => {
        const node = rootNode.getElementById(id);
        if (node) parts.push(node.textContent);
      });
    }
    // Climb through shadow boundaries: the custom-element hosts often carry
    // the meaningful attributes (e.g. <sr-input formcontrolname="firstName">).
    let root = rootNode;
    let hops = 0;
    while (root instanceof ShadowRoot && hops < 5) {
      const host = root.host;
      parts.push(
        host.getAttribute("formcontrolname"),
        host.getAttribute("name"),
        host.getAttribute("label"),
        host.getAttribute("aria-label"),
        host.getAttribute("data-test"),
        host.id
      );
      root = host.getRootNode();
      hops++;
    }
    return parts.filter(Boolean).join(" ").slice(0, 300);
  }

  function isFillable(el) {
    if (el.disabled || el.readOnly) return false;
    if (el.type && ["hidden", "file", "checkbox", "radio", "submit", "button", "password"].includes(el.type))
      return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    return true;
  }

  function matchKey(el) {
    const isTextarea = el.tagName === "TEXTAREA";
    // Trust explicit input types / autocomplete first.
    if (!isTextarea) {
      if (el.type === "email") return "email";
      if (el.type === "tel") return "phone";
      const ac = (el.getAttribute("autocomplete") || "").toLowerCase();
      if (ac === "given-name") return "firstName";
      if (ac === "family-name") return "lastName";
      if (ac === "name") return "fullName";
      if (ac === "email") return "email";
      if (ac === "tel") return "phone";
    }
    const text = fieldText(el);
    for (const rule of RULES) {
      if (rule.textareaOnly && !isTextarea) continue;
      if (rule.match.test(text)) return rule.key;
    }
    return null;
  }

  function candidates() {
    return deepQueryAll(
      'input:not([type]), input[type="text"], input[type="email"], input[type="tel"], input[type="url"], textarea'
    ).filter(isFillable);
  }

  // Set the value the way React expects (native setter + input event).
  function setValue(el, value) {
    const proto =
      el.tagName === "TEXTAREA"
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function flash(el) {
    const prev = el.style.boxShadow;
    el.style.boxShadow = `0 0 0 2px ${EMERALD}`;
    el.style.transition = "box-shadow 0.3s";
    setTimeout(() => (el.style.boxShadow = prev), 1600);
  }

  function scan() {
    const seen = new Set();
    for (const el of candidates()) {
      const key = matchKey(el);
      if (key) seen.add(el);
    }
    return seen.size;
  }

  function fill(profile) {
    let filled = 0;
    for (const el of candidates()) {
      if (el.value && el.value.trim()) continue; // never overwrite
      const key = matchKey(el);
      let value = key && profile[key];
      // No tailored cover letter armed → generic summary still works.
      if (key === "coverLetter" && !value) value = profile.summary;
      if (!value) continue;
      setValue(el, value);
      flash(el);
      filled++;
    }
    return filled;
  }

  function toast(message) {
    const node = document.createElement("div");
    node.textContent = message;
    Object.assign(node.style, {
      position: "fixed",
      bottom: "84px",
      right: "20px",
      zIndex: 2147483647,
      background: "#0f172a",
      color: "#fff",
      padding: "10px 16px",
      borderRadius: "12px",
      font: "500 13px system-ui, sans-serif",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      opacity: "0",
      transition: "opacity 0.25s",
    });
    document.body.appendChild(node);
    requestAnimationFrame(() => (node.style.opacity = "1"));
    setTimeout(() => {
      node.style.opacity = "0";
      setTimeout(() => node.remove(), 300);
    }, 3200);
  }

  function fillFromStorage() {
    chrome.storage.local.get("profile", async ({ profile }) => {
      if (!profile) {
        toast("JobPilot: open the extension and sync your profile first.");
        return;
      }
      const active = await requestActive();
      const filled = fill(mergeTailored(profile, active));
      const tailoredNote = active ? ` — tailored for ${active.company}` : "";
      toast(
        filled > 0
          ? `JobPilot filled ${filled} field${filled === 1 ? "" : "s"}${tailoredNote}.`
          : "JobPilot: no empty matching fields found."
      );
    });
  }

  // Floating autofill button (Jobright-style) on pages with a real form.
  let fab = null;
  function ensureFab() {
    const count = scan();
    if (count < 3 || fab) return;
    fab = document.createElement("button");
    fab.type = "button";
    fab.setAttribute("aria-label", "Autofill with JobPilot");
    fab.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
      </svg>
      <span>Autofill with JobPilot</span>`;
    // If a tailored handoff is armed, say so on the button itself.
    requestActive().then((active) => {
      if (active && fab) {
        fab.querySelector("span").textContent = `Autofill — tailored for ${active.company}`;
      }
    });
    Object.assign(fab.style, {
      position: "fixed",
      bottom: "24px",
      right: "20px",
      zIndex: 2147483647,
      display: "flex",
      alignItems: "center",
      gap: "8px",
      background: EMERALD,
      color: "#fff",
      border: "none",
      borderRadius: "999px",
      padding: "12px 18px",
      font: "600 13px system-ui, sans-serif",
      cursor: "pointer",
      boxShadow: "0 8px 24px rgba(5,150,105,0.4)",
    });
    fab.addEventListener("mouseenter", () => (fab.style.background = "#047857"));
    fab.addEventListener("mouseleave", () => (fab.style.background = EMERALD));
    fab.addEventListener("click", fillFromStorage);
    document.body.appendChild(fab);
  }

  // ATS pages are usually SPAs — re-check as the page changes.
  ensureFab();
  let debounce = null;
  new MutationObserver(() => {
    clearTimeout(debounce);
    debounce = setTimeout(ensureFab, 800);
  }).observe(document.body, { childList: true, subtree: true });

  // Mutations inside shadow roots don't reach the observer above — poll for
  // a while after load so late-rendering shadow-DOM forms still get the FAB.
  const rescan = setInterval(() => {
    ensureFab();
    if (fab) clearInterval(rescan);
  }, 1500);
  setTimeout(() => clearInterval(rescan), 45_000);

  // Exposed for headless testing of the scanner.
  window.__jobpilotScan = scan;
  window.__jobpilotFill = fill;

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "SCAN") {
      sendResponse({ count: scan() });
      return false;
    }
    if (msg.type === "FILL") {
      // The popup merges tailored docs in already, but merge here too in
      // case the popup is an older version.
      requestActive().then((active) => {
        sendResponse({ filled: fill(mergeTailored(msg.profile, active)) });
      });
      return true; // async response
    }
    return false;
  });
})();
