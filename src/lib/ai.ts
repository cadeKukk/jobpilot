// Provider-agnostic AI client. Works with any OpenAI-compatible API:
//   - OpenAI (default): https://api.openai.com/v1
//   - Google Gemini (free tier): https://generativelanguage.googleapis.com/v1beta/openai
//   - Groq, OpenRouter, local Ollama, etc.
// Configure via AI_BASE_URL, AI_API_KEY, AI_MODEL, AI_EMBEDDING_MODEL.

export type AIConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  embeddingModel: string;
};

export function getAIConfig(): AIConfig | null {
  const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const baseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1")
    .trim()
    .replace(/\/+$/, "");
  const isGemini = baseUrl.includes("generativelanguage.googleapis.com");

  return {
    baseUrl,
    apiKey,
    model:
      process.env.AI_MODEL ?? (isGemini ? "gemini-2.5-flash" : "gpt-5-mini"),
    embeddingModel:
      process.env.AI_EMBEDDING_MODEL ??
      (isGemini ? "gemini-embedding-001" : "text-embedding-3-small"),
  };
}

type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
};

async function chatRequest(
  config: AIConfig,
  body: Record<string, unknown>
): Promise<Response> {
  return fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
}

function extractJson(content: string): unknown {
  // Some providers wrap JSON in markdown fences despite JSON mode.
  const cleaned = content
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "");
  return JSON.parse(cleaned);
}

// Chat completion returning validated JSON. Tries strict json_schema first;
// providers that don't support it (some free tiers) get json_object mode
// with the schema described in the prompt.
export async function chatJSON<T>(
  config: AIConfig,
  {
    system,
    user,
    schema,
  }: { system: string; user: string; schema: JsonSchema }
): Promise<T> {
  const messages = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  let res = await chatRequest(config, {
    model: config.model,
    messages,
    response_format: {
      type: "json_schema",
      json_schema: { name: schema.name, strict: true, schema: schema.schema },
    },
  });

  if (res.status === 400) {
    // Fall back to plain JSON mode with the schema spelled out in the prompt.
    res = await chatRequest(config, {
      model: config.model,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `${user}\n\nRespond with ONLY a JSON object matching this schema (no markdown, no extra keys):\n${JSON.stringify(schema.schema)}`,
        },
      ],
      response_format: { type: "json_object" },
    });
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return extractJson(data.choices[0].message.content) as T;
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

// Plain conversational completion (used by the Pilot copilot chat).
export async function chatText(
  config: AIConfig,
  messages: ChatMessage[]
): Promise<string> {
  const res = await chatRequest(config, { model: config.model, messages });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0].message.content.trim();
}

export async function embedTexts(
  config: AIConfig,
  texts: string[]
): Promise<number[][]> {
  const res = await fetch(`${config.baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.embeddingModel,
      input: texts.map((t) => t.slice(0, 8_000)),
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Embeddings request failed (${res.status}): ${body.slice(0, 300)}`
    );
  }
  const data = (await res.json()) as {
    data: Array<{ index: number; embedding: number[] }>;
  };
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}
