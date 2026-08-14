import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import puppeteer from "puppeteer";
import { db } from "@/db";
import { applications, generatedDocuments } from "@/db/schema";
import { getCurrentUser } from "@/lib/user";

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

  const origin = new URL(request.url).origin;
  const browser = await puppeteer.launch({ headless: true });
  let pdf: Uint8Array;
  try {
    const page = await browser.newPage();
    await page.goto(`${origin}/documents/${id}`, {
      waitUntil: "networkidle0",
      timeout: 30_000,
    });
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
