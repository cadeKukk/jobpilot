import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { applications, generatedDocuments } from "@/db/schema";
import { getCurrentUser } from "@/lib/user";

// Headless Chrome can take a while to boot on a cold serverless invocation.
export const maxDuration = 60;

// Locally, full Puppeteer ships its own Chrome. On Vercel there's no system
// browser, so puppeteer-core runs @sparticuz/chromium-min, which downloads
// a serverless Chromium pack into /tmp on cold start (cached across warm
// invocations). The pack version must match the installed package version.
const CHROMIUM_PACK =
  "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar";

async function launchBrowser() {
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium-min")).default;
    const { launch } = await import("puppeteer-core");
    return launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(CHROMIUM_PACK),
      headless: true,
    });
  }
  const { launch } = await import("puppeteer");
  return launch({ headless: true });
}

// One-click PDF download. Headless Chrome renders the same /documents/[id]
// page in print media, so the file is pixel-identical to the on-screen
// preview. Margins here must match @page in globals.css.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  const doc = await db.query.generatedDocuments.findFirst({
    where: eq(generatedDocuments.id, id),
  });
  if (!doc) notFound();
  const app = await db.query.applications.findFirst({
    where: and(
      eq(applications.id, doc.applicationId),
      eq(applications.userId, user.id)
    ),
  });
  if (!app) notFound();

  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const style = requestUrl.searchParams.get("style");
  const pageUrl = `${origin}/documents/${id}${style ? `?style=${encodeURIComponent(style)}` : ""}`;

  const browser = await launchBrowser();
  let pdf: Uint8Array;
  try {
    const page = await browser.newPage();
    // If the site is behind the SITE_PASSWORD gate, let headless Chrome in.
    if (process.env.SITE_PASSWORD) {
      await browser.setCookie({
        name: "jp_access",
        value: process.env.SITE_PASSWORD,
        domain: requestUrl.hostname,
        path: "/",
      });
    }
    await page.goto(pageUrl, {
      waitUntil: "networkidle0",
      timeout: 30_000,
    });
    // Wait for the one-page auto-fit to settle so the PDF gets the final size.
    await page
      .waitForSelector('[data-fitted="true"]', { timeout: 5_000 })
      .catch(() => {});
    pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      margin: { top: "0.6in", bottom: "0.6in", left: "0.7in", right: "0.7in" },
    });
  } finally {
    await browser.close();
  }

  const kindLabel = doc.kind === "resume" ? "Resume" : "Cover Letter";
  // ASCII-safe filename (Content-Disposition), e.g.
  // "Cade Kukk - Resume - Playtech Estonia OU.pdf"
  const filename = `${user.name} - ${kindLabel} - ${app.company}`
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
    },
  });
}
