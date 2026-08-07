/**
 * Provider-agnostic structured-JSON client.
 *
 * Subtext runs on a free-tier key so that a judge, a teacher, or a teenager can
 * clone the repo and have it working without a billing account. Gemini is the
 * default for that reason alone. The seam exists so the model underneath can be
 * swapped without touching the two engines that matter.
 *
 * Everything here is server-only. The key never reaches the browser.
 */

import "server-only";

export type ProviderName = "gemini" | "anthropic";

export class LlmError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

/** JSON Schema subset we hand to the provider to constrain output. */
export type JsonSchema = Record<string, unknown>;

type GenerateArgs = {
  system: string;
  user: string;
  schema: JsonSchema;
  /** Lower is more deterministic. Decode wants restraint, not flourish. */
  temperature?: number;
};

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/interactions";
const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";

export function activeProvider(): ProviderName {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  throw new LlmError(
    "No model key configured. Set GEMINI_API_KEY (free at aistudio.google.com/apikey) or ANTHROPIC_API_KEY.",
    500,
    false,
  );
}

/**
 * The raw REST response nests generated text under steps[].content[].text.
 * `output_text` is an SDK convenience that does not appear on the wire, so we
 * walk the documented shape and keep the flat key only as a fallback.
 */
function extractGeminiText(payload: unknown): string {
  const root = payload as {
    output_text?: unknown;
    steps?: Array<{ content?: Array<{ type?: string; text?: unknown }> }>;
  };

  const chunks: string[] = [];
  for (const step of root.steps ?? []) {
    for (const part of step.content ?? []) {
      if (typeof part.text === "string") chunks.push(part.text);
    }
  }
  if (chunks.length > 0) return chunks.join("");
  if (typeof root.output_text === "string") return root.output_text;

  throw new LlmError("Model returned no text content.", 502, true);
}

function extractAnthropicText(payload: unknown): string {
  const root = payload as { content?: Array<{ type?: string; text?: unknown }> };
  const chunks = (root.content ?? [])
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text as string);
  if (chunks.length === 0) {
    throw new LlmError("Model returned no text content.", 502, true);
  }
  return chunks.join("");
}

/** Models sometimes wrap JSON in prose or a fenced block. Recover what we can. */
function parseJsonLoosely<T>(raw: string): T {
  const trimmed = raw.trim();
  const candidates = [trimmed];

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // try the next recovery strategy
    }
  }
  throw new LlmError("Model did not return valid JSON.", 502, true);
}

async function callGemini(args: GenerateArgs, signal: AbortSignal): Promise<string> {
  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    signal,
    headers: {
      "x-goog-api-key": process.env.GEMINI_API_KEY as string,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL,
      input: `${args.system}\n\n---\n\n${args.user}`,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: args.schema,
      },
      generation_config: { temperature: args.temperature ?? 0.4 },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new LlmError(
      `Gemini request failed (${response.status}). ${detail.slice(0, 300)}`,
      response.status,
      response.status === 429 || response.status >= 500,
    );
  }
  return extractGeminiText(await response.json());
}

async function callAnthropic(args: GenerateArgs, signal: AbortSignal): Promise<string> {
  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    signal,
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL,
      max_tokens: 2048,
      temperature: args.temperature ?? 0.4,
      system: `${args.system}\n\nReply with JSON matching this schema and nothing else:\n${JSON.stringify(args.schema)}`,
      messages: [{ role: "user", content: args.user }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new LlmError(
      `Anthropic request failed (${response.status}). ${detail.slice(0, 300)}`,
      response.status,
      response.status === 429 || response.status >= 500,
    );
  }
  return extractAnthropicText(await response.json());
}

/**
 * Generate a structured object, retrying once on a retryable failure.
 * Callers validate the shape themselves; this guarantees only valid JSON.
 */
export async function generateStructured<T>(args: GenerateArgs): Promise<T> {
  const provider = activeProvider();
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const raw =
        provider === "gemini"
          ? await callGemini(args, controller.signal)
          : await callAnthropic(args, controller.signal);
      return parseJsonLoosely<T>(raw);
    } catch (error) {
      lastError = error;
      const retryable = error instanceof LlmError ? error.retryable : false;
      if (!retryable || attempt === 1) break;
      await new Promise((resolve) => setTimeout(resolve, 600));
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError instanceof LlmError) throw lastError;
  throw new LlmError(
    lastError instanceof Error ? lastError.message : "Model call failed.",
    502,
    false,
  );
}
