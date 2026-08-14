// AI layer backed by the Cursor SDK: every generation runs a one-shot local
// Cursor agent with Anthropic's Fable 5. Set CURSOR_API_KEY in .env
// (Cursor Dashboard → Integrations). The exact model ID is resolved from the
// account's model list at runtime; override with CURSOR_MODEL if needed.
import { Agent, Cursor } from "@cursor/sdk";

export function cursorEnabled(): boolean {
  return !!process.env.CURSOR_API_KEY;
}

function apiKey(): string {
  const key = process.env.CURSOR_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "CURSOR_API_KEY is not set. Create one at cursor.com/dashboard → Integrations and add it to .env."
    );
  }
  return key;
}

let cachedModelId: string | null = null;

export async function resolveFableModel(): Promise<string> {
  const override = process.env.CURSOR_MODEL?.trim();
  if (override) return override;
  if (cachedModelId) return cachedModelId;

  const listed = await Cursor.models.list({ apiKey: apiKey() });
  const models: Array<{ id: string }> = Array.isArray(listed)
    ? listed
    : ((listed as { models?: Array<{ id: string }> }).models ?? []);
  const ids = models.map((m) => m.id);

  // Prefer an exact fable-5 family match, then anything fable.
  const fable =
    ids.find((id) => /^fable-5($|[^0-9])/i.test(id)) ??
    ids.find((id) => /fable/i.test(id));
  if (!fable) {
    throw new Error(
      `No Fable model available on this Cursor account. Models: ${ids.join(", ") || "none"}. Set CURSOR_MODEL in .env to pick one explicitly.`
    );
  }
  cachedModelId = fable;
  return fable;
}

const GUARDRAILS =
  "You are running headless inside a personal job-search app. Do NOT read, create, or modify any files, and do not run any commands or tools. Respond with plain text only, exactly in the format requested.";

// One-shot text generation through a local Cursor agent.
export async function generateText(
  system: string,
  prompt: string
): Promise<string> {
  const model = await resolveFableModel();
  const result = await Agent.prompt(`${GUARDRAILS}\n\n${system}\n\n${prompt}`, {
    apiKey: apiKey(),
    model: { id: model },
    local: { cwd: process.cwd() },
  });
  if (result.status !== "finished" || !result.result) {
    throw new Error(`Cursor agent run ${result.status}: no result text`);
  }
  return result.result.trim();
}

// JSON-shaped generation: the schema is described in the prompt and the
// response parsed (with markdown-fence tolerance).
export async function generateJSON<T>(
  system: string,
  prompt: string,
  schemaDescription: string
): Promise<T> {
  const raw = await generateText(
    system,
    `${prompt}\n\nRespond with ONLY a valid JSON object matching this shape (no markdown fences, no commentary):\n${schemaDescription}`
  );
  const cleaned = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "");
  // Tolerate stray prose around the JSON by extracting the outermost braces.
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`Model did not return JSON: ${cleaned.slice(0, 200)}`);
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

export async function currentModelLabel(): Promise<string> {
  try {
    return await resolveFableModel();
  } catch {
    return "fable-5";
  }
}
