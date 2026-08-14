// Temp: verify the shadow-DOM-aware scanner against a local fixture that
// replicates SmartRecruiters' structure: multi-layered open shadow roots,
// formcontrolname on wrapper components (not the inputs), labels outside
// the field's own shadow root. Delete after running.
import { readFileSync } from "node:fs";
import puppeteer from "puppeteer";

const contentJs = readFileSync("extension/content.js", "utf8");

const FIXTURE = `<!doctype html><html><body>
<h1>Fixture: SR-style nested shadow DOM apply form</h1>
<div id="app"></div>
<script>
  // Layer 1: the application form component.
  const appHost = document.createElement("sr-application-form");
  document.getElementById("app").appendChild(appHost);
  const appRoot = appHost.attachShadow({ mode: "open" });

  // Field factory: <sr-field formcontrolname=X> → shadow → bare <input>
  // (the input itself carries NO identifying attributes — the wrapper does).
  function field(fcn, tag = "input", type = "text") {
    const host = document.createElement("sr-field");
    host.setAttribute("formcontrolname", fcn);
    const root = host.attachShadow({ mode: "open" });
    const el = document.createElement(tag);
    if (tag === "input") el.type = type;
    root.appendChild(el);
    return host;
  }

  appRoot.appendChild(field("email"));
  appRoot.appendChild(field("firstName"));
  appRoot.appendChild(field("lastName"));
  appRoot.appendChild(field("phoneNumber", "input", "tel"));

  // Layer 2: a section component nesting another shadow level.
  const section = document.createElement("sr-section");
  const sectionRoot = section.attachShadow({ mode: "open" });
  appRoot.appendChild(section);

  // Cover letter: textarea with a label[for] INSIDE the nested shadow root.
  const clWrap = document.createElement("div");
  const clLabel = document.createElement("label");
  clLabel.htmlFor = "cl";
  clLabel.textContent = "Cover letter";
  const cl = document.createElement("textarea");
  cl.id = "cl";
  clWrap.append(clLabel, cl);
  sectionRoot.appendChild(clWrap);

  // LinkedIn: aria-labelledby resolved within the same shadow root.
  const liLabel = document.createElement("span");
  liLabel.id = "li-label";
  liLabel.textContent = "LinkedIn profile";
  const li = document.createElement("input");
  li.type = "text";
  li.setAttribute("aria-labelledby", "li-label");
  sectionRoot.append(liLabel, li);
</script>
</body></html>`;

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setContent(FIXTURE);

await page.evaluate(`
  window.chrome = window.chrome || {};
  chrome.storage = { local: { get: (k, cb) => cb({}) } };
  chrome.runtime = {
    sendMessage: (msg, cb) => cb && cb({ active: null }),
    onMessage: { addListener: () => {} },
    lastError: null,
  };
`);
await page.evaluate(contentJs);
await new Promise((r) => setTimeout(r, 200));

const report = await page.evaluate(() => {
  const count = window.__jobpilotScan();
  const filled = window.__jobpilotFill({
    firstName: "Cade",
    lastName: "Kukk",
    email: "cadekukk@gmail.com",
    phone: "555-123-4567",
    linkedin: "https://linkedin.com/in/cadekukk",
    coverLetter: "TAILORED COVER LETTER",
    resumeText: "TAILORED RESUME",
    summary: "Generic summary",
  });
  const grab = (sel, rootPath) => rootPath.querySelector(sel);
  const appRoot = document.querySelector("sr-application-form").shadowRoot;
  const fields = [...appRoot.querySelectorAll("sr-field")].map((h) => ({
    fcn: h.getAttribute("formcontrolname"),
    value: h.shadowRoot.querySelector("input").value,
  }));
  const sectionRoot = appRoot.querySelector("sr-section").shadowRoot;
  const clValue = sectionRoot.querySelector("textarea").value;
  const liValue = sectionRoot.querySelector('input[aria-labelledby]').value;
  const fab = !!document.querySelector('button[aria-label="Autofill with JobPilot"]');
  return { count, filled, fields, clValue, liValue, fab };
});

console.log("matching fields detected:", report.count);
console.log("fields filled:", report.filled);
console.log("floating button shown:", report.fab);
for (const f of report.fields) console.log(`  ${f.fcn} = ${f.value}`);
console.log(`  cover letter (nested, label[for]) = ${report.clValue}`);
console.log(`  linkedin (nested, aria-labelledby) = ${report.liValue}`);

const pass =
  report.count >= 6 &&
  report.fields.every((f) => f.value) &&
  report.clValue === "TAILORED COVER LETTER" &&
  report.liValue.includes("linkedin.com");
console.log(pass ? "\nPASS" : "\nFAIL");
await browser.close();
process.exit(pass ? 0 : 1);
